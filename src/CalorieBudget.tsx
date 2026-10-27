import type { ReactNode } from "react";
import { RiFireLine } from "react-icons/ri";
import { dailyBudget } from "./energy";
import type { State } from "./domain";

const kcal = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} kcal`;

export default function CalorieBudget({
  state,
  date,
  onProfile,
  onWeight,
  compact = false,
  children,
}: {
  state: State;
  date: string;
  onProfile: () => void;
  onWeight: () => void;
  compact?: boolean;
  children?: ReactNode;
}) {
  const b = dailyBudget(state, date);
  if (!b.ready)
    return (
      <section className="card">
        <Title />
        <p className="mt-2 text-sm text-ink-500">
          {b.reason === "profile"
            ? "Para calcular, salve seu perfil com altura, idade e coeficiente da fórmula."
            : "Para calcular, registre seu peso nesta data ou antes dela."}
        </p>
        <button
          className="btn-secondary mt-4 w-full sm:w-auto"
          onClick={b.reason === "profile" ? onProfile : onWeight}
        >
          {b.reason === "profile" ? "Completar perfil" : "Registrar peso"}
        </button>
      </section>
    );
  const over = b.remaining < 0;
  const used = Math.min(100, (b.consumed / b.available) * 100);
  return (
    <section className="card">
      <Title />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <p className="text-ink-500">
          <span
            className={`block text-3xl font-semibold tracking-tight tabular-nums ${over ? "text-brand-700" : "text-ink-900"}`}
          >
            {kcal(Math.abs(b.remaining))}
          </span>
          {over ? "acima do disponível" : "restantes"}
        </p>
        <p className="text-sm text-ink-500 tabular-nums">
          {kcal(b.consumed)} de {kcal(b.available)}
        </p>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Calorias consumidas"
        aria-valuemin={0}
        aria-valuemax={b.available}
        aria-valuenow={b.consumed}
      >
        <div
          className={`h-full rounded-full ${over ? "bg-brand-800" : "bg-brand-600"}`}
          style={{ width: `${over ? 100 : used}%` }}
        />
      </div>
      {!compact && (
        <dl className="mt-5 divide-y divide-line text-sm">
          <Row
            label={
              b.source === "goal"
                ? "Meta de consumo (definida por você)"
                : "Meta de consumo (automática)"
            }
            value={kcal(b.target)}
          />
          <Row label="Exercícios do dia" value={`+ ${kcal(b.active)}`} />
          <Row label="Disponível hoje" value={kcal(b.available)} strong />
          <Row label="Consumido" value={`− ${kcal(b.consumed)}`} />
          <Row
            label={over ? "Acima do disponível" : "Restante"}
            value={kcal(Math.abs(b.remaining))}
            strong
          />
        </dl>
      )}
      {!compact && <Notes b={b} />}
      {children}
    </section>
  );
}

function Title() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <RiFireLine className="size-[18px]" />
      </span>
      <h2 className="font-semibold">Calorias do dia</h2>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className={strong ? "font-medium text-ink-900" : "text-ink-500"}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${strong ? "font-semibold" : "text-ink-700"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Notes({
  b,
}: {
  b: Extract<ReturnType<typeof dailyBudget>, { ready: true }>;
}) {
  const notes = [
    b.foodMissing > 0 &&
      `${b.foodMissing} alimento(s) sem calorias não entraram na conta.`,
    b.exerciseMissing > 0 &&
      `${b.exerciseMissing} exercício(s) sem calorias não foram somados.`,
    b.raised &&
      `Sua meta de consumo está abaixo do mínimo seguro (${kcal(b.floor)}), então usamos o mínimo. Para comer menos que isso, só com acompanhamento profissional.`,
    b.source === "auto" &&
      {
        floor:
          "Meta automática: o mínimo seguro para você (nunca abaixo do basal).",
        loss: "Meta automática: gasto estimado menos 500 kcal, para perder peso sem passar do mínimo seguro.",
        maintain: "Meta automática: gasto estimado para manter o peso.",
      }[b.autoReason],
  ].filter(Boolean) as string[];
  return (
    <div className="mt-4 space-y-1 text-[13px] leading-relaxed text-ink-500">
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      <p>
        Estimativa pela fórmula Mifflin–St Jeor com seu peso, altura, idade e
        coeficiente. Não é prescrição de dieta.
      </p>
    </div>
  );
}
