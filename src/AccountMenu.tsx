import { RiCloudLine, RiCloudOffLine } from "react-icons/ri";
import { Avatar } from "./photos";
import type { SyncStatus } from "./sync";

/** Foto do usuário: toque para abrir o perfil (em Configurações). */
export function AccountMenu({
  photo,
  name,
  email,
  onProfile,
  compact,
  className = "",
}: {
  photo?: string;
  name: string;
  email: string;
  onProfile: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        className={
          compact
            ? "flex rounded-full"
            : "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
        }
        aria-label="Abrir meu perfil"
        title="Meu perfil"
        onClick={onProfile}
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
