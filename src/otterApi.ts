import { daysAgo } from "./domain";
import type { DayGoals } from "./gamification";
import { supabase } from "./supabase";

/** Lontra da dupla (supabase/migrations/…_otter.sql). */
function db() {
  if (!supabase) throw Error("Conecte-se para cuidar da lontra.");
  return supabase;
}

/** Envia só se cumpriu cada meta dos últimos dias (nunca os valores). */
export async function syncGoals(goals: DayGoals[]) {
  const { error } = await db()
    .from("daily_goals")
    .upsert(goals, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function loadOtter(userId: string) {
  const { data: choices, error } = await db()
    .from("otter_buddies")
    .select("user_id, buddy");
  if (error) throw error;
  const mine = choices?.find((c) => c.user_id === userId)?.buddy ?? null;
  const mutual =
    !!mine && !!choices?.some((c) => c.user_id === mine && c.buddy === userId);
  const { data: goals, error: goalsError } = await db()
    .from("daily_goals")
    .select("user_id, date, water, calories, exercise")
    .gte("date", daysAgo(6))
    .in("user_id", mutual ? [userId, mine!] : [userId]);
  if (goalsError) throw goalsError;
  const of = (id: string) =>
    (goals ?? []).filter((g) => g.user_id === id) as DayGoals[];
  return {
    buddy: mine,
    mutual,
    /** Quem escolheu a pessoa e ainda espera ser escolhido de volta. */
    invitedBy: (choices ?? [])
      .filter((c) => c.buddy === userId && c.user_id !== mine)
      .map((c) => c.user_id),
    mine: of(userId),
    theirs: mutual ? of(mine!) : [],
  };
}

export async function chooseBuddy(userId: string, buddy: string | null) {
  const { error } = buddy
    ? await db()
        .from("otter_buddies")
        .upsert({ user_id: userId, buddy }, { onConflict: "user_id" })
    : await db().from("otter_buddies").delete().eq("user_id", userId);
  if (error) throw Error("Não foi possível escolher a dupla agora.");
}
