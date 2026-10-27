import { supabase } from "./supabase";

/**
 * Rede social só entre amigos (supabase/migrations/…_social.sql). As regras
 * de quem vê o quê ficam no banco (RLS); aqui só ficam as consultas.
 */
export type SocialProfile = {
  user_id: string;
  name: string;
  photo: string | null;
  level?: number;
  medals?: number;
  friend_code?: string;
};
export type Friendship = {
  id: number;
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
};
export type Comment = {
  id: string;
  post_id: string;
  author: string;
  text: string;
  created_at: string;
};
export type Post = {
  id: string;
  author: string;
  text: string;
  photo: string | null;
  kind: "post" | "medal" | "activity";
  created_at: string;
  likes: string[];
  comments: Comment[];
};

function db() {
  if (!supabase) throw Error("Conecte-se para usar a comunidade.");
  return supabase;
}
function check<T>({ data, error }: { data: T; error: unknown }) {
  if (error) throw Error("Não foi possível falar com a comunidade agora.");
  return data;
}

/** Cria/atualiza o perfil social: nome, foto, nível e medalhas. */
export async function saveProfile(
  userId: string,
  p: { name: string; photo?: string; level: number; medals: number },
) {
  check(
    await db()
      .from("social_profiles")
      .upsert(
        {
          user_id: userId,
          name: p.name.trim() || "Sem nome",
          photo: p.photo ?? null,
          level: p.level,
          medals: p.medals,
        },
        { onConflict: "user_id" },
      ),
  );
}

export async function loadNetwork(userId: string) {
  const me = check(
    await db()
      .from("social_profiles")
      .select("user_id, name, photo, level, medals, friend_code")
      .eq("user_id", userId)
      .maybeSingle(),
  ) as SocialProfile | null;
  const friendships = (check(
    await db().from("friendships").select("id, requester, addressee, status"),
  ) ?? []) as Friendship[];
  const others = friendships.map((f) =>
    f.requester === userId ? f.addressee : f.requester,
  );
  const people = others.length
    ? ((check(
        await db()
          .from("social_profiles")
          .select("user_id, name, photo, level, medals")
          .in("user_id", others),
      ) ?? []) as SocialProfile[])
    : [];
  return { me, friendships, people };
}

export async function findByCode(code: string) {
  const rows = check(await db().rpc("find_by_friend_code", { code })) as
    SocialProfile[] | null;
  return rows?.[0] ?? null;
}

export async function requestFriend(userId: string, other: string) {
  check(
    await db()
      .from("friendships")
      .insert({ requester: userId, addressee: other }),
  );
}
export async function acceptFriend(id: number) {
  check(
    await db().from("friendships").update({ status: "accepted" }).eq("id", id),
  );
}
export async function removeFriend(id: number) {
  check(await db().from("friendships").delete().eq("id", id));
}

/** Últimos posts visíveis (seus e dos amigos), com curtidas e comentários. */
export async function loadFeed(): Promise<Post[]> {
  const posts = (check(
    await db()
      .from("posts")
      .select("id, author, text, photo, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ) ?? []) as Omit<Post, "likes" | "comments">[];
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);
  const [likes, comments] = await Promise.all([
    db().from("likes").select("post_id, user_id").in("post_id", ids),
    db()
      .from("comments")
      .select("id, post_id, author, text, created_at")
      .in("post_id", ids)
      .order("created_at"),
  ]);
  const l = (check(likes) ?? []) as { post_id: string; user_id: string }[];
  const c = (check(comments) ?? []) as Comment[];
  return posts.map((p) => ({
    ...p,
    likes: l.filter((x) => x.post_id === p.id).map((x) => x.user_id),
    comments: c.filter((x) => x.post_id === p.id),
  }));
}

export async function createPost(
  text: string,
  photo: string | null,
  kind: Post["kind"] = "post",
) {
  check(await db().from("posts").insert({ text: text.trim(), photo, kind }));
}

/** UUID fixo a partir de um texto (o mesmo texto gera sempre o mesmo id). */
async function stableId(text: string) {
  const h = [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  ]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Post automático (exercício ou medalha). O id vem do registro, então se
 * dois aparelhos tentarem publicar o mesmo, o banco ignora o repetido.
 */
export async function autoPost(
  key: string,
  text: string,
  kind: "medal" | "activity",
) {
  check(
    await db()
      .from("posts")
      .upsert(
        { id: await stableId(key), text, kind },
        { onConflict: "id", ignoreDuplicates: true },
      ),
  );
}
export async function deletePost(id: string) {
  check(await db().from("posts").delete().eq("id", id));
}
export async function addComment(postId: string, text: string) {
  check(
    await db().from("comments").insert({ post_id: postId, text: text.trim() }),
  );
}
export async function deleteComment(id: string) {
  check(await db().from("comments").delete().eq("id", id));
}
export async function setLike(postId: string, userId: string, on: boolean) {
  check(
    on
      ? await db().from("likes").insert({ post_id: postId })
      : await db()
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId),
  );
}
export async function report(
  target: { post_id?: string; comment_id?: string },
  reason: string,
) {
  check(
    await db()
      .from("reports")
      .insert({ ...target, reason }),
  );
}
