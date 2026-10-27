import { useEffect, useRef, useState } from "react";
import {
  RiCloudLine,
  RiCloudOffLine,
  RiLogoutBoxRLine,
  RiUser3Line,
} from "react-icons/ri";
import { Avatar } from "./photos";
import type { SyncStatus } from "./sync";

/** Foto do usuário com o menu da conta (perfil e sair). */
export function AccountMenu({
  photo,
  name,
  email,
  onProfile,
  onSignOut,
  compact,
  up,
  className = "",
}: {
  photo?: string;
  name: string;
  email: string;
  onProfile: () => void;
  onSignOut: () => void;
  compact?: boolean;
  /** Abre o menu para cima (rodapé da barra lateral). */
  up?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-surface";
  return (
    <div ref={ref} className={"relative " + className}>
      <button
        className={
          compact
            ? "flex rounded-full"
            : "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar path={photo} name={name} size={compact ? 32 : 36} />
        {!compact && (
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold">
              {name || "Seu perfil"}
            </strong>
            <small className="block truncate text-xs text-ink-500">
              {email || "Salvo neste aparelho"}
            </small>
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={
            "absolute z-30 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg " +
            (up ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2")
          }
        >
          {compact && email && (
            <p className="truncate px-3 pt-2 pb-1 text-xs text-ink-500">
              {email}
            </p>
          )}
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
          >
            <RiUser3Line className="size-5 text-ink-500" /> Ver perfil
          </button>
          <button
            role="menuitem"
            className={item + " text-brand-700 hover:bg-brand-50"}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <RiLogoutBoxRLine className="size-5" /> Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
const syncText: Record<SyncStatus, string> = {
  loading: "Carregando da conta…",
  saving: "Salvando na conta…",
  saved: "Salvo na conta",
  offline: "Sem conexão: salvo no aparelho, envia quando voltar",
  off: "Salvo só neste aparelho",
};
export function SyncBadge({
  status,
  label,
}: {
  status: SyncStatus;
  label?: boolean;
}) {
  const ok = status === "saved" || status === "saving" || status === "loading";
  const Icon = ok ? RiCloudLine : RiCloudOffLine;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={syncText[status]}
      aria-live="polite"
    >
      <Icon
        className={`size-[18px] ${status === "saved" ? "text-ink-400" : ok ? "animate-pulse text-brand-600" : "text-brand-700"}`}
      />
      {label ? (
        syncText[status]
      ) : (
        <span className="sr-only">{syncText[status]}</span>
      )}
    </span>
  );
}
