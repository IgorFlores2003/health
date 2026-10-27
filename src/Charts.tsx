import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { byDate, waterGoal, type State } from "./domain";
import { dailyBudget, waterOn, weightAtDate } from "./energy";

const axisTick = { fontSize: 12, fill: "#a1a1aa" };
const grid = <CartesianGrid vertical={false} stroke="#ececef" />;
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const label = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
/** Últimos n dias até hoje, do mais antigo ao mais recente. */
export function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return key(d);
  });
}

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
          <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
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
          <Bar dataKey="meta" fill="var(--color-brand-100)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="consumo" fill="var(--color-brand-600)" radius={[4, 4, 0, 0]} maxBarSize={22} />
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
          <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
          <Tooltip
            cursor={{ fill: "var(--color-brand-50)" }}
            formatter={(v) => [`${Number(v).toLocaleString("pt-BR")} ml`, "Água"]}
          />
          {goal && (
            <ReferenceLine
              y={goal}
              stroke="var(--color-brand-800)"
              strokeDasharray="4 4"
              label={{ value: "meta", position: "insideTopRight", fontSize: 11, fill: "#71717a" }}
            />
          )}
          <Bar dataKey="agua" fill="var(--color-brand-600)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Sistólica e diastólica de cada medição no período. */
export function PressureChart({ state, days }: { state: State; days: number }) {
  const from = lastDays(days)[0];
  const data = byDate(state.pressures)
    .filter((p) => p.date >= from)
    .map((p) => ({
      dia: label(p.date),
      sistolica: p.systolic,
      diastolica: p.diastolic,
    }));
  if (!data.length)
    return <Empty text="Registre uma medição de pressão para ver o gráfico." />;
  const line = (dataKey: string, color: string) => (
    <Line
      type="monotone"
      dataKey={dataKey}
      stroke={color}
      strokeWidth={2}
      dot={{ r: 3, fill: color, stroke: "white", strokeWidth: 2 }}
    />
  );
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, left: -15, right: 8 }}>
          {grid}
          <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis domain={[40, "auto"]} axisLine={false} tickLine={false} tick={axisTick} />
          <Tooltip
            formatter={(v, name) => [
              `${v} mmHg`,
              name === "sistolica" ? "Sistólica" : "Diastólica",
            ]}
          />
          <Legend
            formatter={(v) => (v === "sistolica" ? "Sistólica" : "Diastólica")}
            wrapperStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={140} stroke="#d4d4d8" strokeDasharray="4 4" />
          <ReferenceLine y={90} stroke="#d4d4d8" strokeDasharray="4 4" />
          {line("sistolica", "var(--color-brand-700)")}
          {line("diastolica", "var(--color-brand-400)")}
        </LineChart>
      </ResponsiveContainer>
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
