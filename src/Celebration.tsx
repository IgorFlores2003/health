import { useEffect, useRef } from "react";
import { RiRocket2Fill } from "react-icons/ri";

export type CelebrationKind = "confetti" | "rocket";
const DURATION = { confetti: 3200, rocket: 2600 };

/**
 * Animação por cima da tela ao bater uma meta: confete (água) ou foguete
 * (peso). Não bloqueia toques e some sozinha. Com "reduzir movimento"
 * ativado no aparelho, não anima (o aviso em texto continua).
 */
export default function Celebration({
  kind,
  onDone,
}: {
  kind: CelebrationKind;
  onDone: () => void;
}) {
  const reduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => done.current(), reduced ? 0 : DURATION[kind]);
    return () => clearTimeout(id);
  }, [kind, reduced]);
  if (reduced) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {kind === "confetti" ? <Confetti /> : <Rocket />}
    </div>
  );
}

function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const brand = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-brand-500")
      .trim();
    const colors = [brand || "#ee3636", "#38bdf8", "#22c55e", "#facc15", "#a855f7", "#f97316"];
    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * innerWidth,
      y: -20 - Math.random() * innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3.5,
      size: 6 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      vspin: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    const start = performance.now();
    const draw = (t: number) => {
      const fade = Math.max(0, 1 - Math.max(0, t - start - 2200) / 1000);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.spin += p.vspin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (fade > 0) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} className="size-full" />;
}

function Rocket() {
  return (
    <div className="animate-rocket absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
      <RiRocket2Fill className="size-20 text-brand-600 drop-shadow-lg" />
      <span className="mt-1 h-24 w-3 rounded-full bg-gradient-to-b from-amber-400 via-orange-400 to-transparent blur-[2px]" />
    </div>
  );
}
