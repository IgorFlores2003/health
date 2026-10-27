import NumberField from "./NumberField";
import { useEffect, useRef, useState } from "react";
import {
  EXERCISE_TYPES,
  formatDuration,
  MAX_PHOTOS,
  type Exercise,
} from "./domain";
import PhotoField from "./PhotoField";
import { fill, readImage, type ExerciseReading } from "./readImage";
import { readAudio } from "./voice";
import VoiceButton from "./VoiceButton";
/** Máscara do campo hh:mm:ss: os dígitos entram pela direita (3420 → 00:34:20). */
function maskDuration(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "").slice(-6);
  if (!digits) return "";
  const padded = digits.padStart(6, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4)}`;
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
  function apply(r: ExerciseReading, form: HTMLFormElement | null, empty: string) {
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
      throw Error(empty);
    return `${r.note || "Dados preenchidos."} Confira os campos antes de salvar.`;
  }
  // "contents": os campos entram direto no grid de 2 colunas do modal.
  return (
    <div className="contents">
      <div className="md:col-span-2">
        <VoiceButton
          label="Descrever o treino"
          hint='Ex.: "corri 5 km em 32 minutos ontem". A IA preenche os campos; você confere antes de salvar.'
          onAudio={async (audio, form) =>
            apply(
              await readAudio("exercise", audio),
              form,
              "Não entendemos o treino. Tente de novo ou preencha à mão.",
            )
          }
        />
      </div>
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
          <span className="label">Calorias ativas</span>
          <NumberField
            name="activeCalories"
            unit="kcal"
            min={0}
            max={10000}
            required
            defaultValue={initial?.activeCalories}
            placeholder="250"
          />
        </label>
      )}
      <label className="block">
        <span className="label">
          Duração (hh:mm:ss){manual ? " · opcional" : ""}
        </span>
        <input
          className="input tabular-nums"
          name="duration"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{2}:[0-5]\d:[0-5]\d"
          title="Use horas, minutos e segundos, como 00:34:20 ou 01:05:00"
          required={!manual}
          defaultValue={initial?.minutes ? formatDuration(initial.minutes) : ""}
          placeholder="00:30:00"
          onChange={(e) => {
            e.currentTarget.value = maskDuration(e.currentTarget.value);
          }}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Distância · opcional</span>
          <NumberField
            name="distanceKm"
            unit="km"
            decimals={2}
            min={0.01}
            max={1000}
            defaultValue={initial?.distanceKm}
            placeholder="0,00"
          />
        </label>
        <label className="block">
          <span className="label">Elevação · opcional</span>
          <NumberField
            name="elevationM"
            unit="m"
            min={0}
            max={10000}
            defaultValue={initial?.elevationM}
            placeholder="0"
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
          onRead={async (file, form) =>
            apply(
              await readImage("exercise", file),
              form,
              "Não encontramos dados de treino na imagem. Preencha à mão.",
            )
          }
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
