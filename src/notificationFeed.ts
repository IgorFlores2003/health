import { postText } from "./social";
import { supabase } from "./supabase";

/**
 * Aba de notificações: reúne o que os amigos fizeram com a pessoa (puxões,
 * pedidos, posts, comentários, respostas, curtidas, lontra). Tudo vem das
 * tabelas da comunidade, com as mesmas regras de acesso; nada novo é guardado.
 */
export type Notice = {
  id: string;
  kind:
    | "nudge"
    | "help"
    | "friend_request"
    | "friend_accepted"
    | "post"
    | "comment"
    | "reply"
    | "like"
    | "otter_invite"
    | "otter_helper";
  from: string;
  at: string;
  text: string;
  /** Post a abrir no feed (curtida, comentário, resposta, post novo). */
  post?: string;
};

/** Tela que uma notificação abre: aba, seção do Social e o post. */
export type Target = {
  tab: string;
  section?: "friends" | "otter";
  post?: string;
};

/**
 * Para onde leva cada tipo de notificação, venha da aba Notificações, de
 * uma notificação local (reminders.ts) ou de um push (functions/notify).
 */
export function targetFor(kind: string | undefined, post?: string): Target {
  switch (kind) {
    case "post":
    case "comment":
    case "reply":
    case "like":
      return { tab: "community", section: "friends", post };
    case "nudge":
    case "help":
    case "friend":
    case "friend_request":
    case "friend_accepted":
      return { tab: "community", section: "friends" };
    case "otter_invite":
    case "otter_helper":
      return { tab: "community", section: "otter" };
    case "medal":
    case "level":
    case "pet":
      return { tab: "profile" };
    case "water":
    case "mission":
    case "goal":
      return { tab: "overview" };
    default:
      return { tab: "notifications" };
  }
}

const SEEN_KEY = (userId: string) => `ritmo-notifications-seen-${userId}`;

export function lastSeen(userId: string) {
  try {
    return localStorage.getItem(SEEN_KEY(userId)) ?? "";
  } catch {
    return "";
  }
}
export function markAllSeen(userId: string) {
  try {
    localStorage.setItem(SEEN_KEY(userId), new Date().toISOString());
  } catch {
    /* só neste aparelho */
  }
}

const CACHE_KEY = (userId: string) => `ritmo-notifications-cache-${userId}`;

/** Última lista carregada (para mostrar sem internet). */
export function cachedNotifications(userId: string): Notice[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY(userId)) || "[]");
  } catch {
    return [];
  }
}

