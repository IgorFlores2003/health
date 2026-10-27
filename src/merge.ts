import { validState, type State } from "./domain.ts";

type Item = { id: string; date: string };
const LISTS = ["weights", "exercises", "pressures", "foods", "water"] as const;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

function mergeList<T extends Item>(base: T[], local: T[], remote: T[]) {
  const baseById = new Map(base.map((x) => [x.id, x]));
  const localById = new Map(local.map((x) => [x.id, x]));
  const result = new Map(remote.map((x) => [x.id, x]));
  // Removidos neste aparelho desde a última sincronização.
  for (const id of baseById.keys()) if (!localById.has(id)) result.delete(id);
  // Criados ou alterados neste aparelho.
  for (const [id, x] of localById)
    if (!same(x, baseById.get(id))) result.set(id, x);
  return [...result.values()];
}

/**
 * Junta as alterações deste aparelho (local, em relação a base, a última
 * versão sincronizada) com a versão atual da conta (remote), que outro
 * aparelho pode ter mudado. Registro por registro, vence quem alterou;
 * se os dois alteraram o mesmo registro, vale a alteração deste aparelho.
 */
export function mergeStates(base: State, local: State, remote: State): State {
  const pick = <K extends keyof State>(k: K) =>
    same(local[k], base[k]) ? remote[k] : local[k];
  const merged: State = {
    ...remote,
    profile: pick("profile"),
    profileReviewed: pick("profileReviewed"),
    goal: pick("goal"),
    intake: pick("intake"),
    accent: pick("accent"),
    hydration: pick("hydration"),
    weights: [],
    exercises: [],
    pressures: [],
    foods: [],
    water: [],
  };
  for (const k of LISTS)
    (merged[k] as Item[]) = mergeList(
      (base[k] ?? []) as Item[],
      (local[k] ?? []) as Item[],
      (remote[k] ?? []) as Item[],
    );
  // Um peso por dia: se os dois aparelhos registraram a mesma data, fica o deste.
  const localWeights = new Set(local.weights.map((w) => w.id));
  const byDate = new Map<string, State["weights"][number]>();
  for (const w of merged.weights) {
    const prev = byDate.get(w.date);
    if (!prev || localWeights.has(w.id)) byDate.set(w.date, w);
  }
  merged.weights = [...byDate.values()];
  const days = new Set(remote.completedDays ?? []);
  const baseDays = new Set(base.completedDays ?? []);
  const localDays = new Set(local.completedDays ?? []);
  for (const d of localDays) if (!baseDays.has(d)) days.add(d);
  for (const d of baseDays) if (!localDays.has(d)) days.delete(d);
  merged.completedDays = [...days].sort();
  return validState(merged) ? merged : local;
}
