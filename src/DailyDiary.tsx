import { PhotoStrip, removePhotos } from "./photos";
import {
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
  type FormEvent,
} from "react";
import { Plus, Sparkles, Trash2, Pencil, Utensils, Check } from "lucide-react";
import { dailyEnergy, foodCalories, reopenDay } from "./energy";
import { today, validState, type State, type Food } from "./domain";
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
  onAnalyze,
  onProfile,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  date: string;
  setDate: (s: string) => void;
  onExercise: () => void;
  onAnalyze: () => void;
  onProfile: () => void;
}) {
  const day = dailyEnergy(state, date);
  const estimateId = useRef(0);
  const [showFood, setShowFood] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
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
      <div className="page-heading">
        <div>
          <div className="eyebrow">ALIMENTAÇÃO + MOVIMENTO</div>
          <h1>O balanço do seu dia.</h1>
          <p>
            Registre o que comeu e como se movimentou. Entenda as estimativas
            com a IA.
          </p>
        </div>
        <label className="diary-date">
          Dia do registro
          <input
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
      <div className="stats energy-stats">
        <Metric
          label="Consumo registrado"
          value={kcal(day.intake)}
          note={
            day.foodMissing
              ? `${day.foodMissing} alimento(s) sem calorias`
              : `${day.foodCount} alimento(s)`
          }
        />
        <Metric
          label="Base diária estimada"
          value={kcal(day.baseline)}
          note="Basal × 1,2 · rotina leve"
        />
        <Metric
          label="Exercícios do dia"
          value={kcal(day.active)}
          note={
            day.exerciseMissing
              ? `${day.exerciseMissing} exercício(s) pendente(s)`
              : "Calorias ativas, sem repouso"
          }
        />
        <Metric
          label="Gasto total estimado"
          value={kcal(day.expenditure)}
          note="Base diária + exercícios"
        />
      </div>
      <section className="panel balance-panel">
        <div>
          <span className="eyebrow">BALANÇO ENERGÉTICO</span>
          <h2>{balanceLabels[day.status]}</h2>
          <p>
            {day.complete
              ? `Diferença estimada: ${kcal(Math.abs(day.balance!))}. Valores aproximados; próximo do equilíbrio significa diferença de até 100 kcal.`
              : "Ainda não é possível concluir se o dia terminou em déficit. Registre todas as refeições, bebidas e exercícios e marque o dia como completo."}
          </p>
          {!state.profileReviewed && (
            <button className="text-button" onClick={onProfile}>
              Revise e salve seu perfil para calcular o gasto
            </button>
          )}
          {!day.weight && (
            <p>Falta um registro de peso nessa data ou anterior.</p>
          )}
          {day.aiFoods > 0 && (
            <p>
              {day.aiFoods} alimento(s) usam estimativas da IA. Preparo, marca e
              ingredientes podem alterar as calorias.
            </p>
          )}
        </div>
        <button className="primary" onClick={onAnalyze}>
          <Sparkles size={17} /> Analisar meu dia
        </button>
      </section>
      <div className="diary-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>O que você comeu?</h2>
              <p>Inclua preparo, marca, molhos e bebidas.</p>
            </div>
            <button
              className="secondary"
              onClick={() => open()}
              disabled={busy}
            >
              <Plus size={16} /> Alimento
            </button>
          </div>
          {showFood && (
            <form className="food-form" onSubmit={save}>
              <fieldset disabled={busy}>
                <label className="field">
                  <span>Alimento e preparo</span>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (source === "ai") {
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
                <div className="form-grid">
                  <label className="field">
                    <span>Quantidade (gramas)</span>
                    <input
                      type="number"
                      min="0.1"
                      max="10000"
                      step="0.1"
                      required
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                      placeholder="150"
                    />
                  </label>
                  <label className="field">
                    <span>Energia (kcal por 100 g)</span>
                    <input
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
                      placeholder="Do rótulo ou estimada"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="secondary"
                  disabled={!name.trim() || !supabase}
                  onClick={estimate}
                >
                  <Sparkles size={16} />
                  {busy ? "Estimando…" : "Estimar calorias com IA"}
                </button>
                <p className="form-note">
                  A IA recebe apenas a descrição do alimento. A estimativa por
                  100 g precisa corresponder ao preparo informado. Prefira o
                  rótulo quando disponível.
                </p>
                {note && <p className="connection-note">{note}</p>}
                <p className="food-total">
                  Nesta porção:{" "}
                  <strong>
                    {per100 !== "" && grams !== ""
                      ? kcal(Math.round((Number(per100) * Number(grams)) / 100))
                      : "calorias pendentes"}
                  </strong>{" "}
                  {source === "ai" ? "· estimativa da IA" : ""}
                </p>
                {error && (
                  <p role="alert" className="auth-error">
                    {error}
                  </p>
                )}
                <div className="action-row">
                  <button className="primary">
                    {editing ? "Salvar alteração" : "Salvar alimento"}
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowFood(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {!day.foods.length && !showFood && (
            <div className="empty">
              <span className="icon-box green">
                <Utensils />
              </span>
              <strong>Adicione sua primeira refeição</strong>
              <p>Nome + gramas. Use o rótulo ou peça uma estimativa à IA.</p>
              <button className="text-button" onClick={() => open()}>
                Registrar alimento <Plus size={15} />
              </button>
            </div>
          )}
          <div className="record-list">
            {day.foods.map((food) => (
              <div className="record" key={food.id}>
                <div>
                  <strong>{food.name}</strong>
                  <small>
                    {food.grams} g ·{" "}
                    {foodCalories(food) === null
                      ? "Calorias pendentes"
                      : kcal(foodCalories(food))}{" "}
                    ·{" "}
                    {food.source === "ai"
                      ? "estimativa IA"
                      : food.source === "label"
                        ? "informado"
                        : "a preencher"}
                  </small>
                </div>
                <div className="action-icons">
                  <button
                    className="icon-button"
                    aria-label={`Editar ${food.name}`}
                    onClick={() => open(food)}
                    disabled={busy}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Excluir ${food.name}`}
                    onClick={() => {
                      if (window.confirm("Excluir este alimento?"))
                        setState((s) => ({
                          ...s,
                          foods: (s.foods ?? []).filter(
                            (f) => f.id !== food.id,
                          ),
                          completedDays: reopenDay(s, date),
                        }));
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Como você se movimentou?</h2>
              <p>Calorias informadas ou estimadas por atividade.</p>
            </div>
            <button className="secondary" onClick={onExercise}>
              <Plus size={16} /> Exercício
            </button>
          </div>
          {!day.exercises.length && (
            <p className="empty-inline">
              Nenhum exercício nesse dia. Dias de descanso também fazem parte.
            </p>
          )}
          <div className="record-list">
            {day.exercises.map((ex) => (
              <div className="record" key={ex.id}>
                <div>
                  <strong>{ex.type}</strong>
                  <small>
                    {ex.minutes ? `${ex.minutes} min · ` : ""}
                    {ex.distanceKm ? `${ex.distanceKm} km · ` : ""}
                    {ex.calories === null
                      ? "Calorias pendentes"
                      : kcal(ex.calories)}{" "}
                    · {ex.source}
                  </small>
                  <PhotoStrip
                    paths={state.exercises.find((x) => x.id === ex.id)?.photos}
                  />
                  {ex.calories === null && (
                    <small>
                      Informe calorias ativas ou tipo compatível, peso e
                      duração.
                    </small>
                  )}
                </div>
                <button
                  className="icon-button"
                  aria-label={`Excluir ${ex.type}`}
                  onClick={() => {
                    if (!window.confirm("Excluir este exercício?")) return;
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
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel diary-completion">
        <label className="completion-check">
          <input
            type="checkbox"
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
            Já registrei todos os alimentos, bebidas e exercícios deste dia.
          </span>
        </label>
        <p>
          Qualquer alteração em alimentos ou exercícios reabre o dia. Sem esse
          fechamento, a IA trata o saldo como parcial, não como confirmação de
          déficit.
        </p>
        <details>
          <summary>Como calculamos e quais são os limites?</summary>
          <p>
            Consumo = gramas × kcal por 100 g ÷ 100. Base do dia = basal × 1,2,
            assumindo rotina leve fora dos treinos. Exercícios estimados usam
            valores MET e descontam o repouso. Calorias ativas informadas
            substituem a estimativa do exercício, nunca são somadas a ela.
          </p>
          <p>
            O fator habitual do perfil é usado apenas na simulação de meta, não
            neste diário. Distância e duração estimam a velocidade em caminhada,
            corrida e bicicleta em terreno plano. Outras condições podem mudar
            bastante o gasto. Não são medições clínicas e não garantem
            emagrecimento.
          </p>
          <a
            href="https://pacompendium.com/adult-compendium/"
            target="_blank"
            rel="noreferrer"
          >
            Referência dos exercícios: Compêndio de Atividades Físicas 2024
          </a>
        </details>
      </section>
    </>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <section className="panel stat">
      <span className="stat-label">{label}</span>
      <div className="energy-value">{value}</div>
      <p>{note}</p>
    </section>
  );
}
