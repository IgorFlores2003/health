import type { Steps } from "../supabase/functions/_shared/domain.ts";

/** Última leitura do contador do celular (total desde que ligou). */
export type SensorMark = { last: number; bootAt: number };

/**
 * Passos novos desde a última leitura. O contador zera quando o celular
 * reinicia: aí, tudo o que ele marca agora é novo. Na primeira leitura só
 * entram os passos se o celular ligou hoje (senão não dá para saber quantos
 * foram hoje e a contagem começa do zero).
 */
export function stepDelta(
  prev: SensorMark | null,
  reading: { steps: number; bootAt: number },
  startOfToday: number,
) {
  const next = { last: reading.steps, bootAt: reading.bootAt };
  if (!Number.isFinite(reading.steps) || reading.steps < 0)
    return { delta: 0, next: prev };
  if (!prev)
    return {
      delta: reading.bootAt >= startOfToday ? reading.steps : 0,
      next,
    };
  const rebooted =
    Math.abs(reading.bootAt - prev.bootAt) > 5 * 60 * 1000 ||
    reading.steps < prev.last;
  const delta = rebooted ? reading.steps : reading.steps - prev.last;
  // Leitura absurda (mais de 100 mil de uma vez): descarta.
  return { delta: delta > 100000 ? 0 : delta, next };
}

/** Soma passos ao dia (um registro por data). */
export function addSteps(
  list: Steps[] = [],
  date: string,
  delta: number,
): Steps[] {
  if (delta <= 0) return list;
  const id = `steps:${date}`;
  const current = list.find((s) => s.id === id || s.date === date);
  return [
    ...list.filter((s) => s !== current),
    {
      id: current?.id ?? id,
      date,
      count: Math.min(200000, (current?.count ?? 0) + delta),
      source: current?.source ?? "sensor",
    },
  ];
}

/** Define os passos do dia à mão (ex.: número do relógio). */
export function setSteps(
  list: Steps[] = [],
  date: string,
  count: number,
): Steps[] {
  const current = list.find((s) => s.date === date);
  const rest = list.filter((s) => s !== current);
  if (count <= 0) return rest;
  return [
    ...rest,
    {
      id: current?.id ?? `steps:${date}`,
      date,
      count,
      source: "manual",
    },
  ];
}
