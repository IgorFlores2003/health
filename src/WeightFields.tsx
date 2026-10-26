import { MAX_PHOTOS, type Weight } from "./domain";
import PhotoField from "./PhotoField";
import { fill, readImage } from "./readImage";

export default function WeightFields({ initial }: { initial?: Weight }) {
  async function onRead(file: File, form: HTMLFormElement | null) {
    const r = await readImage("scale", file);
    if (r.weight === null)
      throw Error(
        r.note ||
          "Não conseguimos ler o visor. Tire a foto de frente, com o número parado, ou preencha à mão.",
      );
    fill(form, "value", r.weight);
    return `Lido: ${r.weight.toLocaleString("pt-BR")} kg. Confira com o visor antes de salvar.`;
  }
  return (
    <div className="contents">
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
          onRead={onRead}
          saved={initial?.photos}
        />
      </div>
    </div>
  );
}
