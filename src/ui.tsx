import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiArrowRightSLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleFill,
} from "react-icons/ri";

/** Peças de layout repetidas nas telas do app. */
export const dateLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
/**
 * Cards minimizáveis: a escolha fica neste aparelho (localStorage) e vale
 * para todas as telas que usam o mesmo id.
 */
const FOLD_KEY = "ritmo-folded";
const foldListeners = new Set<() => void>();
function readFolded(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FOLD_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function useFold(id?: string, persist = true) {
  const [local, setLocal] = useState(false);
  const [saved, setSaved] = useState(() =>
    id && persist ? readFolded().includes(id) : false,
  );
  useEffect(() => {
    if (!id || !persist) return;
    const sync = () => setSaved(readFolded().includes(id));
    foldListeners.add(sync);
    return () => {
      foldListeners.delete(sync);
    };
  }, [id, persist]);
  const folded = persist ? saved : local;
  const toggle = () => {
    if (!id) return;
    if (!persist) return setLocal((f) => !f);
    const list = readFolded().filter((x) => x !== id);
    try {
      localStorage.setItem(
        FOLD_KEY,
        JSON.stringify(folded ? list : [...list, id]),
      );
    } catch {
      /* sem armazenamento: vale só agora */
    }
    setSaved(!folded);
    foldListeners.forEach((f) => f());
  };
  return [folded, toggle] as const;
}
const FoldContext = createContext<{
  folded: boolean;
  toggle: () => void;
} | null>(null);

/**
 * Card do app. Com `fold`, ganha o botão de minimizar (FoldToggle, já
 * incluído no CardHeader): minimizado, só o primeiro filho (o cabeçalho)
 * continua visível.
 */
export function Panel({
  children,
  className = "",
  id,
  fold,
  foldPersist = true,
  highlight,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Id para lembrar se está minimizado. */
  fold?: string;
  /** false: minimizar vale só enquanto a tela está aberta. */
  foldPersist?: boolean;
  /** Acabou de ser registrado: rola até ele e destaca. */
  highlight?: boolean;
}) {
  const [folded, toggle] = useFold(fold, foldPersist);
  const ref = useFlash<HTMLElement>(highlight);
  return (
    <FoldContext.Provider value={fold ? { folded, toggle } : null}>
      <section
        ref={ref}
        id={id}
        data-folded={fold && folded ? "true" : undefined}
        className={"card min-w-0 " + className}
      >
        {children}
      </section>
    </FoldContext.Provider>
  );
}
/** Botão de minimizar/expandir do card (só aparece em Panel com fold). */
export function FoldToggle({ title }: { title: string }) {
  const ctx = useContext(FoldContext);
  if (!ctx) return null;
  const Icon = ctx.folded ? RiArrowDownSLine : RiArrowUpSLine;
  return (
    <button
      type="button"
      className="icon-btn -my-1.5 -mr-2 ml-auto shrink-0"
      aria-expanded={!ctx.folded}
      aria-label={`${ctx.folded ? "Expandir" : "Minimizar"} ${title}`}
      title={ctx.folded ? "Expandir" : "Minimizar"}
      onClick={ctx.toggle}
    >
      <Icon className="size-6" />
    </button>
  );
}
/**
 * Registro recém-salvo: rola até ele e pisca a borda por uns segundos,
 * para a pessoa ver onde ele foi parar.
 */
export function useFlash<T extends HTMLElement>(on: boolean | undefined) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
    }, 80);
    const off = setTimeout(() => el.classList.remove("flash"), 3200);
    return () => {
      clearTimeout(t);
      clearTimeout(off);
      el.classList.remove("flash");
    };
  }, [on]);
  return ref;
}
export function CardHeader({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {text && <p className="mt-0.5 text-sm text-ink-500">{text}</p>}
      </div>
      <span className="flex shrink-0 items-start gap-1">
        {children}
        <FoldToggle title={title} />
      </span>
    </div>
  );
}
export function Stat({
  icon,
  label,
  value,
  unit,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-500">{label}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-[18px]">
          {icon}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        <small className="text-sm font-normal tracking-normal text-ink-500">
          {unit}
        </small>
      </div>
      <p className="mt-1 text-[13px] text-ink-500">{detail}</p>
    </Panel>
  );
}
export function QuickAction({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-surface"
      onClick={onClick}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">
        {icon}
      </span>
      <span className="flex-1">{title}</span>
      <RiArrowRightSLine className="size-5 text-ink-400" />
    </button>
  );
}
export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: () => void;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="mb-1 grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">
        {icon}
      </span>
      <strong className="font-semibold">{title}</strong>
      <p className="text-sm text-ink-500">{text}</p>
      <button className="btn-ghost mt-1" onClick={action}>
        <RiAddLine className="size-4" /> Registrar peso
      </button>
    </div>
  );
}
export function PageTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-ink-500">{text}</p>
    </div>
  );
}

/** Item de checklist: círculo com check na cor do app quando feito. */
export function CheckItem({
  done,
  children,
}: {
  done: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      {done ? (
        <RiCheckboxCircleFill className="size-5 shrink-0 text-brand-600" />
      ) : (
        <RiCheckboxBlankCircleLine className="size-5 shrink-0 text-ink-400" />
      )}
      <span className={done ? "text-ink-900" : "text-ink-500"}>{children}</span>
      <span className="sr-only">{done ? "(feito)" : "(pendente)"}</span>
    </span>
  );
}

/** "agora", "há 5 min", "há 2 h" ou a data. */
export const ago = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

/** Atalho grande (ícone em cima, nome embaixo), todos do mesmo tamanho. */
export function Tile({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 py-3 text-center text-[13px] leading-tight font-medium text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      onClick={onClick}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">
        {icon}
      </span>
      {label}
    </button>
  );
}
