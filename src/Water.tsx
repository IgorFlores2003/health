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
import Choice from "./Choice";
import NumberField from "./NumberField";

const CUPS = [150, 200, 250, 300, 350, 500];
const MAX_ML = 5000;

/** Quantidade de água em litros (máscara 0,250 L), guardada em ml. */
export function LitersInput({
  label = "Quantidade",
  className = "",
  ...field
}: {
  value: number | null;
  onChange: (ml: number | null) => void;
  name?: string;
  label?: string;
  className?: string;
}) {
  return (
    <NumberField
      {...field}
      className={className}
      aria-label={`${label} em litros`}
      unit="L"
      decimals={3}
      factor={1000}
      min={1}
      max={MAX_ML}
      placeholder="0,000"
    />
  );
}
const ml = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} L`
    : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ml`;

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
  const [custom, setCustom] = useState<number | null>(null);
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
      <Choice
        variant="chips"
        className="mt-4"
        label="Tamanho do copo"
        value={String(h.cupMl)}
        onChange={(c) => setCup(Number(c))}
        options={CUPS.map((c) => ({ id: String(c), label: `${c} ml` }))}
      />
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
          if (custom && custom <= MAX_ML) {
            add(custom);
            setCustom(null);
          }
        }}
      >
        <LitersInput
          className="min-w-0 flex-1"
          label="Outra quantidade"
          value={custom}
          onChange={setCustom}
        />
        <button className="btn-secondary shrink-0" disabled={!custom}>
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
