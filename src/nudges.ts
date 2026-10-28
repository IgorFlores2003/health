import type { DayGoals } from "./gamification";
import { pushNotify } from "./push";
import { supabase } from "./supabase";

/** "Puxar orelha" (supabase/migrations/…_nudges.sql). */
export type Nudge = {
  id: string;
  sender: string;
  message: string;
  created_at: string;
  /**
   * nudge: um amigo puxou sua orelha. help: um amigo pediu que você puxe a
   * orelha dele (sem a coluna, de antes da migração, é nudge).
   */
  kind?: "nudge" | "help";
};

/** Sugestões para o pedido de ajuda (a pessoa também pode escrever). */
export const HELP_MESSAGES = [
  "Me puxa a orelha! Estou perdendo o foco hoje.",
  "Me cobra a água de hoje, por favor!",
  "Me chama para treinar, estou sem ânimo.",
  "Estou com vontade de comer besteira, me segura!",
];

/** Mensagem motivacional conforme a meta que está faltando. */
export function nudgeMessage(goals: DayGoals | undefined) {
  const options = !goals?.water
    ? [
        "Bora lá! Cadê a água de hoje?",
        "Ei, um copo de água agora! A lontra agradece.",
      ]
    : !goals?.exercise
      ? [
          "Bora treinar? Só falta você!",
          "Partiu mexer o corpo? A lontra está te esperando na academia.",
        ]
      : [
          "Bora lá! Ainda dá para fechar as calorias de hoje.",
          "Foco na meta de hoje, você consegue!",
        ];
  return options[Math.floor(Math.random() * options.length)];
}

export async function sendNudge(
  recipient: string,
  message: string,
  kind: "nudge" | "help" = "nudge",
) {
  if (!supabase) throw Error("Conecte-se para puxar a orelha.");
  const { data, error } = await supabase
    .from("nudges")
    .insert(
      kind === "help" ? { recipient, message, kind } : { recipient, message },
    )
    .select("id")
    .single();
  if (error)
    throw Error(
      error.code === "42501"
        ? "Você já mandou algo para essa pessoa há pouco. Tente daqui a 1 hora."
        : kind === "help"
          ? "Não foi possível pedir ajuda agora."
          : "Não foi possível puxar a orelha agora.",
    );
  // Push para o celular do amigo (mesmo com o app fechado); se falhar, o
  // puxão continua guardado e aparece quando ele abrir o app.
  pushNotify({ nudge: data.id });
}

/**
 * Pede para os amigos puxarem a sua orelha. Devolve quantos receberam
 * (quem já recebeu algo seu na última hora fica de fora).
 */
export async function askForHelp(friends: string[], message: string) {
  const results = await Promise.allSettled(
    friends.map((id) => sendNudge(id, message.trim(), "help")),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}

/** Pedidos de ajuda dos amigos nas últimas 24 horas (ainda valem). */
export async function helpRequests(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("nudges")
    .select("*")
    .eq("recipient", userId)
    .eq("kind", "help")
    .gte("created_at", new Date(Date.now() - 86400000).toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []) as Nudge[];
}

/** Puxões ainda não vistos (ex.: chegaram com o app fechado). */
export async function pendingNudges(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("nudges")
    .select("*")
    .eq("recipient", userId)
    .is("seen_at", null)
    .order("created_at");
  return (data ?? []) as Nudge[];
}

export async function markSeen(ids: string[]) {
  if (!supabase || !ids.length) return;
  await supabase
    .from("nudges")
    .update({ seen_at: new Date().toISOString() })
    .in("id", ids);
}

/** Recebe puxões na hora enquanto o app estiver aberto. */
export function listenNudges(userId: string, onNudge: (n: Nudge) => void) {
  if (!supabase) return () => {};
  const db = supabase;
  const channel = db
    .channel(`nudges:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "nudges",
        filter: `recipient=eq.${userId}`,
      },
      (payload) => onNudge(payload.new as Nudge),
    )
    .subscribe();
  return () => void db.removeChannel(channel);
}

/** Nome de quem mandou (perfil social visível para amigos). */
export async function senderName(id: string) {
  if (!supabase) return "Um amigo";
  const { data } = await supabase
    .from("social_profiles")
    .select("name")
    .eq("user_id", id)
    .maybeSingle();
  return (data?.name as string | undefined) ?? "Um amigo";
}
