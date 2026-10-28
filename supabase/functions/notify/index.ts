import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Envia o push (Firebase Cloud Messaging) para os celulares dos amigos,
 * mesmo com o app fechado: puxão de orelha, pedido de ajuda, comentário,
 * resposta, curtida e post novo. Só quem fez a ação pode pedir o envio, e
 * cada uma é enviada uma única vez (nudges.pushed e a tabela push_sent).
 *
 * Secret necessário: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço).
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const b64url = (data: ArrayBuffer | string) =>
  btoa(
    typeof data === "string"
      ? data
      : String.fromCharCode(...new Uint8Array(data)),
  )
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

/** Token OAuth do Google a partir da conta de serviço (JWT assinado RS256). */
async function googleToken(sa: ServiceAccount) {
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const der = Uint8Array.from(
    atob(sa.private_key.replace(/-----[^-]+-----|\s/g, "")),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw Error("Falha no token do Google");
  return json.access_token as string;
}

type Push = {
  recipients: string[];
  title: string;
  body: string;
  /** Tipo: escolhe o ícone (res/drawable/ic_stat_*.xml) e a tela ao tocar. */
  kind: string;
  post?: string;
};
const COLORS: Record<string, string> = {
  nudge: "#F97316",
  help: "#DC2626",
  comment: "#2563EB",
  reply: "#0EA5E9",
  like: "#E11D48",
  post: "#4F46E5",
};
const recent = () => new Date(Date.now() - 5 * 60_000).toISOString();
const short = (text: string) =>
  text.length > 80 ? text.slice(0, 80) + "…" : text;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: "Método inválido" }, 405);
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!jwt) return response({ error: "Não autorizado" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: auth } = await anon.auth.getUser(jwt);
  if (!auth.user) return response({ error: "Não autorizado" }, 401);
  const me = auth.user.id;
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return response({ error: "Push não configurado" }, 503);

  try {
    const input = await req.json();
    const id = [input.nudge, input.comment, input.post, input.like].find(
      (x) => typeof x === "string",
    );
    if (!id || !/^[0-9a-f-]{36}$/.test(id))
      return response({ error: "Pedido inválido" }, 400);
    // Chave de serviço: lê os endereços dos amigos (que a pessoa não vê).
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: who } = await admin
      .from("social_profiles")
      .select("name")
      .eq("user_id", me)
      .maybeSingle();
    const name = who?.name ?? "Um amigo";
    /** Marca como enviado; false se já foi (outra chamada chegou antes). */
    const once = async (key: string) =>
      !(await admin.from("push_sent").insert({ key })).error;

    let push: Push | null = null;
    if (input.nudge) {
      // Marca como enviado só se o puxão é desta pessoa, recente e não enviado.
      const { data: sent } = await admin
        .from("nudges")
        .update({ pushed: true })
        .eq("id", id)
        .eq("sender", me)
        .eq("pushed", false)
        .gte("created_at", recent())
        .select("*")
        .maybeSingle();
      if (sent) {
        const help = sent.kind === "help";
        push = {
          recipients: [sent.recipient],
          title: help ? `${name} pediu sua ajuda!` : `${name} puxou sua orelha`,
          body: sent.message,
          kind: help ? "help" : "nudge",
        };
      }
    } else if (input.comment) {
      const { data: c } = await admin
        .from("comments")
        .select("id, post_id, parent_id, text, gif")
        .eq("id", id)
        .eq("author", me)
        .gte("created_at", recent())
        .maybeSingle();
      if (c && (await once(`comment:${c.id}`))) {
        const [{ data: post }, { data: parent }] = await Promise.all([
          admin.from("posts").select("author").eq("id", c.post_id).single(),
          c.parent_id
            ? admin
                .from("comments")
                .select("author")
                .eq("id", c.parent_id)
                .single()
            : Promise.resolve({ data: null }),
        ]);
        const body = c.text ? short(c.text) : "Enviou um GIF";
        // Quem teve o comentário respondido recebe "respondeu"; o dono do
        // post, "comentou" (uma notificação por pessoa).
        const replyTo = parent?.author !== me ? parent?.author : undefined;
        if (replyTo) {
          await sendAll(admin, raw, {
            recipients: [replyTo],
            title: `${name} respondeu seu comentário`,
            body,
            kind: "reply",
            post: c.post_id,
          });
        }
        if (post && post.author !== me && post.author !== replyTo)
          push = {
            recipients: [post.author],
            title: `${name} comentou no seu post`,
            body,
            kind: "comment",
            post: c.post_id,
          };
      }
    } else if (input.like) {
      const [{ data: like }, { data: post }] = await Promise.all([
        admin
          .from("likes")
          .select("post_id")
          .eq("post_id", id)
          .eq("user_id", me)
          .maybeSingle(),
        admin.from("posts").select("author, text").eq("id", id).maybeSingle(),
      ]);
      if (
        like &&
        post &&
        post.author !== me &&
        (await once(`like:${id}:${me}`))
      )
        push = {
          recipients: [post.author],
          title: `${name} curtiu seu post`,
          body: post.text ? short(post.text) : "Sua foto",
          kind: "like",
          post: id,
        };
    } else if (input.post) {
      // Só posts escritos e medalhas (exercícios automáticos não avisam).
      const { data: post } = await admin
        .from("posts")
        .select("id, text, kind")
        .eq("id", id)
        .eq("author", me)
        .in("kind", ["post", "medal"])
        .gte("created_at", recent())
        .maybeSingle();
      if (post && (await once(`post:${post.id}`))) {
        const { data: friends } = await admin
          .from("friendships")
          .select("requester, addressee")
          .eq("status", "accepted")
          .or(`requester.eq.${me},addressee.eq.${me}`);
        push = {
          recipients: (friends ?? []).map((f) =>
            f.requester === me ? f.addressee : f.requester,
          ),
          title:
            post.kind === "medal"
              ? `${name} ganhou uma medalha`
              : `${name} publicou`,
          body: post.text ? short(post.text) : "Uma foto nova",
          kind: "post",
          post: post.id,
        };
      }
    }
    if (!push) return response({ sent: 0 });
    return response({ sent: await sendAll(admin, raw, push) });
  } catch {
    return response({ error: "Falha ao enviar o push" }, 500);
  }
});

/** Envia para todos os aparelhos das pessoas; devolve quantos receberam. */
async function sendAll(
  admin: ReturnType<typeof createClient>,
  raw: string,
  push: Push,
) {
  if (!push.recipients.length) return 0;
  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token")
    .in("user_id", push.recipients);
  if (!tokens?.length) return 0;
  const sa = JSON.parse(raw) as ServiceAccount;
  const access = await googleToken(sa);
  let count = 0;
  for (const { token } of tokens as { token: string }[]) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: push.title, body: push.body },
            // Lido pelo app ao tocar na notificação, para abrir a tela certa.
            data: {
              kind: push.kind,
              ...(push.post ? { post: push.post } : {}),
            },
            android: {
              priority: "HIGH",
              notification: {
                icon: `ic_stat_${push.kind}`,
                color: COLORS[push.kind],
              },
            },
          },
        }),
      },
    );
    if (res.ok) count += 1;
    // Aparelho desinstalou o app ou trocou de endereço: apaga.
    else if (res.status === 404 || res.status === 400)
      await admin.from("push_tokens").delete().eq("token", token);
  }
  return count;
}
