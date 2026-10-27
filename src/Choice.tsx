import type { ReactNode } from "react";

type Option<T extends string> = { id: T; label: ReactNode };

/**
 * Escolha de uma opção (radiogroup). "bar": botões lado a lado num contorno
 * (período, g/ml, tema). "chips": pílulas soltas (copos, temas).
 */
export default function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "bar",
  className = "",
}: {
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Nome do grupo para leitores de tela. */
  label: string;
  variant?: "bar" | "chips";
  className?: string;
}) {
  const bar = variant === "bar";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        (bar
          ? "flex flex-wrap rounded-lg border border-line p-0.5 "
          : "flex flex-wrap gap-2 ") + className
      }
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={
            bar
              ? `flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium ${value === o.id ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface"}`
              : "min-h-9 rounded-full border border-line px-3 text-sm text-ink-700 aria-checked:border-brand-500 aria-checked:bg-brand-50 aria-checked:font-medium aria-checked:text-brand-700"
          }
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
