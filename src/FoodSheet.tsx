import NumberField from "./NumberField";
import {
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { RiChat3Line, RiCheckLine } from "react-icons/ri";
import MealPhoto from "./MealPhoto";
import Sheet from "./Sheet";
import { reopenDay } from "./energy";
import {
  foodUnit,
  kcal,
  looksLiquid,
  today,
  validState,
  type Food,
  type State,
} from "./domain";
import { AI_OFFLINE, supabase } from "./supabase";
import Choice from "./Choice";

// Estimativas já feitas ficam no aparelho: o mesmo alimento descrito do
// mesmo jeito volta na hora, sem chamar a IA de novo.
// v2: estimativas feitas antes da tabela de medidas caseiras (copo
// americano = 190 ml etc.) não são reaproveitadas.
const CACHE_KEY = "ritmo-food-estimates-v2";
const MAX_CACHED = 300;
type Estimate = {
  kcalPer100g: number;
  portionGrams: number | null;
  liquid?: boolean;
  note: string;
};
const cacheKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");
function readCache(): Record<string, Estimate> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function cachedEstimate(name: string) {
  return readCache()[cacheKey(name)] ?? null;
}
function saveEstimate(name: string, e: Estimate) {
  try {
    const entries = Object.entries(readCache()).filter(
      ([k]) => k !== cacheKey(name),
    );
    entries.push([cacheKey(name), e]);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(Object.fromEntries(entries.slice(-MAX_CACHED))),
    );
  } catch {
    /* sem espaço: só não guarda */
  }
}

/**
 * Registrar ou editar alimento: foto do prato, voz ou à mão (com estimativa
 * da IA). Usado no Diário e em Registros.
 */
