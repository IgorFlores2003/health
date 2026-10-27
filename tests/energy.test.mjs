import test from "node:test";
import assert from "node:assert/strict";
import { initial, validState } from "../src/domain.ts";
import {
  dailyBudget,
  foodCalories,
  exerciseEnergy,
  dailyEnergy,
  reopenDay,
} from "../src/energy.ts";
const date = "2026-10-26";
const food = {
  id: "food",
  date,
  name: "Arroz cozido",
  grams: 150,
  kcalPer100g: 130,
  source: "label",
};
const walk = {
  id: "walk",
  date,
  type: "Caminhada",
  minutes: 60,
  intensity: "Moderada",
  distanceKm: 5,
};
const state = {
  ...initial,
  profileReviewed: true,
  profile: { ...initial.profile, height: 180, age: 30, formulaSex: "male" },
  weights: [{ id: "w", date, value: 80 }],
  foods: [food],
  exercises: [walk],
  completedDays: [date],
};
test("food portions use grams, preserving zero and pending calories", () => {
  assert.equal(foodCalories(food), 195);
  assert.equal(foodCalories({ ...food, kcalPer100g: 0 }), 0);
  assert.equal(foodCalories({ ...food, kcalPer100g: null }), null);
});
test("distance and time determine walking speed; estimates exclude rest", () => {
  assert.equal(exerciseEnergy(walk, 80).calories, 224);
  assert.ok(exerciseEnergy({ ...walk, distanceKm: 6 }, 80).calories > 224);
});
test("manual exercise calories replace, rather than add to, MET estimates", () => {
  assert.equal(
    exerciseEnergy({ ...walk, activeCalories: 250 }, 80).calories,
    250,
  );
  assert.equal(
    exerciseEnergy({ ...walk, minutes: 0, activeCalories: 0 }, 80).calories,
    0,
  );
});
test("unsupported types and implausible speeds remain pending", () => {
  assert.equal(exerciseEnergy({ ...walk, type: "Outro" }, 80).calories, null);
  assert.equal(exerciseEnergy({ ...walk, distanceKm: 50 }, 80).calories, null);
  assert.equal(exerciseEnergy(walk, 0).calories, null);
});
test("daily expenditure: the larger of profile activity and light baseline + exercise", () => {
  const day = dailyEnergy(state, date);
  assert.equal(day.bmr, 1780);
  assert.equal(day.baseline, 2136);
  assert.equal(day.active, 224);
  assert.equal(day.expenditure, 2360);
  assert.equal(day.balance, 195 - 2360);
  assert.equal(day.status, "deficit");
  assert.equal(
    dailyEnergy(
      { ...state, profile: { ...state.profile, activity: 1.725 } },
      date,
    ).expenditure,
    // 1780 × 1,725 = 3070,5: o fator do perfil já cobre o exercício do dia.
    1780 * 1.725,
  );
});
test("partial, absent or unquantified records do not imply a deficit", () => {
  for (const changes of [
    { completedDays: [] },
    { foods: [] },
    { foods: [{ ...food, kcalPer100g: null, source: "pending" }] },
    { profileReviewed: false },
    { weights: [] },
    { exercises: [{ ...walk, type: "Outro" }] },
  ])
    assert.equal(
      dailyEnergy({ ...state, ...changes }, date).status,
      "incomplete",
    );
});
test("complete days classify surplus or near balance from actual intake", () => {
  assert.equal(
    dailyEnergy({ ...state, foods: [{ ...food, grams: 3000 }] }, date).status,
    "surplus",
  );
  assert.equal(
    dailyEnergy(
      { ...state, foods: [{ ...food, grams: 2360, kcalPer100g: 100 }] },
      date,
    ).status,
    "near_balance",
  );
});
test("historical days use only their own records and the weight available then", () => {
  const s = {
    ...state,
    weights: [
      ...state.weights,
      { id: "future", date: "2026-11-01", value: 100 },
    ],
    foods: [food, { ...food, id: "other", date: "2026-11-01" }],
  };
  assert.equal(dailyEnergy(s, date).weight, 80);
  assert.equal(dailyEnergy(s, date).foodCount, 1);
  assert.equal(dailyEnergy(s, "2026-10-25").weight, 0);
});
test("legacy backups remain valid while malformed new fields are rejected", () => {
  const legacy = { ...initial };
  delete legacy.foods;
  delete legacy.completedDays;
  delete legacy.profileReviewed;
  assert.equal(validState(legacy), true);
  assert.equal(validState(state), true);
  assert.equal(
    validState({ ...state, foods: [{ ...food, grams: -1 }] }),
    false,
  );
  assert.equal(
    validState({ ...state, foods: [{ ...food, kcalPer100g: null }] }),
    false,
  );
  assert.equal(
    validState({ ...state, exercises: [{ ...walk, activeCalories: -1 }] }),
    false,
  );
  assert.equal(
    validState({
      ...state,
      exercises: [{ ...walk, minutes: 0, activeCalories: 100 }],
    }),
    true,
  );
});
test("editing a day reopens only that day", () => {
  assert.deepEqual(
    reopenDay({ ...state, completedDays: [date, "2026-10-25"] }, date),
    ["2026-10-25"],
  );
});
test("daily budget: automatic target from activity, exercises and goal", () => {
  const base = {
    ...initial,
    profileReviewed: true,
    profile: { ...initial.profile, height: 180, age: 30, formulaSex: "male" },
    weights: [{ id: "w", date: "2026-10-25", value: 80 }],
  };
  const date = "2026-10-26";
  // basal 1780 × 1,2 = 2136 → manter, sem arredondar
  let b = dailyBudget(base, date);
  assert.equal(b.ready && b.direction, "maintain");
  assert.equal(b.ready && b.available, 1780 * 1.2);
  // Nível de atividade do perfil: 1780 × 1,55 = 2759
  const active = { ...base, profile: { ...base.profile, activity: 1.55 } };
  b = dailyBudget({ ...active, goal: 70 }, date);
  assert.equal(b.ready && b.spendSource, "profile");
  assert.equal(b.ready && b.available, 1780 * 1.55 - 500);
  b = dailyBudget({ ...active, goal: 90 }, date);
  assert.equal(b.ready && b.direction, "gain");
  assert.equal(b.ready && b.available, 1780 * 1.55 + 300);
  // Perder com rotina leve: 2136 − 500 < basal → fica no basal.
  b = dailyBudget({ ...base, goal: 70 }, date);
  assert.equal(b.ready && b.available, 1780);
  assert.equal(b.ready && b.limited, true);
  // Exercício registrado acima do previsto pelo perfil aumenta a meta.
  b = dailyBudget(
    {
      ...base,
      foods: [
        {
          id: "f",
          date,
          name: "Arroz",
          grams: 150,
          kcalPer100g: 130,
          source: "label",
        },
      ],
      exercises: [
        {
          id: "e",
          date,
          type: "Corrida",
          minutes: 30,
          intensity: "Moderada",
          activeCalories: 300,
        },
      ],
    },
    date,
  );
  assert.equal(b.ready && b.spendSource, "exercises");
  assert.equal(b.ready && b.available, 1780 * 1.2 + 300);
  assert.equal(b.ready && b.consumed, 195);
  assert.equal(b.ready && b.remaining, 1780 * 1.2 + 300 - 195);
  // Sem perfil salvo não há como calcular.
  b = dailyBudget({ ...base, profileReviewed: false }, date);
  assert.equal(b.ready, false);
  assert.equal(!b.ready && b.reason, "profile");
});
