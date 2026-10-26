import { useEffect, useRef, type ReactNode } from "react";
import { RiCloseLine } from "react-icons/ri";

/** Modal padrão do app: folha inferior no celular, janela larga no computador. */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      // Com o modal de confirmação aberto, o Esc é dele.
      if (e.key === "Escape" && !document.querySelector("[role=alertdialog]"))
        close.current();
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={box}
        className="max-h-[calc(100dvh-24px-env(safe-area-inset-top))] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-sm sm:max-w-md sm:rounded-2xl sm:pb-5 md:max-w-3xl md:px-7 md:pt-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="sheet-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn -mr-2"
            aria-label="Fechar"
            onClick={onClose}
          >
            <RiCloseLine className="size-6" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
