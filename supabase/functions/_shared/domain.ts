export type Profile = {
  name: string;
  height: number;
  age: number;
  gender: string;
  formulaSex: "female" | "male";
  activity: number;
  /** Caminho no bucket de Storage; a imagem nunca fica no snapshot. */
  photo?: string;
};
export type Weight = {
  id: string;
  date: string;
  value: number;
  /** Caminhos no bucket de Storage (foto da balança). */
  photos?: string[];
};
export type Exercise = {
  id: string;
  date: string;
  type: string;
  minutes: number;
  intensity: "Leve" | "Moderada" | "Intensa";
  distanceKm?: number;
  /** Ganho de elevação do treino, em metros. */
  elevationM?: number;
  activeCalories?: number;
  /** Caminhos no bucket de Storage (fotos do treino/corrida). */
  photos?: string[];
};
export type Pressure = {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  /** Batimentos por minuto medidos pelo aparelho. */
  pulse?: number;
  /** Caminhos no bucket de Storage (foto do aparelho de pressão). */
  photos?: string[];
};
export type Food = {
  id: string;
  date: string;
  name: string;
  grams: number;
  kcalPer100g: number | null;
  source: "label" | "ai" | "pending";
  note?: string;
};
export type Water = {
  id: string;
  date: string;
  ml: number;
};
/** Copo padrão e lembretes de água (agendados no aparelho). */
export type Hydration = {
  cupMl: number;
  reminders: boolean;
  everyMinutes: number;
  startHour: number;
  endHour: number;
};
export const defaultHydration: Hydration = {
  cupMl: 250,
  reminders: false,
  everyMinutes: 90,
  startHour: 8,
  endHour: 22,
};
export type State = {
  foods?: Food[];
  water?: Water[];
  hydration?: Hydration;
  completedDays?: string[];
  profileReviewed?: boolean;
  profile: Profile;
  weights: Weight[];
  exercises: Exercise[];
  pressures: Pressure[];
  goal: number;
  intake: number;
  /** Cor do app escolhida em Perfil (#rrggbb). */
  accent?: string;
};
export const initial: State = {
  foods: [],
  water: [],
  completedDays: [],
  profileReviewed: false,
  profile: {
    name: "",
    height: 170,
    age: 30,
    gender: "Não informado",
    formulaSex: "female",
    activity: 1.2,
  },
  weights: [],
  exercises: [],
  pressures: [],
  goal: 0,
  intake: 0,
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function basal(weight: number, p: Profile) {
  if (
    !Number.isFinite(weight) ||
    weight < 20 ||
    weight > 400 ||
    p.height < 100 ||
    p.height > 250 ||
    p.age < 18 ||
    p.age > 100
  )
    return null;
  return Math.round(
    10 * weight +
      6.25 * p.height -
      5 * p.age +
      (p.formulaSex === "male" ? 5 : -161),
  );
}
/** Meta de água: 35 ml por kg, arredondada a 50 ml. */
export function waterGoal(weight: number) {
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) return null;
  return Math.round((weight * 35) / 50) * 50;
}
/**
 * Menor meta de consumo aceita: nunca abaixo do basal estimado, nem abaixo
 * de 1.200 kcal (coeficiente feminino) ou 1.500 kcal (masculino), limites
 * usuais abaixo dos quais dietas só com acompanhamento profissional.
 */
export function minimumIntake(bmr: number | null, p: Profile) {
  const floor = p.formulaSex === "male" ? 1500 : 1200;
  return Math.max(floor, bmr ?? 0);
}
export type GoalDirection = "lose" | "gain" | "maintain";
/** Perder, ganhar ou manter, pelo peso desejado em relação ao atual. */
export function goalDirection(weight: number, goal: number): GoalDirection {
  if (!(goal > 0) || !(weight > 0)) return "maintain";
  return goal < weight ? "lose" : goal > weight ? "gain" : "maintain";
}
/** Ajuste diário sobre o gasto: −500 kcal para perder, +300 kcal para ganhar. */
export const GOAL_ADJUST: Record<GoalDirection, number> = {
  lose: -500,
  gain: 300,
  maintain: 0,
};
/**
 * Meta de consumo do dia, sempre calculada pelo app: gasto estimado do dia
 * mais o ajuste do objetivo, arredondada a 10 kcal e nunca abaixo de
 * minimumIntake.
 */
export function intakeTarget(
  spend: number,
  weight: number,
  goal: number,
  bmr: number | null,
  p: Profile,
) {
  const direction = goalDirection(weight, goal);
  const raw = spend + GOAL_ADJUST[direction];
  const floor = minimumIntake(bmr, p);
  return {
    direction,
    floor,
    /** O ajuste para perder bateu no mínimo seguro. */
    limited: raw < floor,
    target: Math.round(Math.max(raw, floor) / 10) * 10,
  };
}
/**
 * Dias estimados até o peso desejado com um consumo constante: precisa de
 * déficit para perder ou superávit para ganhar, entre 100 e 1.000 kcal/dia.
 */
