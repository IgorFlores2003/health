import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RiAnticlockwiseLine, RiRefreshLine } from "react-icons/ri";
import Choice from "./Choice";
import Sheet from "./Sheet";

const VIEW = 288; // maior lado da área de edição na tela (px CSS)
const MIN_ZOOM = 0.5;
type Aspect = "original" | "1" | "4/3" | "3/4";
type Edit = {
  aspect: Aspect;
  zoom: number;
  x: number; // deslocamento em px da área de edição
  y: number;
  turn: number; // quartos de volta
  brightness: number; // %
  contrast: number; // %
};
const START: Edit = {
  aspect: "original",
  zoom: 1,
  x: 0,
  y: 0,
  turn: 0,
  brightness: 100,
  contrast: 100,
};

/** Lados da foto já girada. */
function turned(img: HTMLImageElement, turn: number) {
  return turn % 2 ? [img.height, img.width] : [img.width, img.height];
}
/** Moldura (largura, altura) com maior lado `long`, no formato escolhido. */
function frame(img: HTMLImageElement, e: Edit, long: number) {
  const [w, h] = turned(img, e.turn);
  const ratio =
    e.aspect === "original"
      ? w / h
      : e.aspect === "1"
        ? 1
        : e.aspect === "4/3"
          ? 4 / 3
          : 3 / 4;
  return ratio >= 1 ? [long, long / ratio] : [long * ratio, long];
}

/** Desenha a foto editada numa moldura cujo maior lado é `long`. */
function draw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  e: Edit,
  long: number,
) {
  const [fw, fh] = frame(img, e, long);
  const [w, h] = turned(img, e.turn);
  const k = long / VIEW;
  const scale = Math.max(fw / w, fh / h) * e.zoom;
  // Com zoom abaixo de 1× sobra espaço: fundo branco.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, fw, fh);
  ctx.save();
  ctx.filter = `brightness(${e.brightness}%) contrast(${e.contrast}%)`;
  ctx.translate(fw / 2 + e.x * k, fh / 2 + e.y * k);
  ctx.rotate((e.turn * Math.PI) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

/** Mantém a foto cobrindo a moldura (sem bordas vazias ao arrastar). */
function clamp(img: HTMLImageElement, e: Edit): Edit {
  const [fw, fh] = frame(img, e, VIEW);
  const [w, h] = turned(img, e.turn);
  const scale = Math.max(fw / w, fh / h) * e.zoom;
  // Maior que a moldura: não deixa borda vazia; menor: não sai da moldura.
  const maxX = Math.abs(w * scale - fw) / 2;
  const maxY = Math.abs(h * scale - fh) / 2;
  return {
    ...e,
    x: Math.max(-maxX, Math.min(maxX, e.x)),
    y: Math.max(-maxY, Math.min(maxY, e.y)),
  };
}

/**
 * Editor de foto: arrastar para enquadrar, zoom (barra, pinça ou rodinha),
 * girar, brilho e contraste. No perfil (`round`) a moldura é um círculo;
 * nos registros dá para escolher o formato. Salva um JPEG com o
 * enquadramento mostrado.
 */
export default function PhotoEditor({
  source,
  round = false,
  onSave,
  onClose,
}: {
  source: Blob;
  /** Foto de perfil: moldura redonda, quadrada, 800 px. */
  round?: boolean;
  onSave: (file: File) => void;
  onClose: () => void;
}) {
  const OUT = round ? 800 : 1600;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [edit, setEdit] = useState<Edit>(
    round ? { ...START, aspect: "1" } : START,
  );
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
    const [fw, fh] = frame(img, edit, VIEW * dpr);
    c.width = fw;
    c.height = fh;
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
          Math.max(MIN_ZOOM, (pinch.current.zoom * dist) / pinch.current.dist),
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
    [out.width, out.height] = frame(img, edit, OUT).map(Math.round);
    draw(out.getContext("2d")!, img, edit, OUT);
    out.toBlob(
      (blob) =>
        blob && onSave(new File([blob], "foto.jpg", { type: "image/jpeg" })),
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
          {!round && img && (
            <Choice
              className="mb-4"
              label="Formato"
              value={edit.aspect}
              onChange={(aspect) => update({ aspect, x: 0, y: 0 })}
              options={[
                { id: "original", label: "Original" },
                { id: "1", label: "Quadrado" },
                { id: "4/3", label: "4:3" },
                { id: "3/4", label: "3:4" },
              ]}
            />
          )}
          <div
            className="relative mx-auto overflow-hidden rounded-xl bg-ink-900"
            style={
              img
                ? (([w, h]) => ({ width: w, height: h }))(
                    frame(img, edit, VIEW),
                  )
                : { width: VIEW, height: VIEW }
            }
          >
            <canvas
              ref={canvas}
              className="size-full cursor-grab touch-none active:cursor-grabbing"
              aria-label="Arraste para centralizar a foto"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onWheel={(e) =>
                update({
                  zoom: Math.min(
                    4,
                    Math.max(MIN_ZOOM, edit.zoom - e.deltaY / 500),
                  ),
                })
              }
            />
            {/* Fora do círculo fica escurecido: é o que sai no avatar. */}
            {round && (
              <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0/0.45)]" />
            )}
          </div>
          <p className="mt-2 text-center text-[13px] text-ink-500">
            Arraste para centralizar. Use dois dedos ou a rodinha para o zoom.
          </p>
          <div className="mt-4 space-y-3">
            {slider("Zoom", "zoom", MIN_ZOOM, 4, 0.01)}
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
                onClick={() =>
                  setEdit(round ? { ...START, aspect: "1" } : START)
                }
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
