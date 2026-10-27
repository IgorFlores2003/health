import { today } from "./domain";
import { photoBase64 } from "./photos";
import { supabase } from "./supabase";

export type ExerciseReading = {
  type: string | null;
  minutes: number | null;
  distanceKm: number | null;
  elevationM: number | null;
  activeCalories: number | null;
  date: string | null;
  note: string;
};
export type ScaleReading = { weight: number | null; note: string };
export type MealReading = {
  /** liquid: quantidade em ml e kcal por 100 ml. */
  items: {
    name: string;
    grams: number;
    kcalPer100g: number;
    liquid?: boolean;
  }[];
  note: string;
};
export type PressureReading = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  note: string;
};

/** Envia a imagem reduzida para a IA ler os valores; nada é salvo no servidor. */
export async function readImage(
  kind: "exercise",
  file: File,
): Promise<ExerciseReading>;
export async function readImage(
  kind: "pressure",
  file: File,
): Promise<PressureReading>;
export async function readImage(kind: "meal", file: File): Promise<MealReading>;
export async function readImage(
  kind: "scale",
  file: File,
): Promise<ScaleReading>;
export async function readImage(
  kind: "exercise" | "pressure" | "meal" | "scale",
  file: File,
) {
  if (!supabase) throw Error("Conecte-se para ler a imagem com a IA.");
  const { data, error } = await supabase.functions.invoke("coach", {
    body: {
      action: "read-image",
      kind,
      today: today(),
      image: await photoBase64(file),
    },
  });
  if (error || !data || typeof data.note !== "string")
    throw Error("Não foi possível ler a imagem. Preencha os campos à mão.");
  return data;
}

/** Preenche um campo não controlado do formulário. */
export function fill(
  form: HTMLFormElement | null,
  name: string,
  value: unknown,
) {
  const el = form?.elements.namedItem(name);
  if (
    value === null ||
    value === undefined ||
    (value === 0 && name === "duration")
  )
    return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    el.value = String(value);
    // Campos com máscara (NumberField) atualizam o texto visível.
    el.dispatchEvent(new Event("fill"));
    return true;
  }
  return false;
}
