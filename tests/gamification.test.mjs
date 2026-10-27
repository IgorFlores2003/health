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
  assert.equal(progressLevel(s).xp, 40);
  assert.equal(progressLevel(s).level, 2);
});

test("two good days pass four levels; social actions give XP with a daily cap", () => {
  const two = [today(), daysAgo(1)];
  const s = {
    ...base,
    weights: two.map((date, i) => ({ id: `w${i}`, date, value: 80 })),
    water: two.map((date, i) => ({ id: `a${i}`, date, ml: 3000 })),
    exercises: two.map((date, i) => ({
      id: `e${i}`,
      date,
      type: "Caminhada",
      minutes: 30,
      intensity: "Leve",
    })),
    // 6 curtidas no mesmo dia: só 5 contam.
    social: Array.from({ length: 6 }, (_, i) => ({
      id: `like-${i}`,
      date: today(),
      kind: "like",
    })),
  };
  // 3 missões x 20 x 2 dias + 5 curtidas x 3 = 135 XP -> 30 + 40 + 50 = nível 4
  assert.equal(progressLevel(s).xp, 135);
  assert.equal(progressLevel(s).level, 4);
  const full = {
    ...s,
    foods: two.flatMap((date) =>
      [1, 2, 3].map((n) => ({
        id: `${date}-${n}`,
        date,
        name: "Arroz",
        grams: 100,
        kcalPer100g: 130,
        source: "label",
      })),
    ),
    completedDays: two,
  };
  // Dias completos: (5 x 20 + 30) x 2 + 15 = 275 -> passa do nível 5.
  assert.ok(progressLevel(full).level >= 5);
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

test("pet evolves with the level like a game: egg, chick, pullet, rooster", async () => {
  const { petStage, nextEvolution } = await import("../src/gamification.ts");
  const s = (n) => petStage(n);
  assert.deepEqual([s(1).form, s(1).motion, s(1).cracks], ["egg", "still", 0]);
  assert.deepEqual([s(3).motion, s(4).cracks], ["shake", 4]);
  assert.deepEqual(
    [s(5).formLabel, s(5).name, s(5).step],
    ["Pintinho", "Pipoca", 0],
  );
  assert.deepEqual([s(10).formLabel, s(16).formLabel], ["Galeto", "Galo"]);
  assert.deepEqual(
    [s(23).line, s(23).form, s(25).motion],
    ["croc", "egg", "wobble"],
  );
  assert.deepEqual(
    [s(27).name, s(38).formLabel, s(60).form],
    ["Tuca", "Crocodilão", "adult"],
  );
  // Cada nível muda algo dentro da forma.
  assert.notEqual(s(11).growth, s(12).growth);
  assert.deepEqual(nextEvolution(1), {
    line: "chick",
    form: "baby",
    from: 5,
    label: "Pintinho",
  });
  assert.equal(nextEvolution(40), null);
});
