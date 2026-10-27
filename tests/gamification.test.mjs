import test from "node:test";
import assert from "node:assert/strict";
import { initial, today, daysAgo } from "../src/domain.ts";
import {
  dailyMissions,
  mascotMood,
  medals,
  progressLevel,
} from "../src/gamification.ts";

const base = {
  ...initial,
  profileReviewed: true,
  profile: { ...initial.profile, height: 180, age: 30, formulaSex: "male" },
};
const days = (n) => Array.from({ length: n }, (_, i) => daysAgo(i));

test("missions, XP and level come from the day's records", () => {
  const d = today();
  const s = {
    ...base,
    weights: [{ id: "w", date: d, value: 80 }],
    water: [{ id: "a", date: d, ml: 2800 }],
  };
  const done = dailyMissions(s, d)
    .filter((m) => m.done)
    .map((m) => m.id);
  assert.deepEqual(done, ["weight", "water"]);
  assert.equal(progressLevel(s).xp, 20);
  assert.equal(progressLevel(s).level, 1);
});

test("streak and water medals", () => {
  const week = days(7);
  const s = {
    ...base,
    weights: week.map((date, i) => ({ id: `w${i}`, date, value: 80 })),
    water: week.map((date, i) => ({ id: `a${i}`, date, ml: 3000 })),
  };
  const m = Object.fromEntries(medals(s).map((x) => [x.id, x.earned]));
  assert.equal(m.first, true);
  assert.equal(m.week, true);
  assert.equal(m.month, false);
  assert.equal(m.water7, true);
});

test("weight medals follow the goal direction (gain too)", () => {
  const s = {
    ...base,
    goal: 90,
    weights: [
      { id: "a", date: daysAgo(10), value: 80 },
      { id: "b", date: today(), value: 85.5 },
    ],
  };
  const m = Object.fromEntries(medals(s).map((x) => [x.id, x.earned]));
  assert.equal(m.kg1, true);
  assert.equal(m.kg5, true);
  assert.equal(m.goal, false);
});

test("mascot is thirsty without water and fuller when eating above the goal", () => {
  const d = today();
  const s = { ...base, weights: [{ id: "w", date: d, value: 80 }] };
  assert.equal(mascotMood(s, d).mood, "thirsty");
  const full = {
    ...s,
    water: [{ id: "a", date: d, ml: 2800 }],
    foods: [
      {
        id: "f",
        date: d,
        name: "Pizza",
        grams: 1000,
        kcalPer100g: 300,
        source: "label",
      },
    ],
  };
  const mood = mascotMood(full, d);
  assert.equal(mood.mood, "full");
  assert.ok(mood.body > 1);
});

test("otter gets fitter only when both buddies meet the goals", async () => {
  const { otterFitness } = await import("../src/gamification.ts");
  const week = days(7);
  const all = week.map((date) => ({
    date,
    water: true,
    calories: true,
    exercise: true,
  }));
  const none = week.map((date) => ({
    date,
    water: false,
    calories: false,
    exercise: false,
  }));
  assert.equal(otterFitness([all, all]), 1);
  assert.equal(otterFitness([all, none]), 0.5);
  assert.equal(otterFitness([none]), 0);
  assert.equal(otterFitness([]), 0);
});

test("pet evolves with the level: eggs, hatching and growth", async () => {
  const { petStage } = await import("../src/gamification.ts");
  const s = (n) => petStage(n);
  assert.deepEqual([s(1).phase, s(5).motion, s(5).cracks], ["egg", "still", 0]);
  assert.deepEqual([s(6).motion, s(6).cracks, s(9).cracks], ["shake", 1, 4]);
  assert.deepEqual(
    [s(10).name, s(10).phase, s(10).growth],
    ["Pipoca", "young", 0],
  );
  assert.deepEqual([s(15).growth, s(20).phase], [0.5, "adult"]);
  assert.deepEqual(
    [s(21).line, s(21).phase, s(25).motion],
    ["croc", "egg", "still"],
  );
  assert.deepEqual([s(26).motion, s(29).cracks], ["wobble", 4]);
  assert.deepEqual(
    [s(30).name, s(40).phase, s(55).phase],
    ["Tuca", "adult", "adult"],
  );
});
