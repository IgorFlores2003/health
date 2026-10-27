import { PhotoStrip, removePhotos } from "./photos";
import CalorieBudget from "./CalorieBudget";
import {
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
  type FormEvent,
} from "react";
import {
  RiAddLine,
  RiChat3Line,
  RiCheckLine,
  RiDeleteBin6Line,
  RiPencilLine,
  RiRestaurant2Line,
} from "react-icons/ri";
import { confirmDialog } from "./confirm";
import MealPhoto from "./MealPhoto";
import Sheet from "./Sheet";
import { WaterCard } from "./Water";
import { dailyEnergy, foodCalories, reopenDay } from "./energy";
import {
  durationLabel,
  today,
  validState,
  type State,
  type Food,
} from "./domain";
import { supabase } from "./supabase";
export const balanceLabels = {
  incomplete: "Registros incompletos",
  deficit: "Déficit estimado",
  surplus: "Superávit estimado",
  near_balance: "Próximo do equilíbrio",
};
const kcal = (n: number | null) =>
  n === null ? "—" : `${n.toLocaleString("pt-BR")} kcal`;
export default function DailyDiary({
  state,
  setState,
  date,
  setDate,
  onExercise,
  onPressure,
  onAnalyze,
  onProfile,
  onWeight,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  date: string;
  setDate: (s: string) => void;
  onExercise: (id?: string) => void;
  onPressure: (id?: string) => void;
  onAnalyze: () => void;
  onProfile: () => void;
  onWeight: () => void;
}) {
  const day = dailyEnergy(state, date);
  const pressures = state.pressures.filter((p) => p.date === date);
  const estimateId = useRef(0);
  const [showFood, setShowFood] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const [gramsFromAi, setGramsFromAi] = useState(false);
  const [per100, setPer100] = useState("");
  const [source, setSource] = useState<Food["source"]>("pending");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open(food?: Food) {
    estimateId.current += 1;
    setEditing(food?.id ?? null);
    setName(food?.name ?? "");
    setGrams(food ? String(food.grams) : "");
    setGramsFromAi(false);
    setPer100(food?.kcalPer100g == null ? "" : String(food.kcalPer100g));
    setSource(food?.source ?? "pending");
    setNote(food?.note ?? "");
    setError("");
    setShowFood(true);
  }
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
    const food: Food = {
      id: editing ?? crypto.randomUUID(),
      date,
      name: name.trim(),
      grams: Number(grams),
      kcalPer100g: per100.trim() === "" ? null : Number(per100),
      source:
        per100.trim() === "" ? "pending" : source === "ai" ? "ai" : "label",
      note,
    };
    const next = {
      ...state,
      foods: [...(state.foods ?? []).filter((f) => f.id !== food.id), food],
      completedDays: reopenDay(state, date),
    };
    if (!validState(next)) {
      setError("Confira o alimento, as gramas e as calorias informadas.");
      return;
    }
    setState(next);
    setShowFood(false);
  }
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">
            Diário do dia
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Registre o que comeu e os exercícios para ver o balanço estimado.
          </p>
        </div>
        <label className="block sm:w-52">
          <span className="label">Data</span>
          <input
            className="input"
            aria-label="Dia do diário"
            type="date"
            max={today()}
            value={date}
            onChange={(e) => {
              if (e.target.value && e.target.value <= today()) {
                estimateId.current += 1;
                setDate(e.target.value);
                setShowFood(false);
              }
            }}
          />
        </label>
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CalorieBudget
          state={state}
          date={date}
          onProfile={onProfile}
          onWeight={onWeight}
        />
        <WaterCard state={state} setState={setState} date={date} />
      </div>
      <section className="card mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2 text-sm text-ink-500">
          <h2 className="text-base font-semibold text-ink-900">
            {balanceLabels[day.status]}
          </h2>
          <p>
            {day.complete
              ? `Diferença estimada: ${kcal(Math.abs(day.balance!))}. Valores aproximados; "próximo do equilíbrio" é uma diferença de até 100 kcal.`
              : "Ainda não dá para dizer se houve déficit. Registre todas as refeições, bebidas e exercícios e marque o dia como completo."}
          </p>
          {!state.profileReviewed && (
            <button className="btn-ghost -ml-2" onClick={onProfile}>
              Revise e salve seu perfil para calcular o gasto
            </button>
          )}
          {!day.weight && <p>Falta um registro de peso nessa data ou antes.</p>}
          {day.aiFoods > 0 && (
            <p>
              {day.aiFoods} alimento(s) usam estimativa da IA. Preparo, marca e
              ingredientes podem mudar as calorias.
            </p>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={onAnalyze}>
          <RiChat3Line size={18} /> Analisar meu dia
        </button>
      </section>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="card min-w-0">
          <div className="mb-4 flex flex-wrap items-start justify-end gap-3">
            <div className="mr-auto">
              <h2 className="text-base font-semibold">Alimentação</h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Inclua preparo, marca, molhos e bebidas.
              </p>
            </div>
            <div className="contents">
              <button
                className="btn-secondary"
                onClick={() => open()}
                disabled={busy}
              >
                <RiAddLine size={18} /> Alimento
              </button>
            </div>
          </div>
          {showFood && (
            <Sheet
              title={editing ? "Editar alimento" : "Registrar alimento"}
              onClose={() => setShowFood(false)}
            >
              {!editing && (
                <>
                  <MealPhoto
                    disabled={busy || !supabase}
                    onAdd={(items, note) => {
                      setShowFood(false);
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
                          step="0.1"
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
                          step="0.1"
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
                          ? kcal(
                              Math.round(
                                (Number(per100) * Number(grams)) / 100,
                              ),
                            )
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
                        onClick={() => setShowFood(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
            </Sheet>
          )}
          {!day.foods.length && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-4 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <RiRestaurant2Line size={20} />
              </span>
              <strong className="text-sm font-semibold">
                Nenhum alimento registrado
              </strong>
              <p className="text-sm text-ink-500">
                Informe nome e gramas. Use o rótulo ou peça uma estimativa à IA.
              </p>
              <button className="btn-ghost" onClick={() => open()}>
                <RiAddLine size={18} /> Registrar alimento
              </button>
            </div>
          )}
          <div>
            {day.foods.map((food) => (
              <div
                className="flex items-center justify-between gap-2 border-b border-line py-3 last:border-b-0"
                key={food.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-medium">
                    {food.name}
                  </strong>
                  <small className="mt-0.5 block text-[13px] text-ink-500">
                    {food.grams} g ·{" "}
                    {foodCalories(food) === null
                      ? "calorias pendentes"
                      : kcal(foodCalories(food))}{" "}
                    ·{" "}
                    {food.source === "ai"
                      ? "estimativa IA"
                      : food.source === "label"
                        ? "informado"
                        : "a preencher"}
                  </small>
                </div>
                <div className="flex shrink-0">
                  <button
                    className="icon-btn size-11"
                    aria-label={`Editar ${food.name}`}
                    onClick={() => open(food)}
                    disabled={busy}
                  >
                    <RiPencilLine size={18} />
                  </button>
                  <button
                    className="icon-btn size-11 hover:text-brand-600"
                    aria-label={`Excluir ${food.name}`}
                    onClick={async () => {
                      if (
                        await confirmDialog({
                          title: "Excluir alimento?",
                          message: `"${food.name}" sai do diário deste dia.`,
                          confirmLabel: "Excluir",
                          danger: true,
                        })
                      )
                        setState((s) => ({
                          ...s,
                          foods: (s.foods ?? []).filter(
                            (f) => f.id !== food.id,
                          ),
                          completedDays: reopenDay(s, date),
                        }));
                    }}
                  >
                    <RiDeleteBin6Line size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="grid min-w-0 content-start gap-4">
          <section className="card min-w-0">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Exercícios</h2>
                <p className="mt-0.5 text-sm text-ink-500">
                  Calorias informadas ou estimadas pela atividade.
                </p>
              </div>
              <button className="btn-secondary" onClick={() => onExercise()}>
                <RiAddLine size={18} /> Exercício
              </button>
            </div>
            {!day.exercises.length && (
              <p className="py-6 text-sm text-ink-500">
                Nenhum exercício nesse dia.
              </p>
            )}
            <div>
              {day.exercises.map((ex) => (
                <div
                  className="flex items-start justify-between gap-2 border-b border-line py-3 last:border-b-0"
                  key={ex.id}
                >
                  <div className="min-w-0">
                    <strong className="block text-sm font-medium">
                      {ex.type}
                    </strong>
                    <small className="mt-0.5 block text-[13px] text-ink-500">
                      {ex.minutes ? `${durationLabel(ex.minutes)} · ` : ""}
                      {ex.distanceKm ? `${ex.distanceKm} km · ` : ""}
                      {ex.calories === null
                        ? "calorias pendentes"
                        : kcal(ex.calories)}{" "}
                      · {ex.source}
                    </small>
                    <PhotoStrip
                      paths={
                        state.exercises.find((x) => x.id === ex.id)?.photos
                      }
                    />
                    {ex.calories === null && (
                      <small className="mt-1 block text-[13px] text-brand-700">
                        Informe as calorias ativas, ou um tipo compatível com
                        peso e duração.
                      </small>
                    )}
                  </div>
                  <div className="flex shrink-0">
                    <button
                      className="icon-btn size-11 hover:text-brand-600"
                      aria-label={`Editar ${ex.type}`}
                      onClick={() => onExercise(ex.id)}
                    >
                      <RiPencilLine size={18} />
                    </button>
                    <button
                      className="icon-btn size-11 hover:text-brand-600"
                      aria-label={`Excluir ${ex.type}`}
                      onClick={async () => {
                        if (
                          !(await confirmDialog({
                            title: "Excluir exercício?",
                            message:
                              "O exercício e as fotos dele serão apagados da sua conta.",
                            confirmLabel: "Excluir",
                            danger: true,
                          }))
                        )
                          return;
                        void removePhotos(
                          state.exercises.find((x) => x.id === ex.id)?.photos,
                        );
                        setState((s) => ({
                          ...s,
                          exercises: s.exercises.filter((x) => x.id !== ex.id),
                          completedDays: reopenDay(s, date),
                        }));
                      }}
                    >
                      <RiDeleteBin6Line size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="card min-w-0">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Pressão arterial</h2>
                <p className="mt-0.5 text-sm text-ink-500">
                  Medições do dia, com a foto do aparelho se quiser.
                </p>
              </div>
              <button className="btn-secondary" onClick={() => onPressure()}>
                <RiAddLine size={18} /> Pressão
              </button>
            </div>
            {!pressures.length && (
              <p className="py-6 text-sm text-ink-500">
                Nenhuma medição nesse dia.
              </p>
            )}
            <div>
              {pressures.map((p) => (
                <div
                  className="flex items-start justify-between gap-2 border-b border-line py-3 last:border-b-0"
                  key={p.id}
                >
                  <div className="min-w-0">
                    <strong className="block text-sm font-medium tabular-nums">
                      {p.systolic}/{p.diastolic} mmHg
                    </strong>
                    {p.pulse && (
                      <small className="mt-0.5 block text-[13px] text-ink-500">
                        {p.pulse} bpm
                      </small>
                    )}
                    <PhotoStrip paths={p.photos} />
                  </div>
                  <div className="flex shrink-0">
                    <button
                      className="icon-btn size-11 hover:text-brand-600"
                      aria-label="Editar medição"
                      onClick={() => onPressure(p.id)}
                    >
                      <RiPencilLine size={18} />
                    </button>
                    <button
                      className="icon-btn size-11 hover:text-brand-600"
                      aria-label="Excluir medição"
                      onClick={async () => {
                        if (
                          !(await confirmDialog({
                            title: "Excluir medição?",
                            message:
                              "A medição e as fotos dela serão apagadas da sua conta.",
                            confirmLabel: "Excluir",
                            danger: true,
                          }))
                        )
                          return;
                        void removePhotos(p.photos);
                        setState((s) => ({
                          ...s,
                          pressures: s.pressures.filter((x) => x.id !== p.id),
                        }));
                      }}
                    >
                      <RiDeleteBin6Line size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <section className="card space-y-3 text-sm text-ink-500">
        <label className="flex cursor-pointer items-start gap-3 text-[15px] font-medium text-ink-900">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-brand-600"
            checked={day.completed}
            disabled={!day.foodCount}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                completedDays: e.target.checked
                  ? [...new Set([...(s.completedDays ?? []), date])]
                  : reopenDay(s, date),
              }))
            }
          />
          <span>
            Registrei todos os alimentos, bebidas e exercícios do dia.
          </span>
        </label>
        <p>
          Qualquer alteração em alimentos ou exercícios reabre o dia. Sem esse
          fechamento, a IA trata o saldo como parcial, e não como déficit
          confirmado.
        </p>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-brand-700">
            Como calculamos e quais são os limites
          </summary>
          <div className="space-y-3 pt-1">
            <p>
              Consumo = gramas × kcal por 100 g ÷ 100. Base do dia = basal ×
              1,2, considerando rotina leve fora dos treinos. Exercícios
              estimados usam valores MET e descontam o repouso. Calorias ativas
              informadas substituem a estimativa do exercício, nunca são somadas
              a ela.
            </p>
            <p>
              O fator de atividade do perfil só entra na simulação de meta, não
              neste diário. Distância e duração estimam a velocidade em
              caminhada, corrida e bicicleta em terreno plano; outras condições
              podem mudar bastante o gasto. Não são medições clínicas, não são
              diagnóstico e não garantem emagrecimento.
            </p>
            <a
              className="inline-block text-brand-700 underline underline-offset-2"
              href="https://pacompendium.com/adult-compendium/"
              target="_blank"
              rel="noreferrer"
            >
              Referência: Compêndio de Atividades Físicas 2024
            </a>
          </div>
        </details>
      </section>
    </>
  );
}
