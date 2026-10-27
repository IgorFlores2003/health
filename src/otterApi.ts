import { daysAgo } from "./domain";
import type { DayGoals } from "./gamification";
import { supabase } from "./supabase";

/**
 * Lontra (supabase/migrations/…_otter*.sql): sozinho, com um amigo
 * específico (os dois se escolhem) ou aberta a qualquer amigo que queira
 * ajudar. Só se compartilha se cada meta do dia foi cumprida.
 */
export type OtterMode = "solo" | "buddy" | "open";
type Settings = { user_id: string; mode: OtterMode; buddy: string | null };

function db() {
  if (!supabase) throw Error("Conecte-se para cuidar da lontra.");
  return supabase;
}
function ok<T>({ data, error }: { data: T; error: unknown }) {
  if (error) throw Error("Não foi possível atualizar a lontra agora.");
  return data;
}

/** Envia só se cumpriu cada meta dos últimos dias (nunca os valores). */
export async function syncGoals(goals: DayGoals[]) {
  ok(
    await db()
      .from("daily_goals")
      .upsert(goals, { onConflict: "user_id,date" }),
  );
}

export async function loadOtter(userId: string) {
  const [settingsRes, helpersRes] = await Promise.all([
    db().from("otter_settings").select("user_id, mode, buddy"),
    db().from("otter_helpers").select("owner, helper"),
  ]);
  const settings = (ok(settingsRes) ?? []) as Settings[];
  const helpers = (ok(helpersRes) ?? []) as { owner: string; helper: string }[];
  const mine = settings.find((s) => s.user_id === userId) ?? {
    user_id: userId,
    mode: "solo" as const,
    buddy: null,
  };
  const mutual =
    mine.mode === "buddy" &&
    settings.some(
      (s) =>
        s.user_id === mine.buddy && s.mode === "buddy" && s.buddy === userId,
    );
  const myHelpers = helpers
    .filter((h) => h.owner === userId)
    .map((h) => h.helper);
  // Quem conta na lontra além da pessoa.
  const team =
    mine.mode === "buddy" && mutual
      ? [mine.buddy!]
      : mine.mode === "open"
        ? myHelpers
        : [];
  const goals = (ok(
    await db()
      .from("daily_goals")
      .select("user_id, date, water, calories, exercise")
      .gte("date", daysAgo(6))
      .in("user_id", [userId, ...team]),
  ) ?? []) as (DayGoals & { user_id: string })[];
  return {
    mode: mine.mode,
    buddy: mine.buddy,
    mutual,
    team,
    goals: (id: string) => goals.filter((g) => g.user_id === id),
    /** Amigos que escolheram a pessoa como dupla e esperam resposta. */
    invitedBy: settings
      .filter(
        (s) =>
          s.mode === "buddy" && s.buddy === userId && s.user_id !== mine.buddy,
      )
      .map((s) => s.user_id),
    /** Lontras abertas de amigos, e se a pessoa já ajuda cada uma. */
    openFriends: settings
      .filter((s) => s.mode === "open" && s.user_id !== userId)
      .map((s) => ({
        id: s.user_id,
        helping: helpers.some(
          (h) => h.owner === s.user_id && h.helper === userId,
        ),
      })),
  };
}

export async function setOtterMode(
  userId: string,
  mode: OtterMode,
  buddy: string | null = null,
) {
  ok(
    await db()
      .from("otter_settings")
      .upsert(
        { user_id: userId, mode, buddy: mode === "buddy" ? buddy : null },
        { onConflict: "user_id" },
      ),
  );
  // Fechou a lontra: quem ajudava deixa de contar.
  if (mode !== "open")
    ok(await db().from("otter_helpers").delete().eq("owner", userId));
}

/** Entrar ou sair como ajudante da lontra aberta de um amigo. */
export async function setHelping(userId: string, owner: string, on: boolean) {
  ok(
    on
      ? await db().from("otter_helpers").insert({ owner, helper: userId })
      : await db()
          .from("otter_helpers")
          .delete()
          .eq("owner", owner)
          .eq("helper", userId),
  );
}

/** O dono tira alguém que estava ajudando. */
export async function removeHelper(userId: string, helper: string) {
  ok(
    await db()
      .from("otter_helpers")
      .delete()
      .eq("owner", userId)
      .eq("helper", helper),
  );
}
