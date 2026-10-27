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
test("projection requires a weight loss goal and bounded positive deficit", () => {
  assert.equal(projection(80, 75, 2500, 2000), 77);
  for (const [w, g, e, i] of [
    [80, 85, 2500, 2000],
    [80, 75, 2000, 2500],
    [80, 75, 3000, 1000],
    [80, 75, 2000, 0],
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
test("water goal is 35 ml/kg rounded to 50 ml", async () => {
  const { waterGoal } = await import("../src/domain.ts");
  assert.equal(waterGoal(80), 2800);
  assert.equal(waterGoal(63), 2200);
  assert.equal(waterGoal(0), null);
});
test("automatic intake never goes below the safe minimum", async () => {
  const { suggestedIntake, minimumIntake } = await import("../src/domain.ts");
  const woman = {
    ...initial.profile,
    height: 155,
    age: 60,
    formulaSex: "female",
  };
  // basal 50 kg: 500 + 968,75 − 300 − 161 = 1008 → mínimo 1.200 kcal
  assert.equal(minimumIntake(basal(50, woman), woman), 1200);
  assert.equal(suggestedIntake(50, 45, woman), 1200);
  const man = { ...initial.profile, height: 180, age: 30, formulaSex: "male" };
  // 1780 × 1,2 = 2136 → 2140 para manter; perder: 1636 < basal → 1780
  assert.equal(suggestedIntake(80, 0, man), 2140);
  assert.equal(suggestedIntake(80, 70, man), 1780);
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
