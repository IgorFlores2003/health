import { useEffect, useRef, useState } from "react";
import { RiDeleteBin6Line, RiQuestionLine } from "react-icons/ri";

type Options = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type Request = Options & { resolve: (ok: boolean) => void };
let show: ((r: Request) => void) | null = null;

/** Substitui window.confirm: abre o modal de confirmação e resolve com a escolha. */
export function confirmDialog(options: Options) {
  return new Promise<boolean>((resolve) => {
    if (!show) return resolve(window.confirm(options.title));
    show({ ...options, resolve });
  });
}

/** Renderize uma vez na raiz do app. */
export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    show = (r) => setReq(r);
    return () => {
      show = null;
    };
  }, []);
  useEffect(() => {
    if (!req) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmBtn.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [req]);
  if (!req) return null;
  function close(ok: boolean) {
    req!.resolve(ok);
    setReq(null);
  }
  const Icon = req.danger ? RiDeleteBin6Line : RiQuestionLine;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && close(false)}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={req.message ? "confirm-text" : undefined}
        className="w-full rounded-t-2xl bg-white px-5 pt-6 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-lg sm:max-w-sm sm:rounded-2xl sm:pb-5"
      >
        <span
          className={`mb-4 grid size-11 place-items-center rounded-full ${req.danger ? "bg-brand-50 text-brand-600" : "bg-surface text-ink-700"}`}
        >
          <Icon className="size-[22px]" />
        </span>
        <h2 id="confirm-title" className="text-lg font-semibold">
          {req.title}
        </h2>
        {req.message && (
          <p id="confirm-text" className="mt-1.5 text-sm text-ink-500">
            {req.message}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" onClick={() => close(false)}>
            {req.cancelLabel || "Cancelar"}
          </button>
          <button
            ref={confirmBtn}
            className="btn-primary"
            onClick={() => close(true)}
          >
            {req.confirmLabel || "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  );
}
