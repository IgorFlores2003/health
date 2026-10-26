import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "../src/domain.ts";
import { analyzePeriod } from "../src/report.ts";

const base = {
  ...structuredClone(initial),
  profileReviewed: true,
  profile: { ...initial.profile, height: 180, age: 30, formulaSex: "male" },
  weights: [{ id: "w", date: "2026-10-01", value: 80 }],
};
const food = (id, date, name, grams, kcalPer100g) => ({
  id,
  date,
  name,
  grams,
  kcalPer100g,
  source: kcalPer100g === null ? "pending" : "label",
});

test("days are classified as great, over, too low or incomplete", () => {
  // 80 kg, 180 cm, 30 anos, masculino: disponível ≈ 2136 kcal sem exercício.
  const state = {
    ...base,
    foods: [
      food("a", "2026-10-20", "Arroz", 1000, 200),
      food("b", "2026-10-21", "Pizza", 1000, 280),
      food("c", "2026-10-22", "Salada", 300, 30),
      food("d", "2026-10-23", "Bolo", 200, null),
    ],
    completedDays: ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"],
  };
  const r = analyzePeriod(state, "2026-10-20", "2026-10-26");
  assert.deepEqual(
    r.days.map((d) => d.verdict),
    ["otimo", "acima", "baixo", "incompleto"],
  );
  assert.equal(r.over[0].top[0].name, "Pizza");
  assert.ok(r.tips.some((t) => t.includes("Pizza")));
  assert.ok(r.tips.some((t) => t.includes("incompleto")));
});

test("summary covers weight, exercise and pressure in the period only", () => {
  const state = {
    ...base,
    weights: [
      { id: "w0", date: "2026-09-01", value: 90 },
      { id: "w1", date: "2026-10-01", value: 82 },
      { id: "w2", date: "2026-10-26", value: 80.5 },
    ],
    exercises: [
      {
        id: "e",
        date: "2026-10-10",
        type: "Caminhada",
        minutes: 60,
        intensity: "Leve",
        distanceKm: 3.69,
        elevationM: 50,
      },
    ],
    pressures: [
      { id: "p", date: "2026-10-12", systolic: 145, diastolic: 92, pulse: 80 },
    ],
  };
  const r = analyzePeriod(state, "2026-10-01", "2026-10-26");
  assert.equal(r.weight.change, -1.5);
  assert.equal(r.exercise.km, 3.69);
  assert.equal(r.exercise.elevation, 50);
  assert.equal(r.pressure.high, 1);
  assert.ok(r.tips.some((t) => t.includes("médico")));
});
