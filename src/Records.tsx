import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  RiCloseLine,
  RiDeleteBin6Line,
  RiDropLine,
  RiFootprintLine,
  RiHeartPulseLine,
  RiPencilLine,
  RiRestaurant2Line,
  RiRunLine,
  RiScales3Line,
} from "react-icons/ri";
import { pressureLevel } from "./Charts";
import Choice from "./Choice";
import { confirmDialog } from "./confirm";
import {
  daysAgo,
  durationLabel,
  foodUnit,
  kcal,
  num,
  today,
  type Food,
  type State,
} from "./domain";
import { foodCalories, reopenDay, stepEnergy, weightAtDate } from "./energy";
import { PhotoStrip, removePhotos } from "./photos";
import ReportCard, { firstDate } from "./ReportCard";
import { setSteps } from "./steps";
import { FoldToggle, PageTitle, Panel, Tile, useFlash } from "./ui";

type Kind = "weight" | "exercise" | "pressure" | "water";
type View = "day" | "food" | "exercise" | "weight" | "pressure" | "water" | "steps";
const SECTIONS: { id: Exclude<View, "day">; label: string; icon: ReactNode }[] =
  [
    { id: "food", label: "Refeições", icon: <RiRestaurant2Line /> },
    { id: "exercise", label: "Exercícios", icon: <RiRunLine /> },
    { id: "weight", label: "Peso", icon: <RiScales3Line /> },
    { id: "pressure", label: "Pressão", icon: <RiHeartPulseLine /> },
    { id: "water", label: "Água", icon: <RiDropLine /> },
    { id: "steps", label: "Passos", icon: <RiFootprintLine /> },
  ];
/** Dias mostrados de uma vez (o resto aparece com "Mostrar mais"). */
const PAGE = 10;

