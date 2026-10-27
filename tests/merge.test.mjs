import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "../src/domain.ts";
import { mergeStates } from "../src/merge.ts";
const s = (over) => ({ ...structuredClone(initial), ...over });
const w = (id, date, value) => ({ id, date, value });
const ex = (id, minutes = 30) => ({
  id,
  date: "2026-10-26",
  type: "Corrida",
  minutes,
  intensity: "Moderada",
});

test("records added on two devices are both kept", () => {
  const base = s({ weights: [w("a", "2026-10-20", 80)] });
  const phone = s({ weights: base.weights, exercises: [ex("run")] });
  const laptop = s({ weights: [...base.weights, w("b", "2026-10-21", 79.5)] });
  const m = mergeStates(base, phone, laptop);
  assert.deepEqual(m.weights.map((x) => x.id).sort(), ["a", "b"]);
  assert.deepEqual(
    m.exercises.map((x) => x.id),
    ["run"],
  );
});

test("a deletion on this device is not undone by the other copy", () => {
  const base = s({ exercises: [ex("e1"), ex("e2")] });
  const local = s({ exercises: [ex("e2")] });
  const remote = s({ exercises: [ex("e1"), ex("e2"), ex("e3")] });
  assert.deepEqual(
    mergeStates(base, local, remote).exercises.map((x) => x.id),
    ["e2", "e3"],
  );
});

test("edits win over untouched copies; same-day weights keep this device's", () => {
  const base = s({ exercises: [ex("e1", 30)], goal: 75 });
  const local = s({
    exercises: [ex("e1", 45)],
    goal: 75,
    weights: [w("l", "2026-10-26", 81)],
  });
  const remote = s({
    exercises: [ex("e1", 30)],
    goal: 72,
    weights: [w("r", "2026-10-26", 82)],
  });
  const m = mergeStates(base, local, remote);
  assert.equal(m.exercises[0].minutes, 45);
  assert.equal(m.goal, 72);
  assert.deepEqual(
    m.weights.map((x) => x.id),
    ["l"],
  );
});

test("without a known base nothing from either side is lost", () => {
  const remote = s({
    pressures: [{ id: "p", date: "2026-10-25", systolic: 120, diastolic: 80 }],
  });
  const local = s({ exercises: [ex("e")] });
  const m = mergeStates(
    {
      ...remote,
      pressures: [],
      exercises: [],
      weights: [],
      foods: [],
      completedDays: [],
    },
    local,
    remote,
  );
  assert.equal(m.pressures.length, 1);
  assert.equal(m.exercises.length, 1);
});

test("profile merges field by field: a name change does not drop a new photo", () => {
  const photo = "0f8fad5b-d9cb-469f-a165-70867728950e/profile/abc.jpg";
  const base = s({});
  const phone = s({ profile: { ...base.profile, photo } });
  const laptop = s({ profile: { ...base.profile, name: "Igor" } });
  const m = mergeStates(base, laptop, phone);
  assert.equal(m.profile.photo, photo);
  assert.equal(m.profile.name, "Igor");
  // Remover a foto neste aparelho continua valendo.
  const removed = mergeStates(phone, s({ profile: { ...base.profile } }), phone);
  assert.equal(removed.profile.photo, undefined);
});
