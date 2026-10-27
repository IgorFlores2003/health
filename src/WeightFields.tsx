import { MAX_PHOTOS, type Weight } from "./domain";
import PhotoField from "./PhotoField";
import { fill, readImage, type ScaleReading } from "./readImage";
import { readAudio } from "./voice";
import VoiceButton from "./VoiceButton";

export default function WeightFields({ initial }: { initial?: Weight }) {
  function apply(r: ScaleReading, form: HTMLFormElement | null, fallback: string) {
    if (r.weight === null) throw Error(r.note || fallback);
    fill(form, "value", r.weight);
    return `Lido: ${r.weight.toLocaleString("pt-BR")} kg. Confira antes de salvar.`;
  }
  return (
    <div className="contents">
      <div className="md:col-span-2">
        <VoiceButton
          label="Dizer o peso"
          hint='Ex.: "78 e meio". A IA preenche o campo; você confere antes de salvar.'
          onAudio={async (audio, form) =>
            apply(
              await readAudio("scale", audio),
              form,
              "Não entendemos o peso. Tente de novo ou digite.",
            )
          }
        />
      </div>
      <label className="block">
        <span className="label">Peso (kg)</span>
        <input
          className="input"
          name="value"
          type="number"
          inputMode="decimal"
          min="20"
          max="400"
          step="0.1"
          required
          defaultValue={initial?.value}
          placeholder="Ex.: 78,5"
        />
        <span className="hint block">
          Um peso por dia. Registrar de novo na mesma data substitui o anterior.
        </span>
      </label>
      <div className="md:col-span-2">
        <PhotoField
          label="Foto da balança · opcional"
          max={MAX_PHOTOS}
          hint='Fotografe o visor com o número parado. Com "Preencher com a IA", a primeira foto é enviada ao Gemini só para ler o peso.'
          onRead={async (file, form) =>
            apply(
              await readImage("scale", file),
              form,
              "Não conseguimos ler o visor. Tire a foto de frente, com o número parado, ou preencha à mão.",
            )
          }
          saved={initial?.photos}
        />
      </div>
    </div>
  );
}