/** "Hoje", "Ontem" ou "sábado, 01 de novembro" (com o ano se for outro). */
function dayTitle(date: string) {
  if (date === today()) return "Hoje";
  if (date === daysAgo(1)) return "Ontem";
  const d = new Date(date + "T12:00:00");
  const text = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    ...(date.slice(0, 4) !== today().slice(0, 4) ? { year: "numeric" } : {}),
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
const shortDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * Aba Registros: o relatório do período e o histórico separado por dia, com
 * uma seção por tipo de registro (ou só um tipo, pelo filtro).
 */
export default function Records({
  state,
  setState,
  onEdit,
  onFood,
  onError,
  view: rawView,
  onView,
  highlight,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  /** Abre o formulário de peso/exercício/pressão/água (novo ou edição). */
  onEdit: (kind: Kind, id?: string) => void;
  /** Abre o formulário de alimento (novo ou edição). */
  onFood: (food?: Food) => void;
  onError: (message: string) => void;
  /** Filtro do histórico (fica no App para abrir já no tipo salvo). */
  view: string;
  onView: (view: string) => void;
  /** Id do registro recém-salvo, para destacar. */
  highlight?: string | null;
}) {
  const view = (
    ["day", ...SECTIONS.map((s) => s.id)].includes(rawView) ? rawView : "day"
  ) as View;
  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState(() => daysAgo(6));
  const [customTo, setCustomTo] = useState(today);
  const [shown, setShown] = useState(PAGE);
  const from =
    period === "all"
      ? firstDate(state)
      : period === "custom"
        ? customFrom
        : daysAgo(Number(period) - 1);
  const to = period === "custom" ? customTo : today();
  const inPeriod = <T extends { date: string }>(items: T[] = []) =>
    items.filter((x) => x.date >= from && x.date <= to);
  const lists = {
    food: inPeriod(state.foods),
    exercise: inPeriod(state.exercises),
    weight: inPeriod(state.weights),
    pressure: inPeriod(state.pressures),
    water: inPeriod(state.water),
    steps: inPeriod(state.steps),
  };
  const visible = view === "day" ? SECTIONS : SECTIONS.filter((s) => s.id === view);
  const days = [
    ...new Set(visible.flatMap((s) => lists[s.id].map((x) => x.date))),
  ]
    .sort()
    .reverse();

  async function remove(title: string, message: string, apply: () => void) {
    if (
      await confirmDialog({
        title,
        message,
        confirmLabel: "Excluir",
        danger: true,
      })
    )
      apply();
  }

  /** Itens de um tipo num dia. */
  function section(id: Exclude<View, "day">, date: string) {
    if (id === "food") {
      const items = lists.food.filter((f) => f.date === date);
      if (!items.length) return null;
      const total = items.reduce((t, f) => t + (foodCalories(f) ?? 0), 0);
      return {
        summary: kcal(total),
        rows: items.map((f) => {
          const c = foodCalories(f);
          return (
            <Row
              key={f.id}
              highlight={highlight === f.id}
              title={f.name}
              value={c === null ? "pendente" : kcal(c)}
              detail={[
                `${num(f.grams)} ${foodUnit(f)}`,
                f.source === "ai"
                  ? "estimativa da IA"
                  : f.source === "label"
                    ? "informado"
                    : "calorias a preencher",
              ].join(" · ")}
              warn={c === null}
              onEdit={() => onFood(f)}
              onDelete={() =>
                remove(
                  "Excluir alimento?",
                  `"${f.name}" sai do diário de ${shortDate(date)}.`,
                  () =>
                    setState((s) => ({
                      ...s,
                      foods: (s.foods ?? []).filter((x) => x.id !== f.id),
                      completedDays: reopenDay(s, date),
                    })),
                )
              }
            />
          );
        }),
      };
    }
    if (id === "exercise") {
      const items = lists.exercise.filter((e) => e.date === date);
      if (!items.length) return null;
      const minutes = items.reduce((t, e) => t + e.minutes, 0);
      return {
        summary: durationLabel(minutes),
        rows: items.map((ex) => (
          <Row
            key={ex.id}
            highlight={highlight === ex.id}
            title={ex.type}
            value={ex.minutes ? durationLabel(ex.minutes) : ""}
            detail={[
              ex.intensity,
              ex.distanceKm && `${num(ex.distanceKm)} km`,
              ex.elevationM && `${num(ex.elevationM)} m de elevação`,
              ex.activeCalories !== undefined &&
                `${num(ex.activeCalories)} kcal ativas`,
            ]
              .filter(Boolean)
              .join(" · ")}
            photos={ex.photos}
            onEdit={() => onEdit("exercise", ex.id)}
            onDelete={() =>
              remove(
                "Excluir exercício?",
                "O exercício e as fotos dele serão apagados da sua conta.",
                () => {
                  void removePhotos(ex.photos);
                  setState((s) => ({
                    ...s,
                    exercises: s.exercises.filter((x) => x.id !== ex.id),
                    completedDays: reopenDay(s, ex.date),
                  }));
                },
              )
            }
          />
        )),
      };
    }
    if (id === "weight") {
      const items = lists.weight.filter((w) => w.date === date);
      if (!items.length) return null;
      return {
        summary: `${num(items[0].value)} kg`,
        rows: items.map((w) => (
          <Row
            key={w.id}
            highlight={highlight === w.id}
            title={`${num(w.value)} kg`}
            value=""
            detail={
              w.bodyFat !== undefined
                ? `${num(w.bodyFat)}% de gordura${w.bodyFatSource === "ai" ? " (estimativa da IA)" : ""}`
                : ""
            }
            photos={w.photos}
            onEdit={() => onEdit("weight", w.id)}
            onDelete={() =>
              remove(
                "Excluir peso?",
                "O registro e as fotos dele serão apagados da sua conta.",
                () => {
                  void removePhotos(w.photos);
                  setState((s) => ({
                    ...s,
                    weights: s.weights.filter((x) => x.id !== w.id),
                  }));
                },
              )
            }
          />
        )),
      };
    }
    if (id === "pressure") {
      const items = lists.pressure.filter((p) => p.date === date);
      if (!items.length) return null;
      return {
        summary: `${items.length} medição${items.length === 1 ? "" : "ões"}`,
        rows: items.map((p) => {
          const level = pressureLevel(p.systolic, p.diastolic);
          return (
            <Row
              key={p.id}
              highlight={highlight === p.id}
              title={`${p.systolic}/${p.diastolic} mmHg`}
              value=""
              badge={
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${level.tone}`}
                >
                  {level.label}
                </span>
              }
              detail={p.pulse ? `${p.pulse} bpm` : ""}
              photos={p.photos}
              onEdit={() => onEdit("pressure", p.id)}
              onDelete={() =>
                remove(
                  "Excluir medição?",
                  "A medição e as fotos dela serão apagadas da sua conta.",
                  () => {
                    void removePhotos(p.photos);
                    setState((s) => ({
                      ...s,
                      pressures: s.pressures.filter((x) => x.id !== p.id),
                    }));
                  },
                )
              }
            />
          );
        }),
      };
    }
    if (id === "water") {
      const items = lists.water.filter((w) => w.date === date);
      if (!items.length) return null;
      return {
        summary: `${num(items.reduce((t, w) => t + w.ml, 0))} ml`,
        rows: [
          <li key="water" className="flex flex-wrap gap-1.5 py-2">
            {items.map((w) => (
              <WaterChip
                key={w.id}
                ml={w.ml}
                highlight={highlight === w.id}
                onEdit={() => onEdit("water", w.id)}
                onDelete={() =>
                  remove(
                    "Excluir registro de água?",
                    `${num(w.ml)} ml de ${shortDate(date)} saem do histórico.`,
                    () =>
                      setState((s) => ({
                        ...s,
                        water: (s.water ?? []).filter((x) => x.id !== w.id),
                      })),
                  )
                }
              />
            ))}
          </li>,
        ],
      };
    }
    const item = lists.steps.find((x) => x.date === date);
    if (!item) return null;
    const e = stepEnergy(item.count, weightAtDate(state, date), state.profile);
    return {
      summary: `${item.count.toLocaleString("pt-BR")} passos`,
      rows: [
        <Row
          key={item.id}
          title={`${item.count.toLocaleString("pt-BR")} passos`}
          value={e.calories === null ? "" : `~${kcal(e.calories)}`}
          detail={`${num(e.distanceKm)} km · ${item.source === "manual" ? "informado" : "contado pelo celular"}`}
          onDelete={() =>
            remove(
              "Excluir passos do dia?",
              `Os passos de ${shortDate(date)} saem do histórico.`,
              () =>
                setState((s) => ({
                  ...s,
                  steps: setSteps(s.steps, date, 0),
                })),
            )
          }
        />,
      ],
    };
  }

  return (
    <>
      <PageTitle
        title="Registros"
        text="Seu histórico, separado por dia. Toque num registro para editar."
      />
      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile
          icon={<RiRestaurant2Line />}
          label="+ Alimento"
          onClick={() => onFood()}
        />
        <Tile
          icon={<RiRunLine />}
          label="+ Exercício"
          onClick={() => onEdit("exercise")}
        />
        <Tile
          icon={<RiScales3Line />}
          label="+ Peso"
          onClick={() => onEdit("weight")}
        />
        <Tile
          icon={<RiHeartPulseLine />}
          label="+ Pressão"
          onClick={() => onEdit("pressure")}
        />
        <Tile
          icon={<RiDropLine />}
          label="+ Água"
          onClick={() => onEdit("water")}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Choice
          label="Período"
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setShown(PAGE);
          }}
          options={[
            { id: "1", label: "Hoje" },
            { id: "7", label: "7 dias" },
            { id: "30", label: "30 dias" },
            { id: "90", label: "90 dias" },
            { id: "all", label: "Tudo" },
            { id: "custom", label: "Escolher" },
          ]}
        />
        {period === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <DateField
              label="De"
              value={customFrom}
              max={customTo}
              onChange={setCustomFrom}
            />
            <DateField
              label="Até"
              value={customTo}
              min={customFrom}
              max={today()}
              onChange={setCustomTo}
            />
          </div>
        )}
      </div>
      <div className="mb-5">
        <ReportCard state={state} from={from} to={to} onError={onError} />
      </div>
      <div className="mb-4">
        <Choice
          variant="chips"
          label="Mostrar"
          value={view}
          onChange={(v) => {
            onView(v);
            setShown(PAGE);
          }}
          options={[
            { id: "day", label: "Tudo por dia" },
            ...SECTIONS.map((s) => ({
              id: s.id,
              label: `${s.label} (${s.id === "water" ? new Set(lists.water.map((w) => w.date)).size : lists[s.id].length})`,
            })),
          ]}
        />
      </div>
      {!days.length ? (
        <Panel>
          <p className="py-8 text-center text-sm text-ink-500">
            Nenhum registro{" "}
            {view === "day"
              ? ""
              : `de ${SECTIONS.find((s) => s.id === view)!.label.toLowerCase()} `}
            nesse período. Use os botões acima para registrar.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {days.slice(0, shown).map((date) => {
            const parts = visible.flatMap((s) => {
              const r = section(s.id, date);
              return r ? [{ ...s, ...r }] : [];
            });
            return (
              <Panel key={date} fold={`day-${date}`} foldPersist={false}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{dayTitle(date)}</h2>
                    <p className="mt-0.5 text-[13px] text-ink-500">
                      {parts.map((p) => p.summary).join(" · ")}
                    </p>
                  </div>
                  <FoldToggle title={dayTitle(date)} />
                </div>
                <div className="mt-3 grid gap-4">
                  {parts.map((p) => (
                    <div key={p.id}>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                          <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-4">
                            {p.icon}
                          </span>
                          {p.label}
                          <span className="ml-auto font-normal text-ink-500 tabular-nums">
                            {p.summary}
                          </span>
                        </h3>
                      <ul className="mt-1 divide-y divide-line border-l-2 border-brand-100 pl-3">
                        {p.rows}
                      </ul>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
          {days.length > shown && (
            <button
              className="btn-secondary mx-auto"
              onClick={() => setShown((n) => n + PAGE)}
            >
              Mostrar mais dias ({days.length - shown})
            </button>
          )}
        </div>
      )}
    </>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (date: string) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input w-auto"
        type="date"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const d = e.target.value;
          if (d && (!min || d >= min) && (!max || d <= max)) onChange(d);
        }}
      />
    </label>
  );
}

/** Um registro: nome, valor à direita, detalhe, fotos e ações. */
function Row({
  title,
  value,
  detail,
  badge,
  warn,
  photos,
  highlight,
  onEdit,
  onDelete,
}: {
  title: string;
  value: string;
  detail: string;
  badge?: ReactNode;
  warn?: boolean;
  photos?: string[];
  highlight?: boolean;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const ref = useFlash<HTMLLIElement>(highlight);
  return (
    <li ref={ref} className="-ml-1 flex flex-wrap items-start gap-x-2 rounded-lg py-2.5 pl-1">
      <button
        className="min-w-0 flex-1 text-left disabled:cursor-default"
        disabled={!onEdit}
        onClick={onEdit}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <strong className="truncate text-sm font-medium">{title}</strong>
            {badge}
          </span>
          {value && (
            <span
              className={`shrink-0 text-sm tabular-nums ${warn ? "text-brand-700" : "text-ink-700"}`}
            >
              {value}
            </span>
          )}
        </span>
        {detail && (
          <small className="mt-0.5 block text-[13px] text-ink-500">
            {detail}
          </small>
        )}
      </button>
      <span className="-my-1 -mr-2 flex shrink-0">
        {onEdit && (
          <button
            className="icon-btn hover:text-brand-600"
            aria-label={`Editar ${title}`}
            onClick={onEdit}
          >
            <RiPencilLine className="size-[18px]" />
          </button>
        )}
        <button
          className="icon-btn hover:text-brand-600"
          aria-label={`Excluir ${title}`}
          onClick={onDelete}
        >
          <RiDeleteBin6Line className="size-[18px]" />
        </button>
      </span>
      {photos?.length ? <RowPhotos photos={photos} /> : null}
    </li>
  );
}
function RowPhotos({ photos }: { photos: string[] }) {
  return (
    <span className="basis-full">
      <PhotoStrip paths={photos} />
    </span>
  );
}

function WaterChip({
  ml,
  highlight,
  onEdit,
  onDelete,
}: {
  ml: number;
  highlight?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ref = useFlash<HTMLSpanElement>(highlight);
  return (
    <span
      ref={ref}
      className="inline-flex items-center gap-0.5 rounded-full bg-surface py-0.5 pr-0.5 pl-1 text-[13px] text-ink-700 tabular-nums"
    >
      <button
        className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 hover:bg-white hover:text-brand-700"
        aria-label={`Editar ${num(ml)} ml`}
        onClick={onEdit}
      >
        {num(ml)} ml
        <RiPencilLine className="size-3.5 text-ink-400" />
      </button>
      <button
        className="grid size-8 place-items-center rounded-full text-ink-400 hover:bg-white hover:text-brand-600"
        aria-label={`Excluir ${num(ml)} ml`}
        onClick={onDelete}
      >
        <RiCloseLine className="size-4" />
      </button>
    </span>
  );
}
