import { useEffect, useRef, useState } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
} from "react-icons/ri";

type Request = { urls: string[]; index: number };
let show: ((r: Request) => void) | null = null;

/**
 * Abre fotos em tela cheia dentro do próprio app (no Android, abrir a URL
 * num link levava para o navegador e tirava a pessoa do app).
 */
export function openImages(urls: string[], index = 0) {
  const list = urls.filter(Boolean);
  if (!list.length) return;
  if (show) show({ urls: list, index: Math.min(index, list.length - 1) });
}

/** Renderize uma vez na raiz do app. */
export function ImageViewerHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [zoom, setZoom] = useState(false);
  const touch = useRef<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    show = (r) => {
      setZoom(false);
      setReq(r);
    };
    return () => {
      show = null;
    };
  }, []);
  const count = req?.urls.length ?? 0;
  const go = (step: number) => {
    setZoom(false);
    setReq((r) =>
      r ? { ...r, index: (r.index + step + r.urls.length) % r.urls.length } : r,
    );
  };
  useEffect(() => {
    if (!req) return;
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setReq(null);
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    // Captura: o Esc fecha só a foto, não o formulário que está por baixo.
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.body.style.overflow = document.querySelector("[role=dialog]")
        ? "hidden"
        : "";
      previous?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!req]);
  if (!req) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto em tela cheia"
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
      onTouchStart={(e) => {
        touch.current = zoom ? null : e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touch.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <span className="px-3 text-sm text-white/70 tabular-nums">
          {count > 1 ? `${req.index + 1} de ${count}` : ""}
        </span>
        <button
          ref={closeBtn}
          className="grid size-12 place-items-center rounded-full hover:bg-white/10"
          aria-label="Fechar foto"
          onClick={() => setReq(null)}
        >
          <RiCloseLine className="size-7" />
        </button>
      </div>
      <div
        className={`relative flex-1 ${zoom ? "overflow-auto" : "grid place-items-center overflow-hidden"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setReq(null);
        }}
      >
        <img
          src={req.urls[req.index]}
          alt=""
          onClick={() => setZoom((z) => !z)}
          className={
            zoom
              ? "max-w-none cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain"
          }
          style={zoom ? { width: "200%" } : undefined}
        />
      </div>
      <p className="py-2 text-center text-xs text-white/50">
        Toque na foto para ampliar
        {count > 1 ? " · deslize para ver as outras" : ""}
      </p>
      {count > 1 && (
        <>
          <button
            className="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-white/10"
            aria-label="Foto anterior"
            onClick={() => go(-1)}
          >
            <RiArrowLeftSLine className="size-8" />
          </button>
          <button
            className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-white/10"
            aria-label="Próxima foto"
            onClick={() => go(1)}
          >
            <RiArrowRightSLine className="size-8" />
          </button>
        </>
      )}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
