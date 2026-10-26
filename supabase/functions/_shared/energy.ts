import {
  basal,
  byDate,
  type State,
  type Exercise,
  type Food,
} from "./domain.ts";
export const foodCalories = (food: Food) =>
  food.kcalPer100g === null
    ? null
    : Math.round((food.grams * food.kcalPer100g) / 100);
export function weightAtDate(state: State, date: string) {
  return byDate(state.weights.filter((w) => w.date <= date)).at(-1)?.value ?? 0;
}
// Simplified flat-ground MET bands from the 2024 Adult Compendium.
// See docs/energy.md for sources, assumptions and limitations.
export function exerciseMet(ex: Exercise): number | null {
  const speed =
    ex.distanceKm && ex.minutes > 0 ? ex.distanceKm / (ex.minutes / 60) : null;
  if (ex.type === "Caminhada") {
    if (speed !== null) {
      if (speed < 1 || speed > 9) return null;
      return speed < 3.2
        ? 2.3
        : speed < 4
          ? 2.8
          : speed < 4.5
            ? 3
            : speed < 5.6
              ? 3.8
              : speed < 6.4
                ? 4.8
                : speed < 7.2
                  ? 5.5
                  : 7;
    }
    return ex.intensity === "Leve"
      ? 2.8
      : ex.intensity === "Moderada"
        ? 3.8
        : 4.8;
  }
  if (ex.type === "Corrida") {
    if (speed !== null) {
      if (speed < 6.4 || speed > 20) return null;
      return speed < 6.9
        ? 6.5
        : speed < 8
          ? 7.8
          : speed < 8.9
            ? 8.5
            : speed < 9.7
              ? 9
              : speed < 10.7
                ? 9.3
                : speed < 11.3
                  ? 10.5
                  : speed < 12.1
                    ? 11
                    : speed < 12.9
                      ? 11.8
                      : speed < 13.8
                        ? 12
                        : speed < 14.5
                          ? 12.5
                          : speed < 15
                            ? 13
                            : 14.8;
    }
    return ex.intensity === "Leve"
      ? 6.5
      : ex.intensity === "Moderada"
        ? 8.5
        : 11;
  }
  if (ex.type === "Ciclismo") {
    if (speed !== null) {
      if (speed < 3 || speed > 40) return null;
      return speed < 16
        ? 4
        : speed < 19.3
          ? 6.8
          : speed < 22.5
            ? 8
            : speed < 25.7
              ? 10
              : speed < 32.2
                ? 12
                : 16.8;
    }
    return ex.intensity === "Leve" ? 4.3 : ex.intensity === "Moderada" ? 7 : 9;
  }
  if (ex.type === "Musculação") return ex.intensity === "Intensa" ? 6 : 3.5;
  if (ex.type === "Yoga") return 2.3;
  if (ex.type === "Pilates") return 2.8;
  return null;
}
export function exerciseEnergy(ex: Exercise, weight: number) {
  if (ex.activeCalories !== undefined)
    return {
      calories: Math.round(ex.activeCalories),
      source: "informado" as const,
      met: null,
    };
  const met = exerciseMet(ex);
  if (!met || !weight || ex.minutes <= 0)
    return { calories: null, source: "pendente" as const, met };
  // Net exercise expenditure: rest is already included in the daily baseline.
  return {
    calories: Math.round(((met - 1) * weight * ex.minutes) / 60),
    source: "estimado" as const,
    met,
  };
}
export function dailyEnergy(state: State, date: string) {
  const foods = (state.foods ?? []).filter((f) => f.date === date);
  const exercises = state.exercises.filter((e) => e.date === date);
  const weight = weightAtDate(state, date);
  const bmr = state.profileReviewed ? basal(weight, state.profile) : null;
  const baseline = bmr === null ? null : Math.round(bmr * 1.2);
  const foodMissing = foods.filter((f) => foodCalories(f) === null).length;
  const exerciseValues = exercises.map((e) => ({
    ...e,
    ...exerciseEnergy(e, weight),
  }));
  const exerciseMissing = exerciseValues.filter(
    (e) => e.calories === null,
  ).length;
  const intake = foods.reduce((sum, f) => sum + (foodCalories(f) ?? 0), 0);
  const active = exerciseValues.reduce((sum, e) => sum + (e.calories ?? 0), 0);
  const expenditure =
    baseline === null || exerciseMissing > 0 ? null : baseline + active;
  const completed = (state.completedDays ?? []).includes(date);
  const complete =
    completed &&
    foods.length > 0 &&
    foodMissing === 0 &&
    exerciseMissing === 0 &&
    expenditure !== null;
  const balance =
    expenditure === null || foodMissing || exerciseMissing
      ? null
      : intake - expenditure;
  const status: "incomplete" | "near_balance" | "deficit" | "surplus" =
    !complete
      ? "incomplete"
      : Math.abs(balance!) <= 100
        ? "near_balance"
        : balance! < 0
          ? "deficit"
          : "surplus";
  return {
    date,
    weight,
    bmr,
    baseline,
    intake,
    active,
    expenditure,
    balance,
    status,
    complete,
    completed,
    foodMissing,
    exerciseMissing,
    foodCount: foods.length,
    exerciseCount: exercises.length,
    aiFoods: foods.filter((f) => f.source === "ai").length,
    foods,
    exercises: exerciseValues,
  };
}
export function reopenDay(state: State, date: string) {
  return (state.completedDays ?? []).filter((d) => d !== date);
}