export default function FoodSheet({
  state,
  setState,
  date: initialDate,
  food: initial,
  onClose,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  /** Data sugerida para um alimento novo. */
  date: string;
  /** Alimento em edição. */
  food?: Food;
  onClose: () => void;
}) {
  const food = initial;
  const estimateId = useRef(0);
  const [reviewing, setReviewing] = useState(false);
  const editing = food?.id ?? null;
  const [date, setDate] = useState(food?.date ?? initialDate);
  const [name, setName] = useState(food?.name ?? "");
  const [grams, setGrams] = useState(food ? String(food.grams) : "");
  const [gramsFromAi, setGramsFromAi] = useState(false);
  const [unit, setUnit] = useState<"g" | "ml">(food ? foodUnit(food) : "g");
  const [per100, setPer100] = useState(
    food?.kcalPer100g == null ? "" : String(food.kcalPer100g),
  );
  const [source, setSource] = useState<Food["source"]>(
    food?.source ?? "pending",
  );
  const [note, setNote] = useState(food?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function estimate() {
    if (!supabase || busy) return;
    const cached = cachedEstimate(name);
    if (!cached && !navigator.onLine) return setError(AI_OFFLINE);
    setBusy(true);
    setError("");
    const id = ++estimateId.current;
    try {
      const { data, error } = cached
        ? { data: cached, error: null }
        : await supabase.functions.invoke("coach", {
            body: { action: "estimate-food", name: name.trim() },
          });
      if (id !== estimateId.current) return;
      if (!error && !cached && typeof data?.kcalPer100g === "number")
        saveEstimate(name, data);
      if (!error && data?.kcalPer100g === null) {
        setError(
          typeof data.note === "string"
            ? data.note
            : "Especifique o preparo do alimento.",
        );
        return;
      }
      if (
        error ||
        typeof data?.kcalPer100g !== "number" ||
        !Number.isFinite(data.kcalPer100g) ||
        data.kcalPer100g < 0 ||
        data.kcalPer100g > 900
      )
        throw Error();
      setPer100(String(data.kcalPer100g));
      setSource("ai");
      setUnit(
        (typeof data.liquid === "boolean" ? data.liquid : looksLiquid(name))
          ? "ml"
          : "g",
      );
      // Sem balança: usa o peso médio das unidades descritas ("3 ovos"),
      // sem sobrescrever gramas que a pessoa pesou.
      if (
        typeof data.portionGrams === "number" &&
        data.portionGrams > 0 &&
        (grams.trim() === "" || gramsFromAi)
      ) {
        setGrams(String(data.portionGrams));
        setGramsFromAi(true);
      }
      setNote(
        typeof data.note === "string"
          ? data.note.slice(0, 500)
          : "Estimativa da IA. Confira o preparo e o rótulo.",
      );
    } catch {
      setError(
        "Não foi possível estimar com a IA. Você pode informar as kcal por 100 g do rótulo ou salvar como pendente.",
      );
    } finally {
      setBusy(false);
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const item: Food = {
      id: editing ?? crypto.randomUUID(),
      date,
      name: name.trim(),
      grams: Number(grams),
      kcalPer100g: per100.trim() === "" ? null : Number(per100),
      unit,
      source:
        per100.trim() === "" ? "pending" : source === "ai" ? "ai" : "label",
      note,
    };
    const reopened = reopenDay(state, date);
    const next = {
      ...state,
      foods: [...(state.foods ?? []).filter((f) => f.id !== item.id), item],
      // Mudou de dia: os dois dias reabrem.
      completedDays: initial
        ? reopened.filter((d) => d !== initial.date)
        : reopened,
    };
    if (date > today()) {
      setError("Escolha uma data até hoje.");
      return;
    }
    if (!validState(next)) {
      setError("Confira o alimento, as gramas e as calorias informadas.");
      return;
    }
    setState(next);
    onClose();
  }
  return (
    <Sheet
      title={editing ? "Editar alimento" : "Registrar alimento"}
      onClose={onClose}
    >
      {!editing && (
        <>
          <MealPhoto
            disabled={busy || !supabase}
            onAdd={(items, note) => {
              onClose();
              setState((s) => ({
                ...s,
                foods: [
                  ...(s.foods ?? []),
                  ...items.map((x) => ({
                    id: crypto.randomUUID(),
                    date,
                    name: x.name,
                    grams: x.grams,
                    kcalPer100g: x.kcalPer100g,
                    unit: x.liquid ? ("ml" as const) : ("g" as const),
                    source: "ai" as const,
                    note: ("Estimado pela foto do prato. " + note).slice(
                      0,
                      500,
                    ),
                  })),
                ],
                completedDays: reopenDay(s, date),
              }));
            }}

            onReviewing={setReviewing}
          />
          {!reviewing && (
            <p className="my-5 flex items-center gap-3 text-xs font-medium tracking-wide text-ink-400 uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              ou registre à mão
            </p>
          )}
        </>
      )}
      {!reviewing && (
        <form onSubmit={save}>
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <label className="block">
              <span className="label">Data</span>
              <input
                className="input"
                type="date"
                max={today()}
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Alimento e preparo</span>
              <input
                className="input"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (source === "ai") {
                    if (gramsFromAi) setGrams("");
                    setGramsFromAi(false);
                    setPer100("");
                    setSource("pending");
                    setNote("");
                  }
                }}
                maxLength={160}
                required
                placeholder="Ex.: arroz branco cozido, sem óleo"
              />
            </label>
            <Choice
              label="Tipo de alimento"
              value={unit}
              onChange={setUnit}
              options={[
                { id: "g", label: "Sólido (g)" },
                { id: "ml", label: "Líquido (ml)" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Quantidade</span>
                <NumberField
                  unit={unit}
                  min={0.1}
                  max={10000}
                  required
                  value={grams === "" ? null : Number(grams)}
                  onChange={(v) => {
                    setGrams(v === null ? "" : String(v));
                    setGramsFromAi(false);
                  }}
                  placeholder="0"
                />
                {gramsFromAi && (
                  <span className="hint block">
                    {unit === "ml"
                      ? "Volume médio estimado"
                      : "Peso médio estimado"}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="label">Calorias por 100 {unit}</span>
                <NumberField
                  unit="kcal"
                  decimals={1}
                  min={0}
                  max={900}
                  value={per100 === "" ? null : Number(per100)}
                  onChange={(v) => {
                    setPer100(v === null ? "" : String(v));
                    setSource("label");
                    setNote("");
                  }}
                  placeholder="0,0"
                />
              </label>
            </div>
            <div>
              <button
                type="button"
                className="btn-secondary"
                disabled={!name.trim() || !supabase}
                onClick={estimate}
              >
                <RiChat3Line size={18} />
                {busy ? "Estimando…" : "Estimar com IA"}
              </button>
              <p className="hint">
                Não pesou? Escreva a quantidade (ex.: "3 ovos cozidos", "1 copo
                de suco de laranja") e a IA estima a quantidade média, se é
                sólido ou líquido, e as calorias. A IA recebe só a descrição.
                Prefira o rótulo e a balança quando houver.
              </p>
            </div>
            {note && (
              <p className="rounded-lg border border-line bg-white p-3 text-sm text-ink-700">
                {note}
              </p>
            )}
            <p className="text-sm text-ink-700">
              Nesta porção:{" "}
              <strong className="font-semibold text-ink-900 tabular-nums">
                {per100 !== "" && grams !== ""
                  ? kcal((Number(per100) * Number(grams)) / 100)
                  : "calorias pendentes"}
              </strong>{" "}
              {source === "ai" ? "· estimativa da IA" : ""}
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800"
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary">
                {editing ? "Salvar alteração" : "Salvar alimento"}
                <RiCheckLine size={18} />
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </Sheet>
  );
}
