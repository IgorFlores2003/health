import {
  byDate,
  currentWeight,
  dateKey,
  lastDays,
  waterGoal,
  type State,
} from "./domain.ts";
import { dailyBudget, waterOn, weightAtDate } from "./energy.ts";

/**
 * Gamificação calculada a partir dos registros (nada extra é salvo):
 * missões do dia, XP/nível, medalhas e o humor do mascote.
 */
export type Mission = { id: string; label: string; done: boolean };
export type Medal = {
  id: string;
  icon: string;
  title: string;
  text: string;
  earned: boolean;
  /** Progresso de 0 a 1 enquanto não conquistada. */
  progress: number;
};

const XP_PER_MISSION = 10;
const XP_PER_LEVEL = 100;

export function dailyMissions(state: State, date: string): Mission[] {
  const water = waterGoal(weightAtDate(state, date));
  return [
    {
      id: "weight",
      label: "Registrar o peso",
      done: state.weights.some((w) => w.date === date),
    },
    {
      id: "water",
      label: "Bater a meta de água",
      done: !!water && waterOn(state, date) >= water,
    },
    {
      id: "meals",
      label: "Registrar 3 refeições ou mais",
      done: (state.foods ?? []).filter((f) => f.date === date).length >= 3,
    },
    {
      id: "exercise",
      label: "Fazer um exercício",
      done: state.exercises.some((e) => e.date === date),
    },
    {
      id: "close",
      label: "Fechar o dia no diário",
      done: (state.completedDays ?? []).includes(date),
    },
  ];
}

/** Dias com algum registro. */
function activeDays(state: State) {
  return new Set(
    [
      ...state.weights,
      ...state.exercises,
      ...state.pressures,
      ...(state.foods ?? []),
      ...(state.water ?? []),
    ].map((x) => x.date),
  );
}

/** Maior sequência de dias seguidos dentro do conjunto. */
function longestStreak(days: Set<string>) {
  let best = 0;
  for (const d of days) {
    const prev = new Date(d + "T12:00:00");
    prev.setDate(prev.getDate() - 1);
    if (days.has(dateKey(prev))) continue;
    let run = 0;
    const cur = new Date(d + "T12:00:00");
    while (days.has(dateKey(cur))) {
      run += 1;
      cur.setDate(cur.getDate() + 1);
    }
    best = Math.max(best, run);
  }
  return best;
}

export function progressLevel(state: State) {
  const xp = [...activeDays(state)].reduce(
    (sum, d) =>
      sum +
      dailyMissions(state, d).filter((m) => m.done).length * XP_PER_MISSION,
    0,
  );
  return {
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    /** Fração do nível atual já completada. */
    progress: (xp % XP_PER_LEVEL) / XP_PER_LEVEL,
    toNext: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
  };
}

export function medals(state: State): Medal[] {
  const days = activeDays(state);
  const streak = longestStreak(days);
  const waterDays = [...days].filter(
    (d) => dailyMissions(state, d).find((m) => m.id === "water")!.done,
  ).length;
  const closed = (state.completedDays ?? []).length;
  const weekMinutes = state.exercises
    .filter((e) => lastDays(7).includes(e.date))
    .reduce((t, e) => t + e.minutes, 0);
  const weights = byDate(state.weights);
  const start = weights[0]?.value ?? 0;
  const now = currentWeight(state);
  // Quilos andados na direção da meta (perder ou ganhar).
  const moved =
    state.goal && start
      ? state.goal < start
        ? start - now
        : state.goal > start
          ? now - start
          : 0
      : 0;
  const reached =
    !!state.goal &&
    !!start &&
    start !== state.goal &&
    (state.goal < start ? now <= state.goal : now >= state.goal);
  const medal = (
    id: string,
    icon: string,
    title: string,
    text: string,
    value: number,
    target: number,
  ): Medal => ({
    id,
    icon,
    title,
    text,
    earned: value >= target,
    progress: Math.max(0, Math.min(1, value / target)),
  });
  return [
    medal(
      "first",
      "👣",
      "Primeiro passo",
      "Registrou o primeiro peso.",
      weights.length,
      1,
    ),
    medal(
      "week",
      "🔥",
      "Uma semana",
      "7 dias seguidos com registros.",
      streak,
      7,
    ),
    medal(
      "month",
      "🏆",
      "Um mês firme",
      "30 dias seguidos com registros.",
      streak,
      30,
    ),
    medal(
      "water1",
      "💧",
      "Hidratado",
      "Bateu a meta de água pela primeira vez.",
      waterDays,
      1,
    ),
    medal(
      "water7",
      "🌊",
      "Fonte de água",
      "Bateu a meta de água em 7 dias.",
      waterDays,
      7,
    ),
    medal(
      "diary",
      "📒",
      "Diário em dia",
      "Fechou 7 dias no diário.",
      closed,
      7,
    ),
    medal(
      "athlete",
      "🏃",
      "Atleta da semana",
      "150 min de exercício em 7 dias.",
      weekMinutes,
      150,
    ),
    medal(
      "kg1",
      "⚖️",
      "Primeiro quilo",
      "1 kg na direção da sua meta.",
      moved,
      1,
    ),
    medal(
      "kg5",
      "🚀",
      "Cinco quilos",
      "5 kg na direção da sua meta.",
      moved,
      5,
    ),
    medal(
      "goal",
      "🥇",
      "Meta alcançada",
      "Chegou ao peso desejado.",
      reached ? 1 : 0,
      1,
    ),
  ];
}

