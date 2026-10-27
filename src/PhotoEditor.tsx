import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RiAnticlockwiseLine, RiRefreshLine } from "react-icons/ri";
import Sheet from "./Sheet";

const VIEW = 288; // lado da área de edição na tela (px CSS)
const OUT = 800; // lado da foto salva (px)
type Edit = {
  zoom: number;
  x: number; // deslocamento em px da área de edição
  y: number;
  turn: number; // quartos de volta
  brightness: number; // %
  contrast: number; // %
};
const START: Edit = {
  zoom: 1,
  x: 0,
  y: 0,
  turn: 0,
  brightness: 100,
  contrast: 100,
};

/** Desenha a foto editada num quadrado de lado `size`. */
function draw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  e: Edit,
  size: number,
) {
  const k = size / VIEW;
  const sideways = e.turn % 2 === 1;
  const w = sideways ? img.height : img.width;
  const h = sideways ? img.width : img.height;
  const scale = (size / Math.min(w, h)) * e.zoom;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.filter = `brightness(${e.brightness}%) contrast(${e.contrast}%)`;
  ctx.translate(size / 2 + e.x * k, size / 2 + e.y * k);
  ctx.rotate((e.turn * Math.PI) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

/** Mantém a foto cobrindo o quadrado (sem bordas vazias ao arrastar). */
function clamp(img: HTMLImageElement, e: Edit): Edit {
  const sideways = e.turn % 2 === 1;
  const w = sideways ? img.height : img.width;
  const h = sideways ? img.width : img.height;
  const scale = (VIEW / Math.min(w, h)) * e.zoom;
  const maxX = (w * scale - VIEW) / 2;
  const maxY = (h * scale - VIEW) / 2;
  return {
    ...e,
    x: Math.max(-maxX, Math.min(maxX, e.x)),
    y: Math.max(-maxY, Math.min(maxY, e.y)),
  };
}

/**
 * Editor da foto de perfil: arrastar para centralizar no círculo, zoom
 * (barra, pinça ou rodinha), girar, brilho e contraste. Salva um JPEG
 * quadrado com o enquadramento mostrado.
 */
export default function PhotoEditor({
  source,
  onSave,
  onClose,
}: {
  source: Blob;
  onSave: (file: File) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [edit, setEdit] = useState(START);
  const [error, setError] = useState("");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError("Não foi possível abrir a imagem.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [source]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.height = VIEW * dpr;
    draw(c.getContext("2d")!, img, edit, VIEW * dpr);
  }, [img, edit]);

  const update = (patch: Partial<Edit>) =>
    img && setEdit((e) => clamp(img, { ...e, ...patch }));

  function down(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: edit.zoom,
      };
    }
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      update({
        zoom: Math.min(
          4,
          Math.max(1, (pinch.current.zoom * dist) / pinch.current.dist),
        ),
      });
    } else
      update({
        x: edit.x + e.clientX - prev.x,
        y: edit.y + e.clientY - prev.y,
      });
  }
  function up(e: PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function save() {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = out.height = OUT;
    draw(out.getContext("2d")!, img, edit, OUT);
    out.toBlob(
      (blob) =>
        blob && onSave(new File([blob], "perfil.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.9,
    );
  }

  const slider = (
    label: string,
    key: "zoom" | "brightness" | "contrast",
    min: number,
    max: number,
    step: number,
  ) => (
    <label className="block">
      <span className="label flex justify-between">
        {label}
        <span className="font-normal text-ink-500 tabular-nums">
          {key === "zoom"
            ? `${edit.zoom.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}×`
            : `${edit[key]}%`}
        </span>
      </span>
      <input
        type="range"
        className="w-full accent-brand-600"
        min={min}
        max={max}
        step={step}
        value={edit[key]}
        onChange={(e) => update({ [key]: Number(e.target.value) })}
      />
    </label>
  );

  return (
    <Sheet title="Ajustar foto" onClose={onClose}>
      {error ? (
        <p role="alert" className="text-sm text-brand-700">
          {error}
        </p>
      ) : (
        <>
          <div
            className="relative mx-auto overflow-hidden rounded-xl bg-ink-900"
            style={{ width: VIEW, height: VIEW }}
          >
            <canvas
              ref={canvas}
              className="size-full cursor-grab touch-none active:cursor-grabbing"
              style={{ width: VIEW, height: VIEW }}
              aria-label="Arraste para centralizar a foto"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onWheel={(e) =>
                update({
                  zoom: Math.min(4, Math.max(1, edit.zoom - e.deltaY / 500)),
                })
              }
            />
            {/* Fora do círculo fica escurecido: é o que sai no avatar. */}
            <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0/0.45)]" />
          </div>
          <p className="mt-2 text-center text-[13px] text-ink-500">
            Arraste para centralizar. Use dois dedos ou a rodinha para o zoom.
          </p>
          <div className="mt-4 space-y-3">
            {slider("Zoom", "zoom", 1, 4, 0.01)}
            {slider("Brilho", "brightness", 50, 150, 1)}
            {slider("Contraste", "contrast", 50, 150, 1)}
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => update({ turn: (edit.turn + 3) % 4 })}
              >
                <RiAnticlockwiseLine className="size-5" /> Girar
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEdit(START)}
              >
                <RiRefreshLine className="size-5" /> Restaurar
              </button>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!img}
              onClick={save}
            >
              Salvar foto
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