/** Falha (ex.: sem internet) em vez de devolver uma lista vazia. */
export async function loadNotifications(userId: string): Promise<Notice[]> {
  if (!supabase) return [];
  const db = supabase;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: myPosts, error } = await db
    .from("posts")
    .select("id, text, kind")
    .eq("author", userId)
    .gte("created_at", since);
  if (error) throw Error("Não foi possível carregar as notificações.");
  const postIds = (myPosts ?? []).map((p) => p.id as string);
  const postLabel = (id: string) => {
    const p = (myPosts ?? []).find((x) => x.id === id);
    const t = p && postText(p);
    return t ? `"${t.length > 40 ? t.slice(0, 40) + "…" : t}"` : "sua foto";
  };
  const [nudges, friends, comments, likes, otter, helpers, posts, mine] =
    await Promise.all([
      db
        .from("nudges")
        .select("*")
        .eq("recipient", userId)
        .gte("created_at", since),
      db
        .from("friendships")
        .select("id, requester, addressee, status, created_at, accepted_at"),
      postIds.length
        ? db
            .from("comments")
            .select(
              "id, post_id, parent_id, author, text, gif, photo, sticker, created_at",
            )
            .in("post_id", postIds)
            .neq("author", userId)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? db
            .from("likes")
            .select("post_id, user_id, created_at")
            .in("post_id", postIds)
            .neq("user_id", userId)
        : Promise.resolve({ data: [] }),
      db
        .from("otter_settings")
        .select("user_id, mode, buddy")
        .eq("buddy", userId)
        .eq("mode", "buddy"),
      db.from("otter_helpers").select("helper, created_at").eq("owner", userId),
      // Posts novos dos amigos (o banco só devolve os de amigos).
      db
        .from("posts")
        .select("id, author, text, kind, created_at")
        .neq("author", userId)
        .in("kind", ["post", "medal"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      // Meus comentários, para achar as respostas a eles.
      db
        .from("comments")
        .select("id, post_id")
        .eq("author", userId)
        .gte("created_at", since),
    ]);
  const myComments = (mine.data ?? []).map((c) => c.id as string);
  const { data: replies } = myComments.length
    ? await db
        .from("comments")
        .select("id, post_id, author, text, gif, photo, sticker, created_at")
        .in("parent_id", myComments)
        .neq("author", userId)
    : { data: [] };
  const out: (Omit<Notice, "text"> & { make: (name: string) => string })[] = [];
  for (const n of nudges.data ?? [])
    out.push({
      id: `nudge:${n.id}`,
      kind: n.kind === "help" ? "help" : "nudge",
      from: n.sender,
      at: n.created_at,
      make: (name) =>
        n.kind === "help"
          ? `${name} pediu sua ajuda: ${n.message}`
          : `${name} puxou sua orelha: ${n.message}`,
    });
  for (const f of friends.data ?? []) {
    if (f.status === "pending" && f.addressee === userId)
      out.push({
        id: `request:${f.id}`,
        kind: "friend_request",
        from: f.requester,
        at: f.created_at,
        make: (name) => `${name} quer ser seu amigo.`,
      });
    if (f.status === "accepted" && f.requester === userId && f.accepted_at)
      out.push({
        id: `accepted:${f.id}`,
        kind: "friend_accepted",
        from: f.addressee,
        at: f.accepted_at,
        make: (name) => `${name} aceitou seu pedido de amizade.`,
      });
  }
  /** O que foi dito: o texto, ou o tipo de anexo quando não há texto. */
  const said = (c: { text: string; photo?: string; sticker?: string }) =>
    c.text
      ? `: ${c.text}`
      : c.photo
        ? " com uma foto."
        : c.sticker
          ? " com uma reação."
          : " com um GIF.";
  for (const p of posts.data ?? [])
    out.push({
      id: `post:${p.id}`,
      kind: "post",
      from: p.author,
      at: p.created_at,
      post: p.id,
      make: (name) => {
        const t = postText(p);
        return p.kind === "medal"
          ? `${name} ganhou uma medalha: ${t}`
          : t
            ? `${name} publicou: ${t.length > 60 ? t.slice(0, 60) + "…" : t}`
            : `${name} publicou uma foto.`;
      },
    });
  // Resposta a um comentário meu num post meu conta só como resposta.
  const replied = new Set((replies ?? []).map((r) => r.id as string));
  for (const r of replies ?? [])
    out.push({
      id: `reply:${r.id}`,
      kind: "reply",
      from: r.author,
      at: r.created_at,
      post: r.post_id,
      make: (name) => `${name} respondeu seu comentário${said(r)}`,
    });
  for (const c of comments.data ?? [])
    if (!replied.has(c.id))
      out.push({
        id: `comment:${c.id}`,
        kind: "comment",
        from: c.author,
        at: c.created_at,
        post: c.post_id,
        make: (name) => `${name} comentou em ${postLabel(c.post_id)}${said(c)}`,
      });
  for (const l of likes.data ?? [])
    out.push({
      id: `like:${l.post_id}:${l.user_id}`,
      kind: "like",
      from: l.user_id,
      at: l.created_at,
      post: l.post_id,
      make: (name) => `${name} curtiu ${postLabel(l.post_id)}.`,
    });
  for (const o of otter.data ?? [])
    out.push({
      id: `otter:${o.user_id}`,
      kind: "otter_invite",
      from: o.user_id,
      at: "",
      make: (name) => `${name} quer cuidar da lontra com você.`,
    });
  for (const h of helpers.data ?? [])
    out.push({
      id: `helper:${h.helper}`,
      kind: "otter_helper",
      from: h.helper,
      at: h.created_at,
      make: (name) => `${name} entrou para ajudar a sua lontra.`,
    });
  const ids = [...new Set(out.map((n) => n.from))];
  const { data: people } = ids.length
    ? await db
        .from("social_profiles")
        .select("user_id, name")
        .in("user_id", ids)
    : { data: [] };
  const name = (id: string) =>
    (people ?? []).find((p) => p.user_id === id)?.name ?? "Um amigo";
  const list = out
    .map(({ make, ...n }) => ({ ...n, text: make(name(n.from)) }))
    .sort((a, b) => (b.at || "9").localeCompare(a.at || "9"));
  try {
    localStorage.setItem(CACHE_KEY(userId), JSON.stringify(list.slice(0, 100)));
  } catch {
    /* só não fica guardada para usar sem internet */
  }
  return list;
}
