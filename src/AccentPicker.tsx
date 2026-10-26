import { RiCheckLine, RiPaletteLine } from "react-icons/ri";
import { DEFAULT_ACCENT, PRESETS, palette } from "./theme";

/** Escolha da cor do app: predefinições ou qualquer cor (seletor nativo). */
export default function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const current = value.toLowerCase();
  const custom = !PRESETS.some((p) => p.hex === current);
  return (
    <div>
      <div
        className="flex flex-wrap gap-2.5"
        role="radiogroup"
        aria-label="Cor do app"
      >
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={current === p.hex}
            aria-label={p.label}
            title={p.label}
            className="grid size-10 place-items-center rounded-full text-white ring-offset-2 transition-transform hover:scale-105 aria-checked:ring-2 aria-checked:ring-ink-900"
            style={{ background: p.hex }}
            onClick={() => onChange(p.hex)}
          >
            {current === p.hex && <RiCheckLine className="size-5" />}
          </button>
        ))}
        <label
          title="Escolher qualquer cor"
          className={`relative grid size-10 cursor-pointer place-items-center rounded-full text-white ring-offset-2 hover:scale-105 ${custom ? "ring-2 ring-ink-900" : ""}`}
          style={{
            background: custom
              ? current
              : "conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)",
          }}
        >
          {custom ? (
            <RiCheckLine className="size-5" />
          ) : (
            <RiPaletteLine className="size-5" />
          )}
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Escolher qualquer cor"
            value={current}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-2" aria-hidden>
        {["100", "300", "600", "800"].map((k) => (
          <span
            key={k}
            className="h-2 flex-1 rounded-full"
            style={{ background: palette(current)[k] }}
          />
        ))}
      </div>
      <p className="hint">
        Muda a cor de todo o app. Cores muito claras são escurecidas nos botões
        para o texto continuar legível. No Android, o ícone usa a cor da lista
        mais próxima da escolhida.
      </p>
      {current !== DEFAULT_ACCENT && (
        <button
          type="button"
          className="btn-ghost mt-2 -ml-2"
          onClick={() => onChange(DEFAULT_ACCENT)}
        >
          Voltar para o vermelho
        </button>
      )}
    </div>
  );
}