/**
 * Humor do mascote. `body` < 1 é mais magrinho, > 1 mais cheinho: média do
 * consumo sobre a meta nos últimos 7 dias com alimentação registrada.
 */
export function mascotMood(state: State, date: string) {
  const goal = waterGoal(weightAtDate(state, date));
  const water = goal ? waterOn(state, date) / goal : 1;
  const ratios = lastDays(7)
    .map((d) => dailyBudget(state, d))
    .filter((b) => b.ready && b.foodCount > 0)
    .map((b) => (b.ready ? b.consumed / b.available : 1));
  const eating = ratios.length
    ? ratios.reduce((a, b) => a + b, 0) / ratios.length
    : 1;
  const done = dailyMissions(state, date).filter((m) => m.done).length;
  const thirsty = !!goal && water < 0.5;
  const mood = thirsty
    ? "thirsty"
    : done >= 3
      ? "happy"
      : eating > 1.1
        ? "full"
        : eating < 0.75 && ratios.length > 0
          ? "hungry"
          : "ok";
  return {
    mood,
    body: Math.max(0.8, Math.min(1.25, 1 + (eating - 1) * 0.8)),
    water: Math.min(1, water),
    message: {
      thirsty: "Estou com sede! Bora beber água?",
      happy: "Que dia! Estou muito feliz com você.",
      full: "Ufa, comi demais esses dias… vamos voltar para a meta?",
      hungry: "Estou com fome! Lembre de comer o suficiente.",
      ok: "Estou bem! Vamos completar as missões de hoje?",
    }[mood],
  } as const;
}

/** Metas do dia para a lontra: água, calorias sem passar e exercício. */
export function dayGoals(state: State, date: string) {
  const goal = waterGoal(weightAtDate(state, date));
  const b = dailyBudget(state, date);
  return {
    date,
    water: !!goal && waterOn(state, date) >= goal,
    calories: b.ready && b.foodCount > 0 && b.consumed <= b.available,
    exercise: state.exercises.some((e) => e.date === date),
  };
}
export type DayGoals = ReturnType<typeof dayGoals>;

/**
 * Forma da lontra (0 = gordinha e desanimada, 1 = magra e forte): metas
 * cumpridas pela dupla nos últimos 7 dias. Sem dupla, conta só a pessoa.
 */
export function otterFitness(people: DayGoals[][]) {
  const days = lastDays(7);
  if (!people.length) return 0;
  let done = 0;
  for (const goals of people)
    for (const d of days) {
      const g = goals.find((x) => x.date === d);
      if (g) done += +g.water + +g.calories + +g.exercise;
    }
  return done / (people.length * days.length * 3);
}

/**
 * Bichinho que evolui com o nível: ovo (1–5 parado, 6–9 tremendo e
 * rachando), a Pipoca nasce no 10 e cresce até o 20; no 21 vem um ovo de
 * crocodilo (21–25 parado, 26–29 balançando), o Tuca nasce no 30 e cresce
 * até o 40.
 */
export type PetStage = {
  line: "chick" | "croc";
  phase: "egg" | "young" | "adult";
  /** 0 = acabou de nascer, 1 = adulto. */
  growth: number;
  /** Rachaduras no ovo (0 a 4). */
  cracks: number;
  motion: "still" | "shake" | "wobble" | "idle";
  name: string;
  label: string;
};
export const PET_NAMES = { chick: "Pipoca", croc: "Tuca" } as const;

export function petStage(level: number): PetStage {
  const egg = (line: PetStage["line"], start: number): PetStage => {
    const shaking = level >= start + 5;
    return {
      line,
      phase: "egg",
      growth: 0,
      cracks: shaking ? Math.min(4, level - (start + 4)) : 0,
      motion: shaking ? (line === "chick" ? "shake" : "wobble") : "still",
      name: line === "chick" ? "Ovo" : "Ovo de crocodilo",
      label: shaking ? "Está quase nascendo!" : "Cuide bem do ovo.",
    };
  };
  const born = (line: PetStage["line"], at: number): PetStage => {
    const growth = Math.min(1, (level - at) / 10);
    return {
      line,
      phase: growth >= 1 ? "adult" : "young",
      growth,
      cracks: 0,
      motion: "idle",
      name: PET_NAMES[line],
      label:
        growth >= 1
          ? line === "chick"
            ? "Virou uma galinha linda!"
            : "Um crocodilo adulto e forte!"
          : `Crescendo: ${Math.round(growth * 100)}%`,
    };
  };
  if (level < 10) return egg("chick", 1);
  if (level <= 20) return born("chick", 10);
  if (level < 30) return egg("croc", 21);
  return born("croc", 30);
}

/** Fases da coleção ("Meus bichinhos"): nível em que cada uma aparece. */
export const PET_PHASES = [
  { level: 1, line: "chick", label: "Ovo" },
  { level: 10, line: "chick", label: "Pipoca filhote" },
  { level: 15, line: "chick", label: "Pipoca jovem" },
  { level: 20, line: "chick", label: "Pipoca adulta" },
  { level: 21, line: "croc", label: "Ovo de crocodilo" },
  { level: 30, line: "croc", label: "Tuca filhote" },
  { level: 35, line: "croc", label: "Tuca jovem" },
  { level: 40, line: "croc", label: "Tuca adulto" },
] as const;
