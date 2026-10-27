import type { DayGoals } from "./gamification";
import { supabase } from "./supabase";

/** "Puxar orelha" (supabase/migrations/…_nudges.sql). */
export type Nudge = {
  id: string;
  sender: string;
  message: string;
  created_at: string;
};

/** Mensagem motivacional conforme a meta que está faltando. */
export function nudgeMessage(goals: DayGoals | undefined) {
  const options = !goals?.water
    ? [
        "Bora lá! Cadê a água de hoje? 💧",
        "Ei, um copo de água agora! A lontra agradece.",
      ]
    : !goals?.exercise
      ? [
          "Bora treinar? Só falta você! 💪",
          "Partiu mexer o corpo? A lontra está te esperando na academia.",
        ]
      : [
          "Bora lá! Ainda dá para fechar as calorias de hoje.",
          "Foco na meta de hoje, você consegue!",
        ];
  return options[Math.floor(Math.random() * options.length)];
}

export async function sendNudge(recipient: string, message: string) {
  if (!supabase) throw Error("Conecte-se para puxar a orelha.");
  const { data, error } = await supabase
    .from("nudges")
    .insert({ recipient, message })
    .select("id")
    .single();
  if (error)
    throw Error(
      error.code === "42501"
        ? "Você já puxou a orelha dessa pessoa há pouco. Tente daqui a 1 hora."
        : "Não foi possível puxar a orelha agora.",
    );
  // Push para o celular do amigo (mesmo com o app fechado); se falhar, o
  // puxão continua guardado e aparece quando ele abrir o app.
  void supabase.functions
    .invoke("notify", { body: { nudge: data.id } })
    .catch(() => undefined);
}

/** Puxões ainda não vistos (ex.: chegaram com o app fechado). */
export async function pendingNudges(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("nudges")
    .select("id, sender, message, created_at")
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
