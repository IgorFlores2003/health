import { supabase } from "./supabase";

/**
 * Aba de notificações: reúne o que os amigos fizeram com a pessoa (puxões,
 * pedidos, comentários, curtidas, lontra). Tudo vem das tabelas da
 * comunidade, com as mesmas regras de acesso; nada novo é guardado.
 */
export type Notice = {
  id: string;
  kind:
    | "nudge"
    | "help"
    | "friend_request"
    | "friend_accepted"
    | "comment"
    | "like"
    | "otter_invite"
    | "otter_helper";
  from: string;
  at: string;
  text: string;
  /** Aba para onde a notificação leva. */
  tab: "community";
};

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

export async function loadNotifications(userId: string): Promise<Notice[]> {
  if (!supabase) return [];
  const db = supabase;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: myPosts } = await db
    .from("posts")
    .select("id, text")
    .eq("author", userId)
    .gte("created_at", since);
  const postIds = (myPosts ?? []).map((p) => p.id as string);
  const postText = (id: string) => {
    const t = (myPosts ?? []).find((p) => p.id === id)?.text as string;
    return t ? `"${t.length > 40 ? t.slice(0, 40) + "…" : t}"` : "sua foto";
  };
  const [nudges, friends, comments, likes, otter, helpers] = await Promise.all([
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
          .select("id, post_id, author, text, created_at")
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
  ]);
  const out: (Omit<Notice, "text"> & { make: (name: string) => string })[] = [];
  for (const n of nudges.data ?? [])
    out.push({
      id: `nudge:${n.id}`,
      kind: n.kind === "help" ? "help" : "nudge",
      from: n.sender,
      at: n.created_at,
      tab: "community",
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
        tab: "community",
        make: (name) => `${name} quer ser seu amigo.`,
      });
    if (f.status === "accepted" && f.requester === userId && f.accepted_at)
      out.push({
        id: `accepted:${f.id}`,
        kind: "friend_accepted",
        from: f.addressee,
        at: f.accepted_at,
        tab: "community",
        make: (name) => `${name} aceitou seu pedido de amizade.`,
      });
  }
  for (const c of comments.data ?? [])
    out.push({
      id: `comment:${c.id}`,
      kind: "comment",
      from: c.author,
      at: c.created_at,
      tab: "community",
      make: (name) => `${name} comentou em ${postText(c.post_id)}: ${c.text}`,
    });
  for (const l of likes.data ?? [])
    out.push({
      id: `like:${l.post_id}:${l.user_id}`,
      kind: "like",
      from: l.user_id,
      at: l.created_at,
      tab: "community",
      make: (name) => `${name} curtiu ${postText(l.post_id)}.`,
    });
  for (const o of otter.data ?? [])
    out.push({
      id: `otter:${o.user_id}`,
      kind: "otter_invite",
      from: o.user_id,
      at: "",
      tab: "community",
      make: (name) => `${name} quer cuidar da lontra com você.`,
    });
  for (const h of helpers.data ?? [])
    out.push({
      id: `helper:${h.helper}`,
      kind: "otter_helper",
      from: h.helper,
      at: h.created_at,
      tab: "community",
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
  return out
    .map(({ make, ...n }) => ({ ...n, text: make(name(n.from)) }))
    .sort((a, b) => (b.at || "9").localeCompare(a.at || "9"));
}
