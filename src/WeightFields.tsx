import NumberField from "./NumberField";
import { useState } from "react";
import { MAX_PHOTOS, num, type Weight } from "./domain";
import PhotoField from "./PhotoField";
import {
  fill,
  readImage,
  type BodyContext,
  type ScaleReading,
} from "./readImage";
import { readAudio } from "./voice";
import VoiceButton from "./VoiceButton";

export default function WeightFields({
  initial,
  body,
}: {
  initial?: Weight;
  /** Altura, idade e coeficiente do perfil, para a estimativa de gordura. */
  body: Omit<BodyContext, "weight">;
}) {
  // "ai" quando o valor do campo veio da foto; digitar troca para "manual".
  const [fatSource, setFatSource] = useState<"ai" | "manual" | "">(
    initial?.bodyFatSource ?? (initial?.bodyFat ? "manual" : ""),
  );
  const [fatNote, setFatNote] = useState("");
  function apply(
    r: ScaleReading,
    form: HTMLFormElement | null,
    fallback: string,
  ) {
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
        <span className="label">Peso</span>
        <NumberField
          name="value"
          unit="kg"
          decimals={1}
          min={20}
          max={400}
          required
          defaultValue={initial?.value}
          placeholder="0,0"
        />
        <span className="hint block">
          Um peso por dia. Registrar de novo na mesma data substitui o anterior.
        </span>
      </label>
      <label className="block">
        <span className="label">
          Gordura corporal{" "}
          <span className="font-normal text-ink-400">· opcional</span>
        </span>
        <NumberField
          name="bodyFat"
          unit="%"
          decimals={1}
          min={2}
          max={70}
          defaultValue={initial?.bodyFat}
          onChange={() => setFatSource("manual")}
          placeholder="0,0"
        />
        <input type="hidden" name="bodyFatSource" value={fatSource} />
        <span className="hint block">
          {fatSource === "ai"
            ? `Estimativa da IA pela foto. ${fatNote}`
            : "Da balança de bioimpedância, ou estime pela foto do corpo abaixo."}
        </span>
      </label>
      <div className="md:col-span-2">
        <PhotoField
          label="Fotos da balança ou do corpo · opcional"
          max={MAX_PHOTOS}
          hint="Balança: fotografe o visor com o número parado. Corpo: de frente ou de lado, com boa luz e roupa justa. A IA recebe só a foto escolhida (e altura, idade e peso para a gordura); nada é guardado por ela."
          readers={[
            {
              label: "Ler o peso da balança",
              run: async (file, form) =>
                apply(
                  await readImage("scale", file),
                  form,
                  "Não conseguimos ler o visor. Tire a foto de frente, com o número parado, ou preencha à mão.",
                ),
            },
            {
              label: "Estimar % de gordura",
              run: async (file, form) => {
                const typed = Number(
                  (form?.elements.namedItem("value") as HTMLInputElement | null)
                    ?.value,
                );
                const r = await readImage("body", file, {
                  ...body,
                  weight: typed >= 20 && typed <= 400 ? typed : null,
                });
                if (r.bodyFat === null)
                  throw Error(
                    r.note ||
                      "Não deu para estimar por esta foto. Use uma foto do tronco, de frente ou de lado, com boa luz.",
                  );
                fill(form, "bodyFat", r.bodyFat);
                setFatSource("ai");
                const range =
                  r.low !== null && r.high !== null
                    ? ` Faixa provável: ${num(r.low)}% a ${num(r.high)}%.`
                    : "";
                setFatNote(range.trim());
                return `Estimativa: ${num(r.bodyFat)}% de gordura.${range} ${r.note} É uma estimativa visual, não uma medição: bioimpedância, dobras cutâneas ou DEXA são mais precisas.`;
              },
            },
          ]}
          saved={initial?.photos}
        />
      </div>
    </div>
  );
}
