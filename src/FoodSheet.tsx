import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { RiChat3Line, RiCheckLine } from "react-icons/ri";
import MealPhoto from "./MealPhoto";
import Sheet from "./Sheet";
import { reopenDay } from "./energy";
import { today, validState, type Food, type State } from "./domain";
import { supabase } from "./supabase";

const kcal = (n: number | null) =>
  n === null
    ? "—"
    : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kcal`;

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
    setBusy(true);
    setError("");
    const id = ++estimateId.current;
    try {
      const { data, error } = await supabase.functions.invoke("coach", {
        body: { action: "estimate-food", name: name.trim() },
      });
      if (id !== estimateId.current) return;
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
                      source: "ai" as const,
                      note: (
                        "Estimado pela foto do prato. " + note
                      ).slice(0, 500),
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
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Gramas</span>
                  <input
                    className="input"
                    type="number"
                    min="0.1"
                    max="10000"
                    step="any"
                    required
                    value={grams}
                    onChange={(e) => {
                      setGrams(e.target.value);
                      setGramsFromAi(false);
                    }}
                    placeholder="Ou deixe a IA estimar"
                  />
                  {gramsFromAi && (
                    <span className="hint block">
                      Peso médio estimado
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="label">kcal por 100 g</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="900"
                    step="any"
                    value={per100}
                    onChange={(e) => {
                      setPer100(e.target.value);
                      setSource("label");
                      setNote("");
                    }}
                    placeholder="Do rótulo"
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
                  Não pesou? Escreva a quantidade (ex.: "3 ovos cozidos",
                  "2 fatias de pão de forma") e a IA estima o peso médio e
                  as calorias. A IA recebe só a descrição. Prefira o
                  rótulo e a balança quando houver.
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </Sheet>
  );
}
