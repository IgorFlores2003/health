import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "../src/domain.ts";
import { quickAnswer } from "../src/quickAnswers.ts";

const date = "2026-10-26";
const state = {
  ...initial,
  profileReviewed: true,
  profile: { ...initial.profile, height: 180, age: 30, formulaSex: "male" },
  weights: [{ id: "w", date, value: 80 }],
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
  completedDays: [date],
};

test("obvious questions are answered locally, in Portuguese, without asterisks", () => {
  for (const q of [
    "Estou em déficit calórico neste dia?",
    "O que significa metabolismo basal?",
    "Resuma meu progresso até aqui.",
    "Como acompanhar minha constância?",
    "Com base nos alimentos e exercícios registrados neste dia, estou em déficit calórico? Explique o saldo e as limitações dos dados.",
  ]) {
    const a = quickAnswer(q, state, date);
    assert.ok(a, q);
    assert.ok(!a.includes("*"), q);
  }
  assert.match(quickAnswer("estou em deficit?", state, date), /^Sim, déficit/);
  assert.match(quickAnswer("O que é basal?", state, date), /1\.780 kcal/);
});
test("other questions still go to the AI", () => {
  for (const q of [
    "Estou em déficit? O que devo comer amanhã?",
    "Posso comer pizza à noite?",
    "Por que meu basal caiu?",
  ])
    assert.equal(quickAnswer(q, state, date), null, q);
});
test("incomplete day explains what is missing instead of a verdict", () => {
  const a = quickAnswer(
    "Estou em déficit calórico neste dia?",
    { ...state, completedDays: [] },
    date,
  );
  assert.match(a, /Ainda não dá para dizer/);
  assert.match(a, /marcar no Diário/);
});
