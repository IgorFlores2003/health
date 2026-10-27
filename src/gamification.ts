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

/** Quanto vale cada coisa (mostrado no app em "Como ganhar XP"). */
export const XP = {
  mission: 20,
  /** Bônus por completar todas as missões do dia. */
  fullDay: 30,
  like: 3,
  comment: 5,
  post: 15,
} as const;
/** Quantas ações sociais por dia rendem XP (evita curtir/descurtir à toa). */
export const SOCIAL_LIMIT = { like: 5, comment: 5, post: 2 } as const;
export type SocialKind = keyof typeof SOCIAL_LIMIT;

/**
 * XP para passar do nível n para o n+1: 30, 40, 50… Começa rápido (dois
 * dias bons levam do nível 1 ao 5) e vai ficando mais demorado.
 */
export const xpToPass = (level: number) => 20 + 10 * level;

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

/** Ações sociais do dia que ainda contam XP (dentro do limite diário). */
export function socialToday(state: State, date: string, kind: SocialKind) {
  return (state.social ?? []).filter((x) => x.date === date && x.kind === kind)
    .length;
}

/** XP ganho num dia, separado por origem. */
export function dayXp(state: State, date: string) {
  const done = dailyMissions(state, date).filter((m) => m.done).length;
  const missions = done * XP.mission + (done === 5 ? XP.fullDay : 0);
  const social = (Object.keys(SOCIAL_LIMIT) as SocialKind[]).reduce(
    (sum, k) =>
      sum + Math.min(SOCIAL_LIMIT[k], socialToday(state, date, k)) * XP[k],
    0,
  );
  return { missions, social, total: missions + social };
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
  const days = new Set([
    ...activeDays(state),
    ...(state.completedDays ?? []),
    ...(state.social ?? []).map((x) => x.date),
  ]);
  const xp = [...days].reduce((sum, d) => sum + dayXp(state, d).total, 0);
  let level = 1;
  let left = xp;
  while (left >= xpToPass(level)) left -= xpToPass(level++);
  return {
    xp,
    level,
    /** Fração do nível atual já completada. */
    progress: left / xpToPass(level),
    toNext: xpToPass(level) - left,
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
 * Bichinho que evolui com o nível, como num jogo: cada forma é um bicho
 * diferente (ovo → pintinho → galeto → galo; depois ovo de crocodilo →
 * crocodilinho → crocodilo jovem → crocodilão) e, dentro da forma, cada
 * nível muda algum detalhe (tamanho, penas, crista, rachaduras…).
 */
export const PET_FORMS = [
  { line: "chick", form: "egg", from: 1, label: "Ovo" },
  { line: "chick", form: "baby", from: 5, label: "Pintinho" },
  { line: "chick", form: "young", from: 10, label: "Galeto" },
  { line: "chick", form: "adult", from: 16, label: "Galo" },
  { line: "croc", form: "egg", from: 23, label: "Ovo de crocodilo" },
  { line: "croc", form: "baby", from: 27, label: "Crocodilinho" },
  { line: "croc", form: "young", from: 32, label: "Crocodilo jovem" },
  { line: "croc", form: "adult", from: 38, label: "Crocodilão" },
] as const;
export type PetStage = {
  line: "chick" | "croc";
  form: "egg" | "baby" | "young" | "adult";
  /** Quantos níveis já passou dentro da forma (0 = acabou de evoluir). */
  step: number;
  /** 0 = acabou de evoluir, 1 = no máximo da forma. */
  growth: number;
  /** Rachaduras no ovo (0 a 4). */
  cracks: number;
  motion: "still" | "shake" | "wobble" | "idle";
  name: string;
  /** Nome da forma (Pintinho, Galeto…). */
  formLabel: string;
  label: string;
};
export const PET_NAMES = { chick: "Pipoca", croc: "Tuca" } as const;

const FLAVOR = {
  chick: { baby: "Piu piu!", young: "Ficando forte!", adult: "Cocoricó!" },
  croc: { baby: "Nhac!", young: "Cada dia maior!", adult: "O rei do rio!" },
} as const;

export function petStage(level: number): PetStage {
  let i = 0;
  while (PET_FORMS[i + 1] && level >= PET_FORMS[i + 1].from) i += 1;
  const f = PET_FORMS[i];
  const next = PET_FORMS[i + 1];
  // A última forma continua mudando por mais 6 níveis.
  const length = (next?.from ?? f.from + 7) - f.from - 1;
  const step = Math.max(0, level - f.from);
  const growth = Math.min(1, step / Math.max(1, length));
  if (f.form === "egg")
    return {
      line: f.line,
      form: "egg",
      step,
      growth,
      cracks: [0, 1, 2, 4][Math.min(3, step)],
      motion: step < 2 ? "still" : f.line === "chick" ? "shake" : "wobble",
      name: f.label,
      formLabel: f.label,
      label: step < 2 ? "Cuide bem do ovo." : "Está quase nascendo!",
    };
  return {
    line: f.line,
    form: f.form,
    step,
    growth,
    cracks: 0,
    motion: "idle",
    name: PET_NAMES[f.line],
    formLabel: f.label,
    label: FLAVOR[f.line][f.form],
  };
}

/** Próxima evolução (nível e forma), ou nada depois do crocodilão. */
export function nextEvolution(level: number) {
  return PET_FORMS.find((f) => f.from > level) ?? null;
}

/** Fases da coleção ("Meus bichinhos"): nível em que cada uma aparece. */
export const PET_PHASES = PET_FORMS.map((f) => ({
  level: f.from,
  line: f.line,
  label: f.label,
}));
