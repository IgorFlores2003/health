import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  RiAddLine,
  RiCheckLine,
  RiRestaurant2Line,
  RiSparkling2Line,
  RiTimeLine,
} from "react-icons/ri";
import Choice from "./Choice";
import { kcal, today, validState, type State } from "./domain";
import { dailyBudget, reopenDay } from "./energy";
import { AI_OFFLINE, supabase } from "./supabase";
import { PageTitle, Panel } from "./ui";
import { readAudio } from "./voice";
import VoiceButton from "./VoiceButton";

const MEALS = [
  "café da manhã",
  "almoço",
  "café da tarde",
  "jantar",
  "ceia",
  "lanche",
] as const;
type Meal = (typeof MEALS)[number];
const MEAL_LABEL: Record<Meal, string> = {
  "café da manhã": "Café da manhã",
  almoço: "Almoço",
  "café da tarde": "Café da tarde",
  jantar: "Jantar",
  ceia: "Ceia",
  lanche: "Lanche",
};
/** Refeição mais provável pelo horário. */
export function mealAt(hour: number): Meal {
  if (hour >= 5 && hour < 10) return "café da manhã";
  if (hour >= 10 && hour < 15) return "almoço";
  if (hour >= 15 && hour < 18) return "café da tarde";
  if (hour >= 18 && hour < 22) return "jantar";
  return "ceia";
}
const TAGS = [
  "Rápido (até 15 min)",
  "Sem fogão",
  "Vegetariano",
  "Mais proteína",
  "Pouco carboidrato",
  "Para levar na marmita",
];

type Suggestion = {
  title: string;
  why: string;
  minutes: number | null;
  ingredients: string[];
  missing: string[];
  steps: string[];
  portionGrams: number | null;
  kcalPer100g: number | null;
  liquid: boolean;
};

const load = (key: string) => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

/**
 * Aba Cozinha: a pessoa diz o que tem em casa e a IA sugere o que preparar
 * de jeito saudável, para a refeição do horário (ou a escolhida).
 */
