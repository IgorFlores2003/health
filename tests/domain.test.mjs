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
