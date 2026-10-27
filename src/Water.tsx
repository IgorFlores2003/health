import { useState, type Dispatch, type SetStateAction } from "react";
import { RiAddLine, RiArrowGoBackLine, RiDropLine } from "react-icons/ri";
import {
  defaultHydration,
  waterGoal,
  type Hydration,
  type State,
} from "./domain";
import { waterOn, weightAtDate } from "./energy";
import { allowReminders, remindersSupported } from "./reminders";

export const CUPS = [150, 200, 250, 300, 350, 500];
const ml = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`
    : `${n} ml`;

/** Água do dia: meta por peso, botão do copo e desfazer. */
export function WaterCard({
  state,
  setState,
  date,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  date: string;
}) {
  const h = state.hydration ?? defaultHydration;
  const goal = waterGoal(weightAtDate(state, date));
  const drunk = waterOn(state, date);
  const last = (state.water ?? []).filter((w) => w.date === date).at(-1);
  const pct = goal ? Math.min(100, (drunk / goal) * 100) : 0;
  const [custom, setCustom] = useState("");
  const add = (amount: number) =>
    setState((s) => ({
      ...s,
      water: [
        ...(s.water ?? []),
        { id: crypto.randomUUID(), date, ml: amount },
      ],
    }));
  const setCup = (cupMl: number) =>
    setState((s) => ({
      ...s,
      hydration: { ...(s.hydration ?? defaultHydration), cupMl },
    }));
  return (
    <section className="card">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <RiDropLine className="size-[18px]" />
        </span>
        <h2 className="font-semibold">Água</h2>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {ml(drunk)}
        </p>
        <p className="text-sm text-ink-500 tabular-nums">
          {goal ? `meta ${ml(goal)}` : "Registre o peso para ver a meta"}
        </p>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Água bebida"
        aria-valuemin={0}
        aria-valuemax={goal ?? 0}
        aria-valuenow={drunk}
      >
        <div
          className="h-full rounded-full bg-brand-600"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Tamanho do copo"
      >
        {CUPS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={h.cupMl === c}
            className="min-h-9 rounded-full border border-line px-3 text-sm text-ink-700 aria-checked:border-brand-500 aria-checked:bg-brand-50 aria-checked:font-medium aria-checked:text-brand-700"
            onClick={() => setCup(c)}
          >
            {c} ml
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn-primary flex-1 sm:flex-none"
          onClick={() => add(h.cupMl)}
        >
          <RiAddLine className="size-5" /> Bebi {h.cupMl} ml
        </button>
        {last && (
          <button
            className="btn-secondary"
            onClick={() =>
              setState((s) => ({
                ...s,
                water: (s.water ?? []).filter((w) => w.id !== last.id),
              }))
            }
          >
            <RiArrowGoBackLine className="size-4" /> Desfazer
          </button>
        )}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const amount = Number(custom);
          if (amount >= 1 && amount <= 5000) {
            add(amount);
            setCustom("");
          }
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Outra quantidade em ml</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="1"
            max="5000"
            step="any"
            required
            placeholder="Outro valor (ml)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button className="btn-secondary shrink-0">
          <RiAddLine className="size-5" /> Adicionar
        </button>
      </form>
      {goal && (
        <p className="mt-3 text-[13px] text-ink-500">
          Meta de 35 ml por kg de peso. Calor, exercício e algumas condições de
          saúde mudam a necessidade; siga a orientação do seu médico se tiver
          restrição de líquidos.
        </p>
      )}
    </section>
  );
}

/** Configuração do copo e dos lembretes (Perfil). */
export function HydrationSettings({
  value,
  onChange,
  onNotice,
}: {
  value: Hydration | undefined;
  onChange: (h: Hydration) => void;
  onNotice: (text: string) => void;
}) {
  const h = value ?? defaultHydration;
  const [busy, setBusy] = useState(false);
  const hours = Array.from({ length: 25 }, (_, i) => i);
  const set = (patch: Partial<Hydration>) => {
    const next = { ...h, ...patch };
    if (next.startHour >= next.endHour) {
      onNotice("O fim dos lembretes precisa ser depois do início.");
      return;
    }
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">Copo padrão</span>
        <select
          className="input"
          value={h.cupMl}
          onChange={(e) => set({ cupMl: Number(e.target.value) })}
        >
          {[...new Set([...CUPS, h.cupMl])]
            .sort((a, b) => a - b)
            .map((c) => (
              <option key={c} value={c}>
                {c} ml
              </option>
            ))}
        </select>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-[15px] font-medium">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-brand-600"
          checked={h.reminders}
          disabled={busy || !remindersSupported()}
          onChange={async (e) => {
            const on = e.target.checked;
            if (on) {
              setBusy(true);
              const ok = await allowReminders().catch(() => false);
              setBusy(false);
              if (!ok) {
                onNotice(
                  "Permita as notificações do Ritmo nas configurações do celular para receber os lembretes.",
                );
                return;
              }
            }
            set({ reminders: on });
          }}
        />
        <span>
          Lembrar de beber água
          {!remindersSupported() && (
            <span className="hint block font-normal">
              Disponível no app Android.
            </span>
          )}
        </span>
      </label>
      {h.reminders && (
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="label">A cada</span>
            <select
              className="input"
              value={h.everyMinutes}
              onChange={(e) => set({ everyMinutes: Number(e.target.value) })}
            >
              {[30, 45, 60, 90, 120, 180].map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} h`.replace(".", ",")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Das</span>
            <select
              className="input"
              value={h.startHour}
              onChange={(e) => set({ startHour: Number(e.target.value) })}
            >
              {hours.slice(0, 24).map((x) => (
                <option key={x} value={x}>
                  {String(x).padStart(2, "0")}h
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Até</span>
            <select
              className="input"
              value={h.endHour}
              onChange={(e) => set({ endHour: Number(e.target.value) })}
            >
              {hours.slice(1).map((x) => (
                <option key={x} value={x}>
                  {String(x).padStart(2, "0")}h
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
