import { dailyBudget, foodCalories } from "./energy.ts";
import { byDate, type State } from "./domain.ts";

/**
 * otimo: dia completo, dentro do disponível e sem comer muito pouco.
 * acima: passou do disponível (tolerância de 100 kcal).
 * baixo: muito abaixo do gasto em repouso (não é um "bom" resultado).
 * incompleto: o dia não foi fechado ou tem calorias pendentes.
 */
export type Verdict = "otimo" | "acima" | "baixo" | "incompleto";
export const TOLERANCE = 100;

export type ReportDay = {
  date: string;
  verdict: Verdict;
  consumed: number;
  available: number | null;
  difference: number | null;
  /** Itens que mais somaram calorias no dia (nome e kcal). */
  top: { name: string; kcal: number }[];
};

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

export function analyzePeriod(state: State, from: string, to: string) {
  const foods = (state.foods ?? []).filter((f) => inRange(f.date, from, to));
  const exercises = byDate(state.exercises).filter((x) =>
    inRange(x.date, from, to),
  );
  const weights = byDate(state.weights).filter((x) =>
    inRange(x.date, from, to),
  );
  const pressures = byDate(state.pressures).filter((x) =>
    inRange(x.date, from, to),
  );

  const days: ReportDay[] = [...new Set(foods.map((f) => f.date))]
    .sort()
    .map((date) => {
      const b = dailyBudget(state, date);
      const top = b.foods
        .map((f) => ({ name: f.name, kcal: Math.round(foodCalories(f) ?? 0) }))
        .sort((a, c) => c.kcal - a.kcal)
        .slice(0, 3);
      if (!b.ready || !b.completed || b.foodMissing > 0)
        return {
          date,
          verdict: "incompleto" as const,
          consumed: Math.round(b.intake),
          available: b.ready ? Math.round(b.available) : null,
          difference: null,
          top,
        };
      const difference = Math.round(b.consumed - b.available);
      const verdict: Verdict =
        difference > TOLERANCE
          ? "acima"
          : b.bmr !== null && b.consumed < b.bmr * 0.8
            ? "baixo"
            : "otimo";
      return {
        date,
        verdict,
        consumed: Math.round(b.consumed),
        available: Math.round(b.available),
        difference,
        top,
      };
    });
  const of = (v: Verdict) => days.filter((d) => d.verdict === v);
  const great = of("otimo");
  const over = of("acima");
  const low = of("baixo");
  const incomplete = of("incompleto");

  const spanDays =
    Math.round(
      (new Date(to + "T12:00:00").getTime() -
        new Date(from + "T12:00:00").getTime()) /
        86400000,
    ) + 1;
  const minutes = exercises.reduce((s, x) => s + x.minutes, 0);
  const weeklyMinutes = Math.round((minutes / spanDays) * 7);
  const firstWeight = weights[0]?.value ?? null;
  const lastWeight = weights.at(-1)?.value ?? null;
  const highPressure = pressures.filter(
    (p) => p.systolic >= 140 || p.diastolic >= 90,
  );

  // Alimentos que mais pesaram nos dias acima do disponível.
  const heavy = new Map<string, number>();
  for (const d of over)
    for (const t of d.top) heavy.set(t.name, (heavy.get(t.name) ?? 0) + t.kcal);
  const heavyFoods = [...heavy]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const tips: string[] = [];
  if (incomplete.length)
    tips.push(
      `${incomplete.length} dia(s) com registro incompleto ficaram fora da análise. Ao fim do dia, preencha as calorias pendentes e marque "Registrei todos os alimentos" para que o dia conte.`,
    );
  if (over.length)
    tips.push(
      `Em ${over.length} dia(s) o consumo passou do disponível, em média ${Math.round(avg(over.map((d) => d.difference!))!)} kcal acima.${heavyFoods.length ? ` O que mais pesou nesses dias: ${heavyFoods.join(", ")}. Vale rever porções ou trocas para esses itens.` : ""}`,
    );
  if (low.length)
    tips.push(
      `Em ${low.length} dia(s) o consumo ficou bem abaixo do gasto em repouso. Comer muito pouco também não é o ideal; um nutricionista pode ajudar a ajustar.`,
    );
  if (exercises.length === 0)
    tips.push(
      "Nenhum exercício registrado no período. A OMS recomenda de 150 a 300 minutos de atividade moderada por semana para adultos.",
    );
  else if (weeklyMinutes < 150)
    tips.push(
      `Média de ${weeklyMinutes} min de exercício por semana. A recomendação da OMS para adultos é de 150 a 300 min de atividade moderada.`,
    );
  if (weights.length < Math.max(1, Math.floor(spanDays / 7)))
    tips.push(
      "Poucos registros de peso. Pesar-se uma vez por semana, no mesmo horário, deixa a trajetória mais confiável.",
    );
  if (highPressure.length)
    tips.push(
      `${highPressure.length} medição(ões) de pressão com 140/90 mmHg ou mais. Leve esses registros ao seu médico.`,
    );
  if (!tips.length)
    tips.push(
      "Registros consistentes no período. Continue marcando tudo para acompanhar sua evolução.",
    );

  return {
    from,
    to,
    spanDays,
    days,
    great,
    over,
    low,
    incomplete,
    foods,
    exercises,
    weights,
    pressures,
    weight: {
      first: firstWeight,
      last: lastWeight,
      change:
        firstWeight !== null && lastWeight !== null
          ? Math.round((lastWeight - firstWeight) * 10) / 10
          : null,
    },
    exercise: {
      count: exercises.length,
      minutes,
      weeklyMinutes,
      km:
        Math.round(
          exercises.reduce((s, x) => s + (x.distanceKm ?? 0), 0) * 100,
        ) / 100,
      elevation: exercises.reduce((s, x) => s + (x.elevationM ?? 0), 0),
      activeDays: new Set(exercises.map((x) => x.date)).size,
    },
    pressure: {
      count: pressures.length,
      systolic: avg(pressures.map((p) => p.systolic)),
      diastolic: avg(pressures.map((p) => p.diastolic)),
      pulse: avg(pressures.flatMap((p) => (p.pulse ? [p.pulse] : []))),
      high: highPressure.length,
    },
    tips,
  };
}
export type Report = ReturnType<typeof analyzePeriod>;
