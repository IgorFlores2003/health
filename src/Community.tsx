import { useCallback, useEffect, useState } from "react";
import {
  RiChat3Line,
  RiDeleteBin6Line,
  RiFlagLine,
  RiHeart3Fill,
  RiHeart3Line,
  RiImageAddLine,
  RiShareLine,
  RiUserAddLine,
} from "react-icons/ri";
import { confirmDialog } from "./confirm";
import { Avatar, PhotoStrip, uploadPhoto } from "./photos";
import PhotoEditor from "./PhotoEditor";
import {
  acceptFriend,
  addComment,
  createPost,
  deleteComment,
  deletePost,
  findByCode,
  loadFeed,
  loadNetwork,
  removeFriend,
  report,
  requestFriend,
  setLike,
  type Friendship,
  type Post,
  type SocialProfile,
} from "./social";
import { PageTitle, Panel } from "./ui";
import OtterCard from "./Otter";
import type { DayGoals } from "./gamification";

/** Compartilha fora do app (WhatsApp etc.) ou copia o texto. */
export async function shareText(text: string) {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ text });
  } else if (navigator.share) await navigator.share({ text });
  else {
    await navigator.clipboard.writeText(text);
    return "copied";
  }
  return "shared";
}

const ago = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

/** Aba Amigos: código de amigo, pedidos, publicar e o feed dos amigos. */
export default function Community({
  userId,
  draft,
  onDraftUsed,
  onNotice,
  shareActivity,
  onShareActivity,
  myGoals,
  ensureProfile,
}: {
  userId: string;
  /** Cria/atualiza o perfil social com os dados do perfil do app. */
  ensureProfile: () => Promise<void>;
  /** Metas da pessoa nos últimos 7 dias (para a lontra da dupla). */
  myGoals: DayGoals[];
  /** Publicar sozinho exercícios e medalhas para os amigos. */
  shareActivity: boolean;
  onShareActivity: (on: boolean) => void;
  /** Texto vindo de "Compartilhar" numa medalha. */
  draft: string;
  onDraftUsed: () => void;
  onNotice: (text: string) => void;
}) {
  const [me, setMe] = useState<SocialProfile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [people, setPeople] = useState<SocialProfile[]>([]);
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [first, posts] = await Promise.all([
        loadNetwork(userId),
        loadFeed(),
      ]);
      let net = first;
      // Sem perfil (ex.: o app abriu antes da migração): cria agora.
      if (!net.me) {
        await ensureProfile();
        net = await loadNetwork(userId);
      }
      setMe(net.me);
      setFriendships(net.friendships);
      setPeople(net.people);
      setFeed(posts);
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, onNotice]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Executa e recarrega; devolve se deu certo (o erro vira aviso). */
  const run = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      if (done) onNotice(done);
      await refresh();
      return true;
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Não foi possível concluir.");
      return false;
    }
  };
  const person = (id: string) =>
    id === userId ? me : people.find((p) => p.user_id === id);
  const friends = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee === userId,
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester === userId,
  );
  const other = (f: Friendship) =>
    f.requester === userId ? f.addressee : f.requester;

  return (
    <>
      <PageTitle
        title="Amigos"
        text="Compartilhe conquistas só com quem você adicionar."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <OtterCard
            userId={userId}
            myGoals={myGoals}
            friends={friends.map((f) => ({
              id: other(f),
              person: person(other(f)),
            }))}
            onNotice={onNotice}
          />
          <Composer
            userId={userId}
            draft={draft}
            onDraftUsed={onDraftUsed}
            onPost={(text, photo) =>
              run(() => createPost(text, photo), "Publicado para seus amigos.")
            }
            onNotice={onNotice}
          />
          {loading ? (
            <p className="py-10 text-center text-sm text-ink-500">
              Carregando…
            </p>
          ) : !feed.length ? (
            <Panel>
              <p className="py-6 text-center text-sm text-ink-500">
                {friends.length
                  ? "Ainda não há posts. Que tal compartilhar uma conquista?"
                  : "Adicione amigos pelo código para ver os posts deles aqui."}
              </p>
            </Panel>
          ) : (
            feed.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                userId={userId}
                person={person}
                onLike={(on) => run(() => setLike(p.id, userId, on))}
                onComment={(text) => run(() => addComment(p.id, text))}
                onDeleteComment={(id) => run(() => deleteComment(id))}
                onDelete={() => run(() => deletePost(p.id), "Post apagado.")}
                onReport={(target, reason) =>
                  run(
                    () => report(target, reason),
                    "Denúncia enviada. Obrigado por avisar.",
                  )
                }
                onShare={() =>
                  shareText(`${p.text}\n\nCompartilhado do Ritmo`).catch(
                    () => undefined,
                  )
                }
              />
            ))
          )}
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Panel>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-brand-600"
                checked={shareActivity}
                onChange={(e) => onShareActivity(e.target.checked)}
              />
              <span>
                <strong className="block font-medium">
                  Mostrar minhas atividades aos amigos
                </strong>
                <span className="text-[13px] text-ink-500">
                  Exercícios registrados e medalhas novas aparecem no feed dos
                  seus amigos. Peso, pressão e alimentação nunca são publicados
                  sozinhos.
                </span>
              </span>
            </label>
          </Panel>
          <AddFriend
            code={me?.friend_code}
            onNotice={onNotice}
            onAdd={(id) =>
              run(() => requestFriend(userId, id), "Pedido de amizade enviado.")
            }
          />
          {incoming.length > 0 && (
            <Panel>
              <h2 className="text-base font-semibold">Pedidos recebidos</h2>
              <ul className="mt-2 divide-y divide-line">
                {incoming.map((f) => (
                  <PersonRow key={f.id} person={person(other(f))}>
                    <button
                      className="btn-primary min-h-9 px-3 text-sm"
                      onClick={() =>
                        run(() => acceptFriend(f.id), "Agora vocês são amigos!")
                      }
                    >
                      Aceitar
                    </button>
                    <button
                      className="btn-ghost text-sm"
                      onClick={() => run(() => removeFriend(f.id))}
                    >
                      Recusar
                    </button>
                  </PersonRow>
                ))}
              </ul>
            </Panel>
          )}
          <Panel>
            <h2 className="text-base font-semibold">
              Amigos{friends.length ? ` · ${friends.length}` : ""}
            </h2>
            {!friends.length && !outgoing.length ? (
              <p className="py-4 text-sm text-ink-500">
                Você ainda não adicionou ninguém.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {[...friends, ...outgoing].map((f) => (
                  <PersonRow
                    key={f.id}
                    person={person(other(f))}
                    detail={
                      f.status === "pending"
                        ? "Pedido enviado"
                        : (([p]) =>
                            p
                              ? `Nível ${p.level ?? 1} · ${p.medals ?? 0} medalha${p.medals === 1 ? "" : "s"}`
                              : undefined)([person(other(f))])
                    }
                  >
                    <button
                      className="btn-ghost text-sm text-ink-500"
                      onClick={async () => {
                        if (
                          await confirmDialog({
                            title:
                              f.status === "pending"
                                ? "Cancelar pedido?"
                                : "Desfazer amizade?",
                            message:
                              f.status === "pending"
                                ? undefined
                                : "Vocês deixam de ver os posts um do outro.",
                            confirmLabel:
                              f.status === "pending"
                                ? "Cancelar pedido"
                                : "Desfazer",
                            danger: true,
                          })
                        )
                          void run(() => removeFriend(f.id));
                      }}
                    >
                      {f.status === "pending" ? "Cancelar" : "Remover"}
                    </button>
                  </PersonRow>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function PersonRow({
  person,
  detail,
  children,
}: {
  person: SocialProfile | null | undefined;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar path={person?.photo ?? undefined} name={person?.name ?? "?"} />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-medium">
          {person?.name ?? "Pessoa"}
        </strong>
        {detail && <small className="text-[13px] text-ink-500">{detail}</small>}
      </span>
      <span className="flex shrink-0 gap-1">{children}</span>
    </li>
  );
}

function AddFriend({
  code,
  onAdd,
  onNotice,
}: {
  code?: string;
  onAdd: (userId: string) => void;
  onNotice: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [found, setFound] = useState<SocialProfile | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Panel>
      <h2 className="text-base font-semibold">Adicionar amigos</h2>
      {code && (
        <div className="mt-3 rounded-lg bg-surface p-3">
          <p className="text-[13px] text-ink-500">Seu código de amigo</p>
          <p className="mt-0.5 font-mono text-xl font-semibold tracking-widest">
            {code}
          </p>
          <button
            className="btn-ghost -ml-2 mt-1 text-sm"
            onClick={() =>
              shareText(
                `Me adicione no Ritmo para a gente se motivar! Meu código de amigo: ${code}`,
              )
                .then((r) => r === "copied" && onNotice("Convite copiado."))
                .catch(() => undefined)
            }
          >
            <RiShareLine className="size-4" /> Enviar convite
          </button>
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const p = await findByCode(value);
            setFound(p);
            if (!p) onNotice("Nenhuma pessoa com esse código.");
          } catch (err) {
            onNotice(err instanceof Error ? err.message : "Falha na busca.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          className="input font-mono uppercase"
          aria-label="Código de amigo"
          placeholder="Código do amigo"
          maxLength={8}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^0-9a-f]/gi, "").toUpperCase());
            setFound(null);
          }}
        />
        <button
          className="btn-secondary shrink-0"
          disabled={busy || value.length < 8}
        >
          Buscar
        </button>
      </form>
      {found && (
        <ul className="mt-2">
          <PersonRow person={found}>
            <button
              className="btn-primary min-h-9 px-3 text-sm"
              onClick={() => {
                onAdd(found.user_id);
                setFound(null);
                setValue("");
              }}
            >
              <RiUserAddLine className="size-4" /> Adicionar
            </button>
          </PersonRow>
        </ul>
      )}
    </Panel>
  );
}

function Composer({
  userId,
  draft,
  onDraftUsed,
  onPost,
  onNotice,
}: {
  userId: string;
  draft: string;
  onDraftUsed: () => void;
  onPost: (text: string, photo: string | null) => Promise<boolean>;
  onNotice: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [editing, setEditing] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!draft) return;
    setText(draft);
    onDraftUsed();
  }, [draft, onDraftUsed]);
  useEffect(() => {
    if (!photo) return setPreview("");
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  return (
    <Panel>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() && !photo) return;
          setBusy(true);
          try {
            const path = photo
              ? await uploadPhoto(userId, "posts", photo)
              : null;
            // Só limpa o que foi escrito se a publicação deu certo.
            if (await onPost(text, path)) {
              setText("");
              setPhoto(null);
            }
          } catch (err) {
            onNotice(err instanceof Error ? err.message : "Falha ao publicar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea
          className="input min-h-20 py-2.5"
          placeholder="Conte uma conquista para seus amigos…"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {preview && (
          <div className="relative mt-3 inline-block">
            <img src={preview} alt="" className="max-h-48 rounded-lg" />
            <button
              type="button"
              className="btn-secondary absolute top-2 right-2 min-h-8 px-2 text-xs"
              onClick={() => setPhoto(null)}
            >
              Remover
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <label className="btn-ghost relative">
            <RiImageAddLine className="size-5" /> Foto
            <input
              className="absolute inset-0 cursor-pointer opacity-0"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) setEditing(f);
              }}
            />
          </label>
          <button
            className="btn-primary"
            disabled={busy || (!text.trim() && !photo)}
          >
            {busy ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </form>
      {editing && (
        <PhotoEditor
          source={editing}
          onClose={() => setEditing(null)}
          onSave={(file) => {
            setPhoto(file);
            setEditing(null);
          }}
        />
      )}
    </Panel>
  );
}

function PostCard({
  post,
  userId,
  person,
  onLike,
  onComment,
  onDeleteComment,
  onDelete,
  onReport,
  onShare,
}: {
  post: Post;
  userId: string;
  person: (id: string) => SocialProfile | null | undefined;
  onLike: (on: boolean) => void;
  onComment: (text: string) => void;
  onDeleteComment: (id: string) => void;
  onDelete: () => void;
  onReport: (
    target: { post_id?: string; comment_id?: string },
    reason: string,
  ) => void;
  onShare: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const author = person(post.author);
  const liked = post.likes.includes(userId);
  const mine = post.author === userId;
  const askReport = async (target: {
    post_id?: string;
    comment_id?: string;
  }) => {
    if (
      await confirmDialog({
        title: "Denunciar conteúdo?",
        message:
          "A denúncia vai para a equipe do Ritmo revisar. Você também pode desfazer a amizade.",
        confirmLabel: "Denunciar",
        danger: true,
      })
    )
      onReport(target, "Conteúdo impróprio");
  };
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <Avatar path={author?.photo ?? undefined} name={author?.name ?? "?"} />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-semibold">
            {author?.name ?? "Amigo"}
          </strong>
          <small className="text-[13px] text-ink-500">
            {ago(post.created_at)}
            {post.kind === "medal" && " · conquista"}
            {post.kind === "activity" && " · atividade"}
          </small>
        </span>
        <button
          className="icon-btn"
          aria-label={mine ? "Apagar post" : "Denunciar post"}
          onClick={async () =>
            mine
              ? (await confirmDialog({
                  title: "Apagar post?",
                  confirmLabel: "Apagar",
                  danger: true,
                })) && onDelete()
              : askReport({ post_id: post.id })
          }
        >
          {mine ? (
            <RiDeleteBin6Line className="size-[18px]" />
          ) : (
            <RiFlagLine className="size-[18px]" />
          )}
        </button>
      </div>
      {post.text && (
        <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>
      )}
      {post.photo && (
        <div className="mt-3 [&_img]:size-auto [&_img]:max-h-96 [&_img]:w-full [&_img]:object-contain">
          <PhotoStrip paths={[post.photo]} />
        </div>
      )}
      <div className="mt-3 flex gap-1 border-t border-line pt-2">
        <button
          className={`btn-ghost text-sm ${liked ? "" : "text-ink-500"}`}
          aria-pressed={liked}
          onClick={() => onLike(!liked)}
        >
          {liked ? (
            <RiHeart3Fill className="size-5" />
          ) : (
            <RiHeart3Line className="size-5" />
          )}
          {post.likes.length || ""}
        </button>
        <button
          className="btn-ghost text-sm text-ink-500"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <RiChat3Line className="size-5" />
          {post.comments.length || ""}
        </button>
        <button className="btn-ghost text-sm text-ink-500" onClick={onShare}>
          <RiShareLine className="size-5" /> Compartilhar
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          {post.comments.map((c) => {
            const who = person(c.author);
            const canDelete = c.author === userId || mine;
            return (
              <div
                key={c.id}
                className="flex items-start gap-2 rounded-lg bg-surface p-2.5"
              >
                <span className="min-w-0 flex-1 text-sm">
                  <strong className="font-medium">
                    {who?.name ?? `Amigo(a) de ${author?.name ?? "alguém"}`}
                  </strong>{" "}
                  {c.text}
                  <small className="block text-xs text-ink-400">
                    {ago(c.created_at)}
                  </small>
                </span>
                <button
                  className="icon-btn size-8"
                  aria-label={
                    canDelete ? "Apagar comentário" : "Denunciar comentário"
                  }
                  onClick={() =>
                    canDelete
                      ? onDeleteComment(c.id)
                      : askReport({ comment_id: c.id })
                  }
                >
                  {canDelete ? (
                    <RiDeleteBin6Line className="size-4" />
                  ) : (
                    <RiFlagLine className="size-4" />
                  )}
                </button>
              </div>
            );
          })}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              onComment(comment);
              setComment("");
            }}
          >
            <input
              className="input"
              placeholder="Escreva um comentário"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              className="btn-secondary shrink-0"
              disabled={!comment.trim()}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </Panel>
  );
}
