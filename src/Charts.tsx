import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { byDate, lastDays, waterGoal, type State } from "./domain";
import { dailyBudget, waterOn, weightAtDate } from "./energy";

const axisTick = { fontSize: 12, fill: "var(--color-ink-400)" };
const grid = <CartesianGrid vertical={false} stroke="var(--color-line)" />;
const label = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

/** Consumo de cada dia contra o disponível (meta + exercícios). */
export function CalorieChart({ state, days }: { state: State; days: number }) {
  const data = lastDays(days).map((date) => {
    const b = dailyBudget(state, date);
    return {
      dia: label(date),
      consumo: b.foodCount ? b.intake : null,
      meta: b.ready ? b.available : null,
    };
  });
  if (!data.some((d) => d.consumo !== null))
    return <Empty text="Registre alimentos no diário para ver o gráfico." />;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -15, right: 0 }}>
          {grid}
          <XAxis
            dataKey="dia"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <Tooltip
            cursor={{ fill: "var(--color-brand-50)" }}
            formatter={(v, name) => [
              `${Number(v).toLocaleString("pt-BR")} kcal`,
              name === "consumo" ? "Consumido" : "Disponível",
            ]}
          />
          <Legend
            formatter={(v) => (v === "consumo" ? "Consumido" : "Disponível")}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="meta"
            fill="var(--color-brand-100)"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
          <Bar
            dataKey="consumo"
            fill="var(--color-brand-600)"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Água por dia, com a linha da meta pelo peso atual. */
export function WaterChart({ state, days }: { state: State; days: number }) {
  const dates = lastDays(days);
  const goal = waterGoal(weightAtDate(state, dates.at(-1)!));
  const data = dates.map((date) => ({
    dia: label(date),
    agua: waterOn(state, date),
  }));
  if (!data.some((d) => d.agua > 0))
    return <Empty text="Toque em “Bebi” no card de água para começar." />;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -10, right: 0 }}>
          {grid}
          <XAxis
            dataKey="dia"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <Tooltip
            cursor={{ fill: "var(--color-brand-50)" }}
            formatter={(v) => [
              `${Number(v).toLocaleString("pt-BR")} ml`,
              "Água",
            ]}
          />
          {goal && (
            <ReferenceLine
              y={goal}
              stroke="var(--color-brand-800)"
              strokeDasharray="4 4"
              label={{
                value: "meta",
                position: "insideTopRight",
                fontSize: 11,
                fill: "var(--color-ink-500)",
              }}
            />
          )}
          <Bar
            dataKey="agua"
            fill="var(--color-brand-600)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Sistólica e diastólica de cada medição no período. */
/**
 * Faixa de referência da pressão (Diretriz Brasileira de Hipertensão 2020),
 * só para leitura do gráfico; não é diagnóstico.
 */
export function pressureLevel(sys: number, dia: number) {
  if (sys >= 140 || dia >= 90)
    return { label: "Alta", tone: "bg-brand-600 text-white", color: "var(--color-brand-700)" };
  if (sys >= 130 || dia >= 85)
    return { label: "Limítrofe", tone: "bg-amber-50 text-amber-800", color: "#d97706" };
  return { label: "Normal", tone: "bg-emerald-50 text-emerald-800", color: "#059669" };
}

/**
 * Uma barra por medição, da diastólica (base) até a sistólica (topo),
 * colorida pela faixa de referência. Mais fácil de ler do que duas linhas
 * cruzando.
 */
export function PressureChart({ state, days }: { state: State; days: number }) {
  const from = lastDays(days)[0];
  const list = byDate(state.pressures).filter((p) => p.date >= from);
  if (!list.length)
    return <Empty text="Registre uma medição de pressão para ver o gráfico." />;
  const data = list.map((p, i) => ({
    key: `${p.date}-${i}`,
    dia: label(p.date),
    faixa: [p.diastolic, p.systolic] as [number, number],
    sys: p.systolic,
    dia_: p.diastolic,
    pulse: p.pulse,
  }));
  const last = list.at(-1)!;
  const level = pressureLevel(last.systolic, last.diastolic);
  const avg = (k: "systolic" | "diastolic") =>
    Math.round(list.reduce((t, p) => t + p[k], 0) / list.length);
  const lo = Math.min(60, ...list.map((p) => p.diastolic)) - 10;
  const hi = Math.max(150, ...list.map((p) => p.systolic)) + 10;
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-[13px] text-ink-500">Última · {label(last.date)}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">
            {last.systolic}/{last.diastolic}
            <span className="ml-1 text-sm font-normal text-ink-500">mmHg</span>
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${level.tone}`}
          >
            {level.label}
          </span>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-[13px] text-ink-500">
            Média · {list.length} medição{list.length === 1 ? "" : "ões"}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">
            {avg("systolic")}/{avg("diastolic")}
            <span className="ml-1 text-sm font-normal text-ink-500">mmHg</span>
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pressureLevel(avg("systolic"), avg("diastolic")).tone}`}
          >
            {pressureLevel(avg("systolic"), avg("diastolic")).label}
          </span>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, left: -15, right: 8 }}>
            {grid}
            <XAxis
              dataKey="dia"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
            />
            <YAxis
              domain={[lo, hi]}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
            />
            <ReferenceLine
              y={140}
              stroke="var(--color-brand-400)"
              strokeDasharray="4 4"
              label={{ value: "140", position: "right", fontSize: 11, fill: "var(--color-ink-400)" }}
            />
            <ReferenceLine
              y={90}
              stroke="var(--color-brand-400)"
              strokeDasharray="4 4"
              label={{ value: "90", position: "right", fontSize: 11, fill: "var(--color-ink-400)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-brand-50)" }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm">
                    <p className="font-semibold tabular-nums">
                      {d.sys}/{d.dia_} mmHg
                    </p>
                    <p className="text-ink-500">
                      {d.dia} · {pressureLevel(d.sys, d.dia_).label}
                      {d.pulse ? ` · ${d.pulse} bpm` : ""}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="faixa" radius={6} maxBarSize={14}>
              {data.map((d) => (
                <Cell key={d.key} fill={pressureLevel(d.sys, d.dia_).color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
        Cada barra é uma medição: o topo é a máxima (sistólica) e a base é a
        mínima (diastólica). Verde: normal; amarelo: limítrofe (130/85 ou
        mais); vermelho: alta (140/90 ou mais, linhas tracejadas). É só uma
        referência; quem avalia é o médico.
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="grid h-40 place-items-center px-4 text-center text-sm text-ink-500">
      {text}
    </p>
  );
}
