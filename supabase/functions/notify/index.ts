import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Envia o push (Firebase Cloud Messaging) de um puxão de orelha para os
 * celulares do amigo, mesmo com o app fechado. Só quem mandou o puxão pode
 * pedir o envio, e cada puxão é enviado uma única vez.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: "Método inválido" }, 405);
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!jwt) return response({ error: "Não autorizado" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: auth } = await anon.auth.getUser(jwt);
  if (!auth.user) return response({ error: "Não autorizado" }, 401);
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return response({ error: "Push não configurado" }, 503);

  try {
    const { nudge } = await req.json();
    if (typeof nudge !== "string" || !/^[0-9a-f-]{36}$/.test(nudge))
      return response({ error: "Pedido inválido" }, 400);
    // Chave de serviço: lê os endereços do amigo (que a pessoa não vê).
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Marca como enviado só se o puxão é desta pessoa, recente e não enviado.
    const { data: sent } = await admin
      .from("nudges")
      .update({ pushed: true })
      .eq("id", nudge)
      .eq("sender", auth.user.id)
      .eq("pushed", false)
      .gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString())
      .select("recipient, message")
      .maybeSingle();
    if (!sent) return response({ sent: 0 });
    const [{ data: who }, { data: tokens }] = await Promise.all([
      admin
        .from("social_profiles")
        .select("name")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      admin.from("push_tokens").select("token").eq("user_id", sent.recipient),
    ]);
    if (!tokens?.length) return response({ sent: 0 });
    const sa = JSON.parse(raw) as ServiceAccount;
    const access = await googleToken(sa);
    let count = 0;
    for (const { token } of tokens) {
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
              notification: {
                title: `${who?.name ?? "Um amigo"} puxou sua orelha`,
                body: sent.message,
              },
              android: { priority: "HIGH" },
            },
          }),
        },
      );
      if (res.ok) count += 1;
      // Aparelho desinstalou o app ou trocou de endereço: apaga.
      else if (res.status === 404 || res.status === 400)
        await admin.from("push_tokens").delete().eq("token", token);
    }
    return response({ sent: count });
  } catch {
    return response({ error: "Falha ao enviar o push" }, 500);
  }
});
