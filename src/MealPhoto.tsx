import { useState } from "react";
import { RiCameraLine, RiCheckLine } from "react-icons/ri";
import { readImage, type MealReading } from "./readImage";

type Item = MealReading["items"][number] & { on: boolean };
const kcal = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} kcal`;

/**
 * Foto do prato → a IA sugere os itens com porção e kcal/100 g; a pessoa
 * revisa (desmarca, corrige nome e gramas) antes de adicionar ao diário.
 */
export default function MealPhoto({
  disabled,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: (items: MealReading["items"], note: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function read(file: File) {
    setBusy(true);
    setError("");
    setItems(null);
    try {
      const r = await readImage("meal", file);
      if (!r.items?.length)
        throw Error(
          "Não reconhecemos alimentos na foto. Tente outra foto, de cima e com boa luz, ou registre à mão.",
        );
      setItems(r.items.map((x) => ({ ...x, on: true })));
      setNote(r.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler a foto.");
    } finally {
      setBusy(false);
    }
  }
  const set = (i: number, patch: Partial<Item>) =>
    setItems((list) => list!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const chosen = (items ?? []).filter(
    (x) => x.on && x.name.trim() && x.grams > 0,
  );
  const total = chosen.reduce((s, x) => s + (x.grams * x.kcalPer100g) / 100, 0);

  return (
    <>
      <label
        className={`btn-secondary relative overflow-hidden ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}
      >
        <RiCameraLine size={18} />
        {busy ? "Analisando…" : "Foto do prato"}
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
      {(error || items) && (
        <div className="order-last w-full basis-full rounded-lg border border-line bg-surface p-4">
          {error ? (
            <p className="text-sm text-brand-800" role="alert">
              {error}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold">O que a IA viu no prato</p>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Desmarque o que não comeu e ajuste nomes e gramas antes de
                adicionar.
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
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_7rem]">
                      <input
                        className="input min-h-10"
                        value={x.name}
                        maxLength={160}
                        aria-label="Alimento"
                        onChange={(e) => set(i, { name: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          className="input min-h-10 w-24"
                          type="number"
                          inputMode="decimal"
                          min="1"
                          max="3000"
                          value={x.grams || ""}
                          aria-label="Gramas"
                          onChange={(e) =>
                            set(i, { grams: Number(e.target.value) })
                          }
                        />
                        <span className="text-sm text-ink-500">g</span>
                      </div>
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
                        chosen.map(({ name, grams, kcalPer100g }) => ({
                          name: name.trim(),
                          grams,
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
    </>
  );
}
