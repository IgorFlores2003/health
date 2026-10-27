import test from "node:test";
import assert from "node:assert/strict";
import {
  basal,
  projection,
  initial,
  currentWeight,
  validState,
} from "../src/domain.ts";
test("basal Mifflin–St Jeor with both coefficients", () => {
  assert.equal(
    basal(80, { ...initial.profile, height: 180, age: 30, formulaSex: "male" }),
    1780,
  );
  assert.equal(
    basal(80, {
      ...initial.profile,
      height: 180,
      age: 30,
      formulaSex: "female",
    }),
    1614,
  );
});
test("missing weight and minors do not produce estimates", () => {
  assert.equal(basal(0, initial.profile), null);
  assert.equal(basal(70, { ...initial.profile, age: 17 }), null);
});
test("projection needs a deficit to lose or a surplus to gain", () => {
  assert.equal(projection(80, 75, 2500, 2000), 77);
  assert.equal(projection(80, 85, 2500, 2800), 129);
  for (const [w, g, e, i] of [
    [80, 85, 2500, 2000],
    [80, 75, 2000, 2500],
    [80, 75, 3000, 1000],
    [80, 75, 2000, 0],
    [80, 80, 2000, 1500],
  ])
    assert.equal(projection(w, g, e, i), null);
});
test("latest chronological weight is used regardless of insertion order", () => {
  assert.equal(
    currentWeight({
      ...initial,
      weights: [
        { id: "a", date: "2026-10-26", value: 78 },
        { id: "b", date: "2026-10-01", value: 80 },
      ],
    }),
    78,
  );
});
test("backup rejects corrupted records and pressure inversion", () => {
  assert.equal(validState(initial), true);
  assert.equal(
    validState({ ...initial, weights: [{ id: "a", date: "x", value: 80 }] }),
    false,
  );
  assert.equal(
    validState({
      ...initial,
      pressures: [
        { id: "a", date: "2026-10-26", systolic: 80, diastolic: 120 },
      ],
    }),
    false,
  );
  assert.equal(validState({}), false);
});
test("water goal is exactly 35 ml/kg", async () => {
  const { waterGoal } = await import("../src/domain.ts");
  assert.equal(waterGoal(80), 2800);
  assert.equal(waterGoal(63), 2205);
  assert.equal(waterGoal(78.5), 2747.5);
  assert.equal(waterGoal(0), null);
});
test("intake target loses, gains or maintains, never below the safe minimum", async () => {
  const { intakeTarget, goalDirection } = await import("../src/domain.ts");
  const man = { ...initial.profile, height: 180, age: 30, formulaSex: "male" };
  // basal 1780; gasto 2500
  assert.equal(intakeTarget(2500, 80, 70, 1780, man).target, 2000);
  assert.equal(intakeTarget(2500, 80, 90, 1780, man).target, 2800);
  assert.equal(intakeTarget(2500, 80, 0, 1780, man).target, 2500);
  // perder com gasto baixo: para no basal
  const low = intakeTarget(2136, 80, 70, 1780, man);
  assert.equal(low.target, 1780);
  assert.equal(low.limited, true);
  const woman = { ...initial.profile, formulaSex: "female" };
  assert.equal(intakeTarget(1300, 50, 45, 1008, woman).target, 1200);
  assert.equal(goalDirection(100, 110), "gain");
  assert.equal(goalDirection(110, 100), "lose");
  assert.equal(goalDirection(100, 0), "maintain");
});
test("water entries and hydration settings are validated", () => {
  const base = { ...initial, water: [{ id: "a", date: "2026-10-26", ml: 250 }] };
  assert.equal(validState(base), true);
  assert.equal(
    validState({ ...base, water: [{ id: "a", date: "2026-10-26", ml: 0 }] }),
    false,
  );
  const hydration = {
    cupMl: 300,
    reminders: true,
    everyMinutes: 60,
    startHour: 8,
    endHour: 22,
  };
  assert.equal(validState({ ...base, hydration }), true);
  assert.equal(
    validState({ ...base, hydration: { ...hydration, startHour: 23 } }),
    false,
  );
});
test("liquid foods keep ml and old foods default to grams", async () => {
  const { foodUnit } = await import("../src/domain.ts");
  const { foodCalories } = await import("../src/energy.ts");
  const juice = {
    id: "j",
    date: "2026-10-26",
    name: "Suco de laranja",
    grams: 250,
    kcalPer100g: 45,
    source: "ai",
    unit: "ml",
  };
  assert.equal(validState({ ...initial, foods: [juice] }), true);
  assert.equal(foodUnit(juice), "ml");
  assert.equal(foodCalories(juice), 112.5);
  const { unit: _u, ...old } = juice;
  assert.equal(foodUnit(old), "g");
  assert.equal(validState({ ...initial, foods: [{ ...juice, unit: "l" }] }), false);
});
test("drinks are recognized by name when the AI does not say", async () => {
  const { looksLiquid } = await import("../src/domain.ts");
  for (const n of ["Leite", "leite integral", "Suco de laranja", "Café com leite", "Chá verde", "Refrigerante", "sopa de legumes", "Iogurte líquido"])
    assert.equal(looksLiquid(n), true, n);
  for (const n of ["Doce de leite", "Pão com leite", "Leite em pó", "Leite condensado", "Arroz", "Banana"])
    assert.equal(looksLiquid(n), false, n);
});
