import NumberField from "./NumberField";
import { useEffect, useState } from "react";
import {
  RiCameraLine,
  RiCheckLine,
  RiImageAddLine,
} from "react-icons/ri";
import CameraCapture from "./CameraCapture";
import { openImages } from "./ImageViewer";
import { readImage, type MealReading } from "./readImage";
import { readAudio } from "./voice";
import { kcal, looksLiquid } from "./domain";
import VoiceButton from "./VoiceButton";

type Item = MealReading["items"][number] & { on: boolean };

/**
 * Foto do prato → a IA sugere os itens com porção e kcal/100 g; a pessoa
 * revisa (desmarca, corrige nome e gramas) antes de adicionar ao diário.
 */
export default function MealPhoto({
  disabled,
  onAdd,
  onReviewing,
  preset,
}: {
  disabled?: boolean;
  onAdd: (items: MealReading["items"], note: string) => void;
  /** Avisa quando a revisão dos itens está aberta (o formulário manual some). */
  onReviewing?: (open: boolean) => void;
  /** Itens já estimados (ex.: "ovo com café" escrito à mão) para revisar. */
  preset?: MealReading | null;
}) {
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [preview, setPreview] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const [items, setItems] = useState<Item[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function read(file: File) {
    setPreview(URL.createObjectURL(file));
    await review(
      () => readImage("meal", file),
      "Não reconhecemos alimentos na foto. Tente outra foto, de cima e com boa luz, ou registre à mão.",
    );
  }
  async function review(load: () => Promise<MealReading>, empty: string) {
    setBusy(true);
    setError("");
    setItems(null);
    try {
      const r = await load();
      if (!r.items?.length) throw Error(empty);
      // Função antiga no servidor não diz se é líquido: deduz pelo nome.
      setItems(
        r.items.map((x) => ({
          ...x,
          liquid: x.liquid ?? looksLiquid(x.name),
          on: true,
        })),
      );
      setNote(r.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => onReviewing?.(items !== null), [items, onReviewing]);
  useEffect(() => {
    if (!preset?.items.length) return;
    setPreview("");
    setError("");
    setItems(
      preset.items.map((x) => ({
        ...x,
        liquid: x.liquid ?? looksLiquid(x.name),
        on: true,
      })),
    );
    setNote(preset.note);
  }, [preset]);
  const set = (i: number, patch: Partial<Item>) =>
    setItems((list) => list!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const chosen = (items ?? []).filter(
    (x) => x.on && x.name.trim() && x.grams > 0,
  );
  const total = chosen.reduce((s, x) => s + (x.grams * x.kcalPer100g) / 100, 0);

  return (
    <div>
      {!items && (
        <div className="flex items-center gap-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
          {preview && busy ? (
            <img
              src={preview}
              alt=""
              className="size-16 shrink-0 animate-pulse rounded-lg object-cover"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
              <RiCameraLine className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {busy
                ? preview
                  ? "Analisando a foto…"
                  : "Entendendo o áudio…"
                : "Foto do prato"}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {busy
                ? "A IA está identificando os alimentos e as porções."
                : "A IA tenta identificar o que tem no prato e estima as porções. Você confirma antes de salvar."}
            </p>
          </div>
        </div>
      )}
      {!items && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={disabled || busy}
            onClick={() => setCamera(true)}
          >
            <RiCameraLine size={18} /> Tirar foto
          </button>
          <label
            className={`btn-secondary relative overflow-hidden ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <RiImageAddLine size={18} /> Galeria
            <input
              className="absolute inset-0 cursor-pointer opacity-0"
              type="file"
              accept="image/*"
              disabled={disabled || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void read(file);
              }}
            />
          </label>
        </div>
      )}
      {camera && (
        <CameraCapture
          title="Foto do prato"
          facing="environment"
          onClose={() => setCamera(false)}
          onCapture={(file) => {
            setCamera(false);
            void read(file);
          }}
        />
      )}
      {!items && (
        <div className="mt-3">
          <VoiceButton
            label="Falar o que comeu"
            hint='Ex.: "2 ovos mexidos, 1 pão francês e café com leite". A IA estima porções e calorias; você confere antes de adicionar.'
            disabled={disabled || busy}
            onAudio={async (audio) => {
              setPreview("");
              await review(
                () => readAudio("meal", audio),
                "Não entendemos os alimentos. Tente de novo ou registre à mão.",
              );
            }}
          />
        </div>
      )}
      {(error || items) && (
        <div className="mt-3 rounded-lg border border-line bg-surface p-4">
          {error ? (
            <p className="text-sm text-brand-800" role="alert">
              {error}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {preview && (
                  <button
                    type="button"
                    aria-label="Abrir foto do prato"
                    className="shrink-0"
                    onClick={() => openImages([preview])}
                  >
                    <img
                      src={preview}
                      alt=""
                      className="size-14 rounded-lg object-cover"
                    />
                  </button>
                )}
                <p className="text-sm font-semibold">
                  {preview ? "O que a IA viu no prato" : "O que a IA entendeu"}
                </p>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Desmarque o que não comeu e ajuste nomes e quantidades antes de
                adicionar. Toque em g/ml para trocar entre sólido e líquido.
              </p>
              <ul className="mt-3 divide-y divide-line">
                {items!.map((x, i) => (
                  <li key={i} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      className="size-5 shrink-0 accent-brand-600"
                      checked={x.on}
                      aria-label={`Incluir ${x.name}`}
                      onChange={(e) => set(i, { on: e.target.checked })}
                    />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="input min-h-10"
                        value={x.name}
                        maxLength={160}
                        aria-label="Alimento"
                        onChange={(e) => set(i, { name: e.target.value })}
                      />
                      <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="min-h-10 w-12 shrink-0 rounded-lg border border-line text-sm font-medium text-ink-700 hover:border-brand-200 hover:bg-brand-50"
                        aria-label={`${x.name}: ${x.liquid ? "líquido (ml)" : "sólido (g)"}. Trocar`}
                        title={x.liquid ? "Líquido: trocar para sólido" : "Sólido: trocar para líquido"}
                        onClick={() => set(i, { liquid: !x.liquid })}
                      >
                        {x.liquid ? "ml" : "g"}
                      </button>
                      <NumberField
                        className="w-28"
                        unit={x.liquid ? "ml" : "g"}
                        min={1}
                        max={3000}
                        aria-label={x.liquid ? "Mililitros" : "Gramas"}
                        value={x.grams || null}
                        onChange={(v) => set(i, { grams: v ?? 0 })}
                        placeholder="0"
                      />
                      </span>
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                      {kcal((x.grams * x.kcalPer100g) / 100)}
                    </span>
                  </li>
                ))}
              </ul>
              {note && <p className="mt-2 text-[13px] text-ink-500">{note}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Total: <strong className="tabular-nums">{kcal(total)}</strong>{" "}
                  · estimativa da IA
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setItems(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!chosen.length}
                    onClick={() => {
                      onAdd(
                        chosen.map(({ name, grams, kcalPer100g, liquid }) => ({
                          name: name.trim(),
                          grams,
                          liquid,
                          kcalPer100g,
                        })),
                        note,
                      );
                      setItems(null);
                    }}
                  >
                    <RiCheckLine size={18} /> Adicionar {chosen.length}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
