import { MAX_PHOTOS, type Pressure } from "./domain";
import PhotoField from "./PhotoField";
import { fill, readImage, type PressureReading } from "./readImage";
import { readAudio } from "./voice";
import VoiceButton from "./VoiceButton";

export default function PressureFields({ initial }: { initial?: Pressure }) {
  function apply(r: PressureReading, form: HTMLFormElement | null, fallback: string) {
    if (r.systolic === null || r.diastolic === null)
      throw Error(r.note || fallback);
    fill(form, "systolic", r.systolic);
    fill(form, "diastolic", r.diastolic);
    fill(form, "pulse", r.pulse);
    return `Lido: ${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · ${r.pulse} bpm` : ""}. Confira antes de salvar.`;
  }
  return (
    <div className="contents">
      <div className="md:col-span-2">
        <VoiceButton
          label="Dizer a medição"
          hint='Ex.: "12 por 8, pulso 72". A IA preenche os campos; você confere antes de salvar.'
          onAudio={async (audio, form) =>
            apply(
              await readAudio("pressure", audio),
              form,
              "Não entendemos a medição. Tente de novo ou digite.",
            )
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Sistólica (mmHg)</span>
          <input
            className="input"
            name="systolic"
            type="number"
            inputMode="numeric"
            min="50"
            max="300"
            required
            defaultValue={initial?.systolic}
            placeholder="120"
          />
        </label>
        <label className="block">
          <span className="label">Diastólica (mmHg)</span>
          <input
            className="input"
            name="diastolic"
            type="number"
            inputMode="numeric"
            min="30"
            max="200"
            required
            defaultValue={initial?.diastolic}
            placeholder="80"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Batimentos (bpm) · opcional</span>
        <input
          className="input"
          name="pulse"
          type="number"
          inputMode="numeric"
          min="20"
          max="250"
          defaultValue={initial?.pulse}
          placeholder="72"
        />
      </label>
      <div className="md:col-span-2">
        <PhotoField
          label="Foto do aparelho · opcional"
          max={MAX_PHOTOS}
          hint='Fotografe o visor de frente. Com "Preencher com a IA", a primeira foto é enviada ao Gemini só para ler os números.'
          onRead={async (file, form) =>
            apply(
              await readImage("pressure", file),
              form,
              "Não conseguimos ler os valores. Tire a foto de frente, sem reflexo, ou preencha à mão.",
            )
          }
          saved={initial?.photos}
        />
      </div>
    </div>
  );
}