export function projection(
  weight: number,
  goal: number,
  expenditure: number,
  intake: number,
) {
  if (goal <= 0 || goal === weight || intake <= 0) return null;
  const needed = goal > weight ? intake - expenditure : expenditure - intake;
  if (needed < 100 || needed > 1000) return null;
  return Math.ceil((Math.abs(weight - goal) * 7700) / needed);
}
/** Limite aceito ao validar dados já salvos (registros antigos podiam ter 6). */
export const MAX_EXERCISE_PHOTOS = 6;
/** Limite de fotos por registro na hora de escolher. */
export const MAX_PHOTOS = 5;
/** "01:05" → 65 minutos; null se o texto não for hh:mm válido. */
export function parseDuration(text: string) {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
/** 65 → "01:05" (formato do campo de duração). */
export function formatDuration(minutes: number) {
  const m = Math.round(minutes);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
/** 34 → "34 min", 65 → "1h05" (para listas). */
export function durationLabel(minutes: number) {
  const m = Math.round(minutes);
  return m < 60
    ? `${m} min`
    : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}
export const EXERCISE_TYPES = [
  "Caminhada",
  "Musculação",
  "Corrida",
  "Ciclismo",
  "Natação",
  "Yoga",
  "Pilates",
  "Dança",
  "Outro",
];
/** `<user uuid>/<profile|exercises>/<arquivo>.<jpg|png|webp>` */
export function isPhotoPath(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length <= 200 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(profile|exercises|pressures|weights)\/[0-9a-z_-]+(\/[0-9a-z_-]+)?\.(jpg|png|webp)$/.test(
      v,
    )
  );
}
export const byDate = <T extends { date: string }>(items: T[]) =>
  [...items].sort((a, b) => a.date.localeCompare(b.date));
export const currentWeight = (s: State) => byDate(s.weights).at(-1)?.value ?? 0;
export function validState(v: unknown): v is State {
  if (!v || typeof v !== "object") return false;
  const s = v as State;
  const p = s.profile;
  const n = (x: unknown, min: number, max: number) =>
    typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
  const base = (x: { id: string; date: string }) =>
    x &&
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.date);
  return (
    (s.profileReviewed === undefined ||
      typeof s.profileReviewed === "boolean") &&
    (s.completedDays === undefined ||
      (Array.isArray(s.completedDays) &&
        s.completedDays.every(
          (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d),
        ))) &&
    (s.water === undefined ||
      (Array.isArray(s.water) &&
        s.water.every((x) => base(x) && n(x.ml, 1, 5000)))) &&
    (s.hydration === undefined ||
      (!!s.hydration &&
        n(s.hydration.cupMl, 50, 2000) &&
        typeof s.hydration.reminders === "boolean" &&
        n(s.hydration.everyMinutes, 15, 480) &&
        Number.isInteger(s.hydration.startHour) &&
        Number.isInteger(s.hydration.endHour) &&
        n(s.hydration.startHour, 0, 23) &&
        n(s.hydration.endHour, 1, 24) &&
        s.hydration.startHour < s.hydration.endHour)) &&
    (s.foods === undefined ||
      (Array.isArray(s.foods) &&
        s.foods.every(
          (x) =>
            base(x) &&
            typeof x.name === "string" &&
            x.name.trim().length > 0 &&
            x.name.length <= 160 &&
            n(x.grams, 0.1, 10000) &&
            (x.kcalPer100g === null || n(x.kcalPer100g, 0, 900)) &&
            ["label", "ai", "pending"].includes(x.source) &&
            (x.source === "pending") === (x.kcalPer100g === null) &&
            (x.note === undefined ||
              (typeof x.note === "string" && x.note.length <= 500)),
        ))) &&
    !!p &&
    typeof p.name === "string" &&
    typeof p.gender === "string" &&
    (p.photo === undefined || isPhotoPath(p.photo)) &&
    n(p.height, 100, 250) &&
    n(p.age, 18, 100) &&
    ["male", "female"].includes(p.formulaSex) &&
    [1.2, 1.375, 1.55, 1.725].includes(p.activity) &&
    n(s.goal, 0, 400) &&
    (s.accent === undefined ||
      (typeof s.accent === "string" && /^#[0-9a-f]{6}$/i.test(s.accent))) &&
    n(s.intake, 0, 10000) &&
    Array.isArray(s.weights) &&
    s.weights.every(
      (x) =>
        base(x) &&
        n(x.value, 20, 400) &&
        (x.photos === undefined ||
          (Array.isArray(x.photos) &&
            x.photos.length <= MAX_EXERCISE_PHOTOS &&
            x.photos.every(isPhotoPath))),
    ) &&
    Array.isArray(s.exercises) &&
    s.exercises.every(
      (x) =>
        base(x) &&
        typeof x.type === "string" &&
        x.type.length > 0 &&
        x.type.length <= 80 &&
        n(x.minutes, 0, 600) &&
        (x.minutes > 0 || x.activeCalories !== undefined) &&
        (x.distanceKm === undefined || n(x.distanceKm, 0.01, 1000)) &&
        (x.elevationM === undefined || n(x.elevationM, 0, 10000)) &&
        (x.activeCalories === undefined || n(x.activeCalories, 0, 10000)) &&
        ["Leve", "Moderada", "Intensa"].includes(x.intensity) &&
        (x.photos === undefined ||
          (Array.isArray(x.photos) &&
            x.photos.length <= MAX_EXERCISE_PHOTOS &&
            x.photos.every(isPhotoPath))),
    ) &&
    Array.isArray(s.pressures) &&
    s.pressures.every(
      (x) =>
        base(x) &&
        n(x.systolic, 50, 300) &&
        n(x.diastolic, 30, 200) &&
        x.systolic > x.diastolic &&
        (x.pulse === undefined || n(x.pulse, 20, 250)) &&
        (x.photos === undefined ||
          (Array.isArray(x.photos) &&
            x.photos.length <= MAX_EXERCISE_PHOTOS &&
            x.photos.every(isPhotoPath))),
    )
  );
}
