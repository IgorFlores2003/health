import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiPencilLine,
} from "react-icons/ri";
import Choice from "./Choice";
import { confirmDialog } from "./confirm";
import {
  byDate,
  daysAgo,
  durationLabel,
  foodUnit,
  kcal,
  num,
  today,
  type Food,
  type State,
} from "./domain";
import { foodCalories, reopenDay } from "./energy";
import { PhotoStrip, removePhotos } from "./photos";
import ReportCard, { firstDate } from "./ReportCard";
import { dateLabel, PageTitle, Panel } from "./ui";

type Kind = "weight" | "exercise" | "pressure" | "water";
const dayLabel = (d: string) => `${dateLabel(d)} ${d.slice(0, 4)}`;
/** Datas dos itens, da mais recente para a mais antiga. */
const daysOf = <T extends { date: string }>(items: T[]) =>
  [...new Set(items.map((x) => x.date))].sort().reverse();

/** Aba Registros: um filtro de período para o relatório e todas as listas. */
export default function Records({
  state,
  setState,
  onEdit,
  onFood,
  onError,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  /** Abre o formulário de peso/exercício/pressão/água (novo ou edição). */
  onEdit: (kind: Kind, id?: string) => void;
  /** Abre o formulário de alimento (novo ou edição). */
  onFood: (food?: Food) => void;
  onError: (message: string) => void;
}) {
  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState(() => daysAgo(6));
  const [customTo, setCustomTo] = useState(today);
  const from =
    period === "all"
      ? firstDate(state)
      : period === "custom"
        ? customFrom
        : daysAgo(Number(period) - 1);
  const to = period === "custom" ? customTo : today();
  const inPeriod = <T extends { date: string }>(items: T[] = []) =>
    items.filter((x) => x.date >= from && x.date <= to);
  const foods = inPeriod(state.foods);
  const water = inPeriod(state.water);

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

  return (
    <>
      <PageTitle
        title="Registros"
        text="Peso, exercícios, pressão arterial, alimentação e água."
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Choice
          label="Período do relatório e dos registros"
          value={period}
          onChange={setPeriod}
          options={[
            { id: "1", label: "Hoje" },
            { id: "7", label: "7 dias" },
            { id: "30", label: "30 dias" },
            { id: "90", label: "90 dias" },
            { id: "all", label: "Tudo" },
            { id: "custom", label: "Personalizado" },
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
      <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {(
          [
            ["Peso", () => onEdit("weight")],
            ["Exercício", () => onEdit("exercise")],
            ["Pressão", () => onEdit("pressure")],
            ["Alimento", () => onFood()],
            ["Água", () => onEdit("water")],
          ] as const
        ).map(([label, open], i) => (
          <button
            key={label}
            className={i ? "btn-secondary" : "btn-primary"}
            onClick={open}
          >
            <RiAddLine className="size-5" /> {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <List title="Peso" empty={!inPeriod(state.weights).length}>
          {byDate(inPeriod(state.weights))
            .reverse()
            .map((w) => (
              <Row
                key={w.id}
                title={`${num(w.value)} kg`}
                detail={dayLabel(w.date)}
                photos={w.photos}
                onEdit={() => onEdit("weight", w.id)}
                onDelete={() =>
                  remove(
                    "Excluir registro?",
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
            ))}
        </List>
        <List title="Exercícios" empty={!inPeriod(state.exercises).length}>
          {byDate(inPeriod(state.exercises))
            .reverse()
            .map((ex) => (
              <Row
                key={ex.id}
                title={ex.type}
                detail={[
                  dayLabel(ex.date),
                  durationLabel(ex.minutes),
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
                    "Excluir registro?",
                    "O registro e as fotos dele serão apagados da sua conta.",
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
            ))}
        </List>
        <List
          title="Pressão arterial"
          empty={!inPeriod(state.pressures).length}
        >
          {byDate(inPeriod(state.pressures))
            .reverse()
            .map((p) => (
              <Row
                key={p.id}
                title={`${p.systolic}/${p.diastolic} mmHg`}
                detail={`${dayLabel(p.date)}${p.pulse ? ` · ${p.pulse} bpm` : ""}`}
                photos={p.photos}
                onEdit={() => onEdit("pressure", p.id)}
                onDelete={() =>
                  remove(
                    "Excluir registro?",
                    "O registro e as fotos dele serão apagados da sua conta.",
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
            ))}
        </List>
        <List title="Alimentação" empty={!foods.length}>
          {daysOf(foods).map((date) => {
            const items = foods.filter((f) => f.date === date);
            return (
              <Day
                key={date}
                total={kcal(
                  items.reduce((t, f) => t + (foodCalories(f) ?? 0), 0),
                )}
                detail={`${dayLabel(date)} · ${items.length} alimento${items.length === 1 ? "" : "s"}`}
              >
                <ul className="mt-2">
                  {items.map((f) => {
                    const c = foodCalories(f);
                    return (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="min-w-0 text-[13px] text-ink-700">
                          <span className="block truncate">{f.name}</span>
                          <span className="text-ink-500 tabular-nums">
                            {num(f.grams)} {foodUnit(f)} ·{" "}
                            {c === null ? "calorias pendentes" : kcal(c)}
                          </span>
                        </span>
                        <Actions
                          name={f.name}
                          onEdit={() => onFood(f)}
                          onDelete={() =>
                            remove(
                              "Excluir alimento?",
                              `"${f.name}" sai do diário de ${dateLabel(date)}.`,
                              () =>
                                setState((s) => ({
                                  ...s,
                                  foods: (s.foods ?? []).filter(
                                    (x) => x.id !== f.id,
                                  ),
                                  completedDays: reopenDay(s, date),
                                })),
                            )
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </Day>
            );
          })}
        </List>
        <List title="Água" empty={!water.length}>
          {daysOf(water).map((date) => {
            const items = water.filter((w) => w.date === date);
            return (
              <Day
                key={date}
                total={`${num(items.reduce((t, w) => t + w.ml, 0))} ml`}
                detail={`${dayLabel(date)} · ${items.length} registro${items.length === 1 ? "" : "s"} · toque em um valor para editar`}
              >
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-0.5 rounded-full bg-surface py-0.5 pr-0.5 pl-1 text-[13px] text-ink-700 tabular-nums"
                    >
                      <button
                        className="inline-flex min-h-7 items-center gap-1 rounded-full px-1.5 hover:bg-white hover:text-brand-700"
                        aria-label={`Editar ${w.ml} ml de ${dateLabel(date)}`}
                        onClick={() => onEdit("water", w.id)}
                      >
                        {num(w.ml)} ml
                        <RiPencilLine className="size-3.5 text-ink-400" />
                      </button>
                      <button
                        className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-white hover:text-brand-600"
                        aria-label={`Excluir ${w.ml} ml de ${dateLabel(date)}`}
                        onClick={() =>
                          remove(
                            "Excluir registro de água?",
                            `${num(w.ml)} ml de ${dateLabel(date)} saem do histórico.`,
                            () =>
                              setState((s) => ({
                                ...s,
                                water: (s.water ?? []).filter(
                                  (x) => x.id !== w.id,
                                ),
                              })),
                          )
                        }
                      >
                        <RiCloseLine className="size-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </Day>
            );
          })}
        </List>
      </div>
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

/** Painel de uma lista, com o aviso de período vazio. */
function List({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <Panel>
      <h2 className="text-base font-semibold">{title}</h2>
      {empty ? (
        <p className="py-8 text-sm text-ink-500">
          Nenhum registro nesse período.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">{children}</ul>
      )}
    </Panel>
  );
}

/** Um dia agrupado (alimentação, água): total, detalhe e os itens. */
function Day({
  total,
  detail,
  children,
}: {
  total: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <li className="py-3">
      <strong className="block font-semibold tabular-nums">{total}</strong>
      <small className="mt-0.5 block text-[13px] text-ink-500">{detail}</small>
      {children}
    </li>
  );
}

/** Um registro (peso, exercício, pressão) com fotos e ações. */
function Row({
  title,
  detail,
  photos,
  onEdit,
  onDelete,
}: {
  title: string;
  detail: string;
  photos?: string[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-2 py-3">
      <div className="min-w-0">
        <strong className="block font-semibold tabular-nums">{title}</strong>
        <small className="mt-0.5 block text-[13px] text-ink-500">
          {detail}
        </small>
        <PhotoStrip paths={photos} />
      </div>
      <Actions name="registro" onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
}

function Actions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="-mr-2 flex shrink-0">
      <button
        className="icon-btn hover:text-brand-600"
        aria-label={`Editar ${name}`}
        onClick={onEdit}
      >
        <RiPencilLine className="size-[18px]" />
      </button>
      <button
        className="icon-btn hover:text-brand-600"
        aria-label={`Excluir ${name}`}
        onClick={onDelete}
      >
        <RiDeleteBin6Line className="size-[18px]" />
      </button>
    </span>
  );
}
