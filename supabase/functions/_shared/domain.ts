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
export type Weight = { id: string; date: string; value: number };
export type Exercise = {
  id: string;
  date: string;
  type: string;
  minutes: number;
  intensity: "Leve" | "Moderada" | "Intensa";
  distanceKm?: number;
  activeCalories?: number;
  /** Caminhos no bucket de Storage (fotos do treino/corrida). */
  photos?: string[];
};
export type Pressure = {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
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
export type State = {
  foods?: Food[];
  completedDays?: string[];
  profileReviewed?: boolean;
  profile: Profile;
  weights: Weight[];
  exercises: Exercise[];
  pressures: Pressure[];
  goal: number;
  intake: number;
};
export const initial: State = {
  foods: [],
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
export function projection(
  weight: number,
  goal: number,
  expenditure: number,
  intake: number,
) {
  const deficit = expenditure - intake;
  if (
    goal <= 0 ||
    goal >= weight ||
    intake <= 0 ||
    deficit < 100 ||
    deficit > 1000
  )
    return null;
  return Math.ceil(((weight - goal) * 7700) / deficit);
}
export const MAX_EXERCISE_PHOTOS = 6;
/** `<user uuid>/<profile|exercises>/<arquivo>.<jpg|png|webp>` */
export function isPhotoPath(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length <= 200 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(profile|exercises)\/[0-9a-z_-]+(\/[0-9a-z_-]+)?\.(jpg|png|webp)$/.test(
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
    n(s.intake, 0, 10000) &&
    Array.isArray(s.weights) &&
    s.weights.every((x) => base(x) && n(x.value, 20, 400)) &&
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
        x.systolic > x.diastolic,
    )
  );
}
