import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  setLike,
  type Comment,
  type CommentExtra,
  type Post,
} from "./social";

/**
 * Fila do Social feita no aparelho: curtir, comentar, publicar e apagar
 * funcionam sem internet e são enviados, na ordem, quando a rede volta. O
 * que foi criado offline tem id provisório ("tmp-…"), trocado pelo id do
 * servidor assim que sobe (o mapa fica salvo junto, caso o app feche no meio).
 */
export type Op = (
  | { type: "like"; post: string; on: boolean }
  | {
      type: "comment";
      tmp: string;
      post: string;
      text: string;
      extra: CommentExtra;
    }
  | { type: "deleteComment"; id: string }
  | { type: "post"; tmp: string; text: string; photo: string | null }
  | { type: "deletePost"; id: string }
) & { key?: string; tries?: number };

type Box = { ops: Op[]; ids: Record<string, string> };
const KEY = (userId: string) => `ritmo-outbox-${userId}`;
/** Erro que não é de rede (ex.: o post foi apagado): desiste depois disso. */
const MAX_TRIES = 3;

function read(userId: string): Box {
  try {
    const box = JSON.parse(localStorage.getItem(KEY(userId)) || "null");
    if (box && Array.isArray(box.ops)) return box;
  } catch {
    /* fila vazia */
  }
  return { ops: [], ids: {} };
}
function write(userId: string, box: Box) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(box));
  } catch {
    /* sem espaço: a ação fica só na tela até recarregar */
  }
}

export const isTmp = (id: string) => id.startsWith("tmp-");
export const tmpId = () => `tmp-${crypto.randomUUID()}`;

/** Põe na fila. Apagar algo que ainda nem subiu só tira da fila. */
export function enqueue(userId: string, op: Op) {
  const box = read(userId);
  const created = (id: string) =>
    box.ops.some((o) => "tmp" in o && o.tmp === id);
  if (
    (op.type === "deleteComment" || op.type === "deletePost") &&
    created(op.id)
  ) {
    box.ops = box.ops.filter(
      (o) =>
        !("tmp" in o && o.tmp === op.id) &&
        !(
          o.type === "comment" &&
          (o.post === op.id || o.extra.parent === op.id)
        ) &&
        !(o.type === "like" && o.post === op.id),
    );
  } else box.ops.push({ ...op, key: crypto.randomUUID() });
  write(userId, box);
}

let flushing: Promise<unknown> = Promise.resolve();

/**
 * Envia a fila na ordem. Para no primeiro erro de rede (tenta de novo
 * depois). Devolve quantas ações foram descartadas por erro do servidor.
 * onSaved recebe o comentário/post salvo no lugar do provisório. Uma rodada
 * por vez; a fila é relida a cada passo (ações novas podem entrar no meio).
 */
export function flushOutbox(
  userId: string,
  onSaved?: (tmp: string, saved: Comment | Post) => void,
) {
  const run = flushing.then(async () => {
    let dropped = 0;
    for (;;) {
      const op = read(userId).ops[0];
      if (!op || !navigator.onLine) break;
      const ids = read(userId).ids;
      const id = (x: string) => ids[x] ?? x;
      /** Tira a ação da fila (e grava o id do servidor, se houver). */
      const finish = (tmp?: string, saved?: string) => {
        const box = read(userId);
        box.ops = box.ops.filter((o) => o.key !== op.key);
        if (tmp && saved) box.ids[tmp] = saved;
        // Guarda só os últimos ids (algo na tela ainda pode usar o provisório).
        box.ids = Object.fromEntries(Object.entries(box.ids).slice(-100));
        write(userId, box);
      };
      try {
        if (op.type === "like") await setLike(id(op.post), userId, op.on);
        else if (op.type === "comment") {
          const saved = await addComment(id(op.post), op.text, {
            ...op.extra,
            parent: op.extra.parent ? id(op.extra.parent) : null,
          });
          finish(op.tmp, saved.id);
          onSaved?.(op.tmp, saved);
          continue;
        } else if (op.type === "post") {
          const saved = await createPost(op.text, op.photo);
          finish(op.tmp, saved.id);
          onSaved?.(op.tmp, saved);
          continue;
        } else if (op.type === "deleteComment") await deleteComment(id(op.id));
        else await deletePost(id(op.id));
        finish();
      } catch {
        if (!navigator.onLine) break;
        const box = read(userId);
        const queued = box.ops.find((o) => o.key === op.key);
        if (!queued) continue;
        queued.tries = (queued.tries ?? 0) + 1;
        write(userId, box);
        if (queued.tries < MAX_TRIES) break;
        finish();
        dropped += 1;
      }
    }
    return dropped;
  });
  flushing = run.catch(() => undefined);
  return run;
}
