import test from "node:test";
import assert from "node:assert/strict";
import { initial, validState } from "../src/domain.ts";
import { stepEnergy, stepsOn } from "../src/energy.ts";
import { addSteps, setSteps, stepDelta } from "../src/stepMath.ts";

const profile = { ...initial.profile, height: 170, formulaSex: "male" };

test("steps estimate distance by height and active calories like a walk", () => {
  const e = stepEnergy(10000, 70, profile);
  // 10.000 × 1,70 m × 0,415 = 7,055 km; a 4,8 km/h = 88,1875 min.
  assert.ok(Math.abs(e.distanceKm - 7.055) < 1e-9);
  assert.ok(Math.abs(e.minutes - 88.1875) < 1e-9);
  // Caminhada a 4,8 km/h = 3,8 MET; sem o repouso: 2,8 × 70 kg × h.
  assert.ok(Math.abs(e.calories - (2.8 * 70 * 88.1875) / 60) < 1e-9);
  assert.equal(stepEnergy(0, 70, profile).calories, 0);
  // Sem peso não dá para estimar as calorias.
  assert.equal(stepEnergy(5000, 0, profile).calories, null);
});

test("sensor readings add only new steps, also after a reboot", () => {
  const start = 1_000_000;
  // Primeira leitura: celular ligado antes de hoje, começa do zero.
  let r = stepDelta(null, { steps: 5000, bootAt: start - 1 }, start);
  assert.equal(r.delta, 0);
  // Celular ligado hoje: tudo o que contou é de hoje.
  assert.equal(
    stepDelta(null, { steps: 300, bootAt: start + 10 }, start).delta,
    300,
  );
  r = stepDelta(r.next, { steps: 5400, bootAt: start - 1 }, start);
  assert.equal(r.delta, 400);
  // Reiniciou: o contador voltou para perto de zero.
  r = stepDelta(r.next, { steps: 120, bootAt: start + 99999999 }, start);
  assert.equal(r.delta, 120);
});

test("steps are one record per day, summed or set by hand", () => {
  let list = addSteps([], "2026-11-01", 400);
  list = addSteps(list, "2026-11-01", 100);
  assert.deepEqual(list, [
    { id: "steps:2026-11-01", date: "2026-11-01", count: 500, source: "sensor" },
  ]);
  list = setSteps(list, "2026-11-01", 8123);
  assert.equal(list.length, 1);
  assert.equal(list[0].count, 8123);
  assert.equal(list[0].source, "manual");
  assert.equal(stepsOn({ ...initial, steps: list }, "2026-11-01"), 8123);
  assert.deepEqual(setSteps(list, "2026-11-01", 0), []);
});

test("state accepts steps and body fat, and rejects invalid values", () => {
  const steps = [
    { id: "steps:2026-11-01", date: "2026-11-01", count: 8000, source: "sensor" },
  ];
  const weights = [
    {
      id: "w",
      date: "2026-11-01",
      value: 80,
      bodyFat: 22.5,
      bodyFatSource: "ai",
    },
  ];
  assert.ok(validState({ ...initial, steps, weights }));
  assert.ok(!validState({ ...initial, steps: [{ ...steps[0], count: -1 }] }));
  assert.ok(
    !validState({ ...initial, steps: [{ ...steps[0], source: "watch" }] }),
  );
  assert.ok(
    !validState({ ...initial, weights: [{ ...weights[0], bodyFat: 90 }] }),
  );
  // Backups antigos, sem passos nem gordura, continuam válidos.
  assert.ok(validState({ ...initial }));
});
