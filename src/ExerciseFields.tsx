import { useEffect, useRef, useState } from "react";
import {
  EXERCISE_TYPES,
  formatDuration,
  MAX_PHOTOS,
  type Exercise,
} from "./domain";
import PhotoField from "./PhotoField";
import { fill, readImage } from "./readImage";
/** Máscara do campo hh:mm: os dígitos entram pela direita (3 → 00:03, 34 → 00:34, 134 → 01:34). */
function maskDuration(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "").slice(-4);
  if (!digits) return "";
  const padded = digits.padStart(4, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}
export default function ExerciseFields({ initial }: { initial?: Exercise }) {
  const [manual, setManual] = useState(initial?.activeCalories !== undefined);
  // Calorias lidas do print: o campo só existe depois de trocar para manual.
  const pending = useRef<{ form: HTMLFormElement | null; kcal: number }>(null);
  useEffect(() => {
    if (manual && pending.current) {
      fill(pending.current.form, "activeCalories", pending.current.kcal);
      pending.current = null;
    }
  }, [manual]);
  async function onRead(file: File, form: HTMLFormElement | null) {
    const r = await readImage("exercise", file);
    const found = [
      fill(form, "type", r.type),
      fill(form, "date", r.date),
      fill(form, "duration", r.minutes && formatDuration(r.minutes)),
      fill(form, "distanceKm", r.distanceKm),
      fill(form, "elevationM", r.elevationM),
    ].filter(Boolean).length;
    if (r.activeCalories !== null) {
      pending.current = { form, kcal: r.activeCalories };
      if (manual) fill(form, "activeCalories", r.activeCalories);
      else setManual(true);
    }
    if (!found && r.activeCalories === null)
      throw Error("Não encontramos dados de treino na imagem. Preencha à mão.");
    return `${r.note || "Dados lidos da imagem."} Confira os campos antes de salvar.`;
  }
  // "contents": os campos entram direto no grid de 2 colunas do modal.
  return (
    <div className="contents">
      <label className="block">
        <span className="label">Tipo de exercício</span>
        <select name="type" className="input" defaultValue={initial?.type}>
          {EXERCISE_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Como informar o gasto</span>
        <select
          className="input"
          value={manual ? "manual" : "estimate"}
          onChange={(e) => setManual(e.target.value === "manual")}
        >
          <option value="estimate">
            Estimar por tipo, duração e distância
          </option>
          <option value="manual">Já sei as calorias ativas</option>
        </select>
      </label>
      {manual && (
        <label className="block">
          <span className="label">Calorias ativas (kcal)</span>
          <input
            className="input"
            name="activeCalories"
            type="number"
            min="0"
            max="10000"
            step="1"
            required
            defaultValue={initial?.activeCalories}
            placeholder="Ex.: 250"
          />
        </label>
      )}
      <label className="block">
        <span className="label">
          Duração (hh:mm){manual ? " · opcional" : ""}
        </span>
        <input
          className="input tabular-nums"
          name="duration"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{2}:[0-5]\d"
          title="Use horas e minutos, como 00:34 ou 01:05"
          required={!manual}
          defaultValue={initial?.minutes ? formatDuration(initial.minutes) : ""}
          placeholder="00:30"
          onChange={(e) => {
            e.currentTarget.value = maskDuration(e.currentTarget.value);
          }}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Distância (km)</span>
          <input
            className="input"
            name="distanceKm"
            type="number"
            inputMode="decimal"
            min="0.01"
            max="1000"
            step="0.01"
            defaultValue={initial?.distanceKm}
            placeholder="Opcional"
          />
        </label>
        <label className="block">
          <span className="label">Elevação (m)</span>
          <input
            className="input"
            name="elevationM"
            type="number"
            inputMode="numeric"
            min="0"
            max="10000"
            step="1"
            defaultValue={initial?.elevationM}
            placeholder="Opcional"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Intensidade</span>
        <select
          name="intensity"
          className="input"
          defaultValue={initial?.intensity}
        >
          <option>Leve</option>
          <option>Moderada</option>
          <option>Intensa</option>
        </select>
      </label>
      <div className="md:col-span-2">
        <PhotoField
          label="Fotos · opcional"
          max={MAX_PHOTOS}
          hint={`Até ${MAX_PHOTOS} fotos, como o print do Strava ou do relógio. Com "Preencher com a IA", a primeira imagem é enviada ao Gemini para ler tipo, data, duração, distância e elevação; corte o print se não quiser enviar nome ou mapa.`}
          onRead={onRead}
          saved={initial?.photos}
        />
      </div>
      <p className="text-[13px] leading-relaxed text-ink-500 md:col-span-2">
        {manual
          ? "Informe só as calorias ativas do treino, sem o total do dia e sem o repouso. Esse valor substitui a estimativa automática."
          : "A duração é obrigatória para estimar. Com a distância, ajustamos a velocidade em caminhada, corrida e ciclismo. Musculação, yoga e pilates usam valores aproximados. Para natação, dança ou outro tipo, informe as calorias ativas; sem elas, o registro fica pendente."}
      </p>
    </div>
  );
}
