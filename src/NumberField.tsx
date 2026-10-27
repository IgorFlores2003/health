import { useEffect, useRef, useState } from "react";

/**
 * Campo numérico com máscara: os dígitos entram pela direita com as casas
 * decimais fixas (785 → 78,5 kg; 183 → 1,83 m) e a unidade fica no fim.
 *
 * - Com `name`, o valor vai num campo oculto para o FormData, já na unidade
 *   guardada (`factor`: 1,83 m × 100 → 183 cm). readImage.fill() também
 *   preenche esse campo oculto e o texto visível acompanha.
 * - Controlado: `value`/`onChange`, na unidade guardada.
 */
export default function NumberField({
  name,
  value,
  defaultValue,
  onChange,
  decimals = 0,
  factor = 1,
  unit,
  min,
  max,
  required,
  placeholder,
  autoFocus,
  className = "",
  "aria-label": ariaLabel,
}: {
  name?: string;
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  /** Casas decimais mostradas (na unidade exibida). */
  decimals?: number;
  /** Valor guardado = valor exibido × factor. */
  factor?: number;
  unit: string;
  /** Limites na unidade guardada. */
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const controlled = value !== undefined;
  const [own, setOwn] = useState<number | null>(defaultValue ?? null);
  const stored = controlled ? value : own;
  const hidden = useRef<HTMLInputElement>(null);
  const visible = useRef<HTMLInputElement>(null);
  const scale = 10 ** decimals;
  const set = (v: number | null) => {
    if (!controlled) setOwn(v);
    onChange?.(v);
  };
  // Preenchimento pela IA (readImage.fill) chega pelo campo oculto.
  useEffect(() => {
    const el = hidden.current;
    if (!el) return;
    const onFill = () => set(el.value === "" ? null : Number(el.value));
    el.addEventListener("fill", onFill);
    return () => el.removeEventListener("fill", onFill);
  });
  const shown = stored === null || stored === undefined ? null : stored / factor;
  const text =
    shown === null
      ? ""
      : shown.toLocaleString("pt-BR", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  // Fora dos limites: mensagem nativa do formulário ao salvar.
  useEffect(() => {
    const el = visible.current;
    if (!el) return;
    const fmt = (v: number) =>
      `${(v / factor).toLocaleString("pt-BR", { maximumFractionDigits: decimals })} ${unit}`;
    el.setCustomValidity(
      stored == null
        ? ""
        : min !== undefined && stored < min
          ? `Use no mínimo ${fmt(min)}.`
          : max !== undefined && stored > max
            ? `Use no máximo ${fmt(max)}.`
            : "",
    );
  }, [stored, min, max, factor, decimals, unit]);
  return (
    <span className={"relative block " + className}>
      <input
        ref={visible}
        className="input pr-14 tabular-nums"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        required={required}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
          if (!digits) return set(null);
          // Até 7 dígitos: cobre todos os campos do app.
          if (digits.length > 7) return;
          set(Math.round((Number(digits) / scale) * factor * 1e6) / 1e6);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-500">
        {unit}
      </span>
      {name && (
        <input
          ref={hidden}
          type="hidden"
          name={name}
          value={stored == null ? "" : String(stored)}
        />
      )}
    </span>
  );
}