export default function Kitchen({
  userId,
  state,
  setState,
  onNotice,
  onDiary,
}: {
  userId: string;
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  onNotice: (text: string) => void;
  onDiary: () => void;
}) {
  // A despensa fica neste aparelho, para não digitar tudo de novo.
  const pantryKey = `ritmo-pantry-${userId}`;
  const [pantry, setPantry] = useState(() => load(pantryKey));
  useEffect(() => {
    try {
      localStorage.setItem(pantryKey, pantry);
    } catch {
      /* só não lembra da próxima vez */
    }
  }, [pantry, pantryKey]);
  const [meal, setMeal] = useState<Meal>(() => mealAt(new Date().getHours()));
  const [tags, setTags] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    suggestions: Suggestion[];
    note: string;
  } | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const budget = dailyBudget(state, today());
  const remaining = budget.ready ? budget.remaining : null;

  async function suggest() {
    if (!supabase || busy || !pantry.trim()) return;
    if (!navigator.onLine) return setError(AI_OFFLINE);
    setBusy(true);
    setError("");
    setResult(null);
    setAdded([]);
    const now = new Date();
    try {
      const { data, error } = await supabase.functions.invoke("coach", {
        body: {
          action: "suggest-meal",
          ingredients: pantry.trim().slice(0, 1500),
          meal,
          time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          context: [...tags, context.trim()]
            .filter(Boolean)
            .join("; ")
            .slice(0, 300),
          remainingKcal: remaining,
          goal: budget.ready ? budget.direction : "maintain",
        },
      });
      if (error || !Array.isArray(data?.suggestions)) throw Error();
      if (!data.suggestions.length)
        throw Error(
          "A IA não achou uma refeição com esses ingredientes. Acrescente mais itens e tente de novo.",
        );
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível sugerir agora. Tente de novo em instantes.",
      );
    } finally {
      setBusy(false);
    }
  }

  function addToDiary(s: Suggestion) {
    if (s.portionGrams === null || s.kcalPer100g === null) return;
    const date = today();
    const next: State = {
      ...state,
      foods: [
        ...(state.foods ?? []),
        {
          id: crypto.randomUUID(),
          date,
          name: s.title.slice(0, 160),
          grams: s.portionGrams,
          kcalPer100g: s.kcalPer100g,
          unit: s.liquid ? "ml" : "g",
          source: "ai",
          note: `Receita sugerida na Cozinha (${MEAL_LABEL[meal].toLowerCase()}). Estimativa da IA para 1 porção.`,
        },
      ],
      completedDays: reopenDay(state, date),
    };
    if (!validState(next)) return onNotice("Não foi possível registrar.");
    setState(next);
    setAdded((a) => [...a, s.title]);
    onNotice(`"${s.title}" registrado no diário de hoje.`);
  }

  return (
    <>
      <PageTitle
        title="Cozinha"
        text="Diga o que tem em casa e a IA sugere o que preparar de jeito saudável."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel className="h-fit">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void suggest();
            }}
          >
            <label className="block">
              <span className="label">O que você tem em casa</span>
              <textarea
                className="input min-h-28 py-2.5"
                value={pantry}
                maxLength={1500}
                onChange={(e) => setPantry(e.target.value)}
                placeholder="Ex.: ovos, arroz, feijão, tomate, cebola, frango, alface, banana, aveia, leite"
                required
              />
              <span className="hint block">
                Fica salvo neste aparelho para a próxima vez. Temperos, sal e
                óleo a IA já considera.
              </span>
            </label>
            <VoiceButton
              label="Falar o que tem"
              disabled={busy || !supabase}
              onAudio={async (audio) => {
                const { text } = await readAudio("question", audio);
                if (!text)
                  throw Error("Não entendemos o áudio. Tente de novo.");
                setPantry((p) => (p.trim() ? `${p.trim()}, ${text}` : text));
                return "Adicionado à lista. Confira o texto.";
              }}
            />
            <div>
              <span className="label">Refeição</span>
              <Choice
                variant="chips"
                label="Refeição"
                value={meal}
                onChange={setMeal}
                options={MEALS.map((m) => ({ id: m, label: MEAL_LABEL[m] }))}
              />
              <span className="hint block">
                Escolhida pelo horário de agora; troque se quiser.
              </span>
            </div>
            <div>
              <span className="label">Preferências · opcional</span>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      className={`min-h-9 rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-ink-700 hover:bg-surface"}`}
                      onClick={() =>
                        setTags((list) =>
                          on ? list.filter((x) => x !== t) : [...list, t],
                        )
                      }
                    >
                      {on && <RiCheckLine className="mr-1 inline size-4" />}
                      {t}
                    </button>
                  );
                })}
              </div>
              <input
                className="input mt-2"
                value={context}
                maxLength={200}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Algo mais? Ex.: alergia a amendoim, cozinhar para 2"
              />
            </div>
            <p className="rounded-lg bg-surface p-3 text-sm text-ink-700">
              {remaining === null
                ? "Registre o peso e revise o perfil para a IA considerar suas calorias do dia."
                : remaining > 0
                  ? `Restam ${kcal(remaining)} na meta de hoje: a IA tenta caber nisso.`
                  : "Você já chegou à meta de calorias de hoje: a IA vai sugerir opções leves."}
            </p>
            <button
              className="btn-primary w-full"
              disabled={busy || !pantry.trim() || !supabase}
            >
              <RiSparkling2Line size={18} />
              {busy ? "Pensando nas receitas…" : "Sugerir o que cozinhar"}
            </button>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800"
              >
                {error}
              </p>
            )}
            <p className="text-[13px] leading-relaxed text-ink-500">
              Enviamos ao Gemini só a lista de ingredientes, a refeição, o
              horário, as preferências e as calorias que restam hoje. As
              calorias das receitas são estimativas. Não é orientação
              nutricional individual.
            </p>
          </form>
        </Panel>
        <div className="grid content-start gap-4" aria-live="polite">
          {!result && !busy && (
            <Panel>
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <RiRestaurant2Line className="size-5" />
                </span>
                <strong className="font-semibold">
                  {MEAL_LABEL[meal]} com o que você tem
                </strong>
                <p className="max-w-sm text-sm text-ink-500">
                  Liste os ingredientes e toque em Sugerir. Você recebe até 3
                  opções com modo de preparo e calorias estimadas, e pode
                  registrar a escolhida no diário.
                </p>
              </div>
            </Panel>
          )}
          {busy &&
            [0, 1].map((i) => (
              <div
                key={i}
                className="card h-40 animate-pulse bg-surface"
                aria-hidden
              />
            ))}
          {result?.suggestions.map((s) => {
            const portion =
              s.portionGrams !== null && s.kcalPer100g !== null
                ? (s.portionGrams * s.kcalPer100g) / 100
                : null;
            const done = added.includes(s.title);
            return (
              <Panel key={s.title}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                  <span className="flex flex-wrap gap-2 text-sm text-ink-500">
                    {s.minutes !== null && (
                      <span className="inline-flex items-center gap-1">
                        <RiTimeLine className="size-4" /> {Math.round(s.minutes)}{" "}
                        min
                      </span>
                    )}
                    {portion !== null && (
                      <span className="tabular-nums">~{kcal(portion)}</span>
                    )}
                  </span>
                </div>
                {s.why && <p className="mt-1 text-sm text-ink-700">{s.why}</p>}
                <h3 className="mt-4 text-sm font-semibold">Ingredientes</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700">
                  {s.ingredients.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {s.missing.length > 0 && (
                  <p className="mt-2 text-[13px] text-ink-500">
                    Se tiver, fica melhor com: {s.missing.join(", ")}.
                  </p>
                )}
                <details className="mt-3">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand-700">
                    Modo de preparo ({s.steps.length} passos)
                  </summary>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
                    {s.steps.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ol>
                </details>
                {portion !== null && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className={done ? "btn-secondary" : "btn-primary"}
                      disabled={done}
                      onClick={() => addToDiary(s)}
                    >
                      {done ? (
                        <>
                          <RiCheckLine size={18} /> No diário
                        </>
                      ) : (
                        <>
                          <RiAddLine size={18} /> Comi isso: registrar
                        </>
                      )}
                    </button>
                    {done && (
                      <button className="btn-ghost" onClick={onDiary}>
                        Abrir diário
                      </button>
                    )}
                    <span className="text-[13px] text-ink-500">
                      1 porção de {s.portionGrams!.toLocaleString("pt-BR")}{" "}
                      {s.liquid ? "ml" : "g"}
                    </span>
                  </div>
                )}
              </Panel>
            );
          })}
          {result?.note && (
            <p className="text-[13px] text-ink-500">{result.note}</p>
          )}
        </div>
      </div>
    </>
  );
}
