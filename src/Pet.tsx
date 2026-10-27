import { PET_PHASES, petStage, type PetStage } from "./gamification";

const INK = "#1f1f23";
const CRACKS = [
  "M48 34 l5 7 l-4 5 l6 6",
  "M70 30 l-4 8 l5 4 l-3 7",
  "M40 52 l7 3 l-2 6 l7 2",
  "M78 50 l-6 4 l3 6 l-6 3",
];

/** Tamanho de cada forma: começa menor e cresce um pouco a cada nível. */
const SIZE = {
  egg: [1, 0],
  baby: [0.6, 0.15],
  young: [0.78, 0.12],
  adult: [0.9, 0.1],
} as const;

/** Desenho do bichinho na fase atual (ovo, pintinho, galeto, galo…). */
export function PetArt({
  stage,
  sad = false,
  className = "size-28",
  alive = false,
}: {
  stage: PetStage;
  /** Com sede ou fome: carinha triste. */
  sad?: boolean;
  className?: string;
  /** Sempre se mexendo, até o ovo parado (ex.: no Perfil). */
  alive?: boolean;
}) {
  const motion = {
    still: alive ? "animate-rit" : "",
    shake: "animate-shake",
    wobble: "animate-wobble",
    idle: "animate-rit",
  }[stage.motion];
  const [base, extra] = SIZE[stage.form];
  const scale = base + extra * stage.growth;
  const croc = stage.line === "croc";
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} shrink-0 overflow-visible`}
      aria-hidden
    >
      <ellipse cx="60" cy="114" rx="30" ry="4" fill="rgb(0 0 0 / 0.1)" />
      <g className={motion} style={{ transformOrigin: "60px 112px" }}>
        {stage.form === "egg" ? (
          <Egg croc={croc} cracks={stage.cracks} glow={stage.step >= 1} />
        ) : (
          <g
            transform={`translate(60 112) scale(${scale}) translate(-60 -112)`}
          >
            {croc ? (
              <Croc stage={stage} sad={sad} />
            ) : stage.form === "baby" ? (
              <Chick step={stage.step} sad={sad} />
            ) : stage.form === "young" ? (
              <Pullet stage={stage} sad={sad} />
            ) : (
              <Rooster stage={stage} sad={sad} />
            )}
          </g>
        )}
      </g>
    </svg>
  );
}

function Egg({
  croc,
  cracks,
  glow,
}: {
  croc: boolean;
  cracks: number;
  /** Brilho em volta: algo está para acontecer. */
  glow: boolean;
}) {
  return (
    <>
      {glow && (
        <ellipse
          cx="60"
          cy="68"
          rx="42"
          ry="52"
          fill={croc ? "#bbf7d0" : "#fef08a"}
          opacity="0.45"
        />
      )}
      <ellipse
        cx="60"
        cy="68"
        rx="34"
        ry="44"
        fill={croc ? "#e7f0d4" : "#fdf3dc"}
        stroke={croc ? "#9cb77a" : "#e7cf9f"}
        strokeWidth="2"
      />
      {(croc
        ? [
            [44, 60, 4],
            [72, 48, 3],
            [66, 84, 5],
            [50, 92, 3],
            [80, 74, 3],
          ]
        : [
            [46, 58, 3],
            [74, 52, 4],
            [62, 88, 3],
          ]
      ).map(([x, y, r]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill={croc ? "#7da85a" : "#e9c995"}
          opacity="0.7"
        />
      ))}
      {CRACKS.slice(0, cracks).map((d) => (
        <path
          key={d}
          d={d}
          stroke="#6b5a3e"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

function Eyes({
  x1,
  x2,
  y,
  sad,
}: {
  x1: number;
  x2: number;
  y: number;
  sad: boolean;
}) {
  return (
    <>
      <circle cx={x1} cy={y} r="3.5" fill={INK} />
      <circle cx={x2} cy={y} r="3.5" fill={INK} />
      <circle cx={x1 + 1} cy={y - 1} r="1.1" fill="#fff" />
      <circle cx={x2 + 1} cy={y - 1} r="1.1" fill="#fff" />
      {sad && (
        <>
          <path
            d={`M${x1 - 5} ${y - 7} l8 2`}
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={`M${x2 + 5} ${y - 7} l-8 2`}
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </>
  );
}

function Legs({ x1, x2, top }: { x1: number; x2: number; top: number }) {
  return (
    <path
      d={`M${x1} ${top} V112 m-5 0 h10 M${x2} ${top} V112 m-5 0 h10`}
      stroke="#f59e0b"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** Olho de perfil (galeto e galo olham para o lado). */
function SideEye({ x, y, sad }: { x: number; y: number; sad: boolean }) {
  return (
    <>
      <circle cx={x} cy={y} r="3" fill={INK} />
      <circle cx={x + 1} cy={y - 1} r="1" fill="#fff" />
      {sad && (
        <path
          d={`M${x - 4} ${y - 6} l7 2`}
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

/**
 * Pipoca pintinho: bolinha amarela de frente. Nível a nível: sai da casca,
 * ganha topete, bochechas e asinhas abertas.
 */
function Chick({ step, sad }: { step: number; sad: boolean }) {
  return (
    <>
      <Legs x1={52} x2={68} top={104} />
      {step >= 4 ? (
        <>
          <path d="M32 74 q-14 -10 -12 4 q6 8 14 4 z" fill="#eab308" />
          <path d="M88 74 q14 -10 12 4 q-6 8 -14 4 z" fill="#eab308" />
        </>
      ) : (
        <>
          <ellipse cx="33" cy="82" rx="7" ry="11" fill="#eab308" />
          <ellipse cx="87" cy="82" rx="7" ry="11" fill="#eab308" />
        </>
      )}
      <ellipse cx="60" cy="78" rx="30" ry="32" fill="#fde047" />
      {step >= 2 && (
        <path
          d="M58 47 q-3 -9 3 -11 M62 47 q2 -8 8 -7"
          stroke="#facc15"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {step >= 3 && (
        <>
          <circle cx="45" cy="78" r="4.5" fill="#fb7185" opacity="0.45" />
          <circle cx="75" cy="78" r="4.5" fill="#fb7185" opacity="0.45" />
        </>
      )}
      <Eyes x1={51} x2={69} y={68} sad={sad} />
      <path d="M55 75 l5 6 l5 -6 z" fill="#f97316" />
      {/* Acabou de nascer: ainda com casca no corpo e na cabeça. */}
      {step === 0 && (
        <path
          d="M28 92 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 v6 q-32 20 -64 0 z"
          fill="#fdf3dc"
          stroke="#e7cf9f"
          strokeWidth="2"
        />
      )}
      {step <= 1 && (
        <path
          d="M46 50 l4 -10 l5 6 l5 -8 l5 8 l5 -6 l4 10 q-14 -6 -28 0 z"
          fill="#fdf3dc"
          stroke="#e7cf9f"
          strokeWidth="2"
        />
      )}
    </>
  );
}

/**
 * Pipoca galeto: frango jovem, magro e de pernas compridas, de perfil.
 * Ainda tem penugem amarela no começo; a crista e o rabo crescem por nível.
 */
function Pullet({ stage, sad }: { stage: PetStage; sad: boolean }) {
  const g = stage.growth;
  const tail = 1 + Math.min(4, stage.step);
  return (
    <>
      <Legs x1={50} x2={64} top={90} />
      {Array.from({ length: tail }, (_, i) => (
        <path
          key={i}
          d={`M36 74 q${-10 - i * 2} ${-14 + i * 4} ${-6 - i * 3} ${-24 + i * 5}`}
          stroke="#c9a679"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <ellipse cx="56" cy="78" rx="26" ry="18" fill="#fbf3e4" />
      <ellipse
        cx="52"
        cy="78"
        rx="14"
        ry="9"
        fill="#e8d2b0"
        transform="rotate(-10 52 78)"
      />
      {/* Penugem de pintinho que vai sumindo. */}
      {stage.step <= 2 &&
        [
          [66, 88],
          [44, 70],
          [72, 66],
        ]
          .slice(0, 3 - stage.step)
          .map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="5" fill="#fde047" />
          ))}
      <path d="M66 70 q4 -18 6 -28 l12 2 q-2 14 -4 28 z" fill="#fbf3e4" />
      <circle cx="76" cy="40" r="12" fill="#fbf3e4" />
      <path
        d={`M70 30 q2 -${5 + 6 * g} 5 0 q2 -${6 + 7 * g} 5 0 q2 -${4 + 5 * g} 4 1`}
        fill="#ef4444"
      />
      <ellipse cx="86" cy="50" rx="2.5" ry={2 + 3 * g} fill="#ef4444" />
      <SideEye x={79} y={38} sad={sad} />
      <path d="M87 39 l9 3 l-9 4 z" fill="#f97316" />
    </>
  );
}

/**
 * Pipoca galo: grande e colorido, com crista alta, barbela e um rabo
 * escuro arqueado que ganha penas a cada nível; no fim, brilho dourado.
 */
function Rooster({ stage, sad }: { stage: PetStage; sad: boolean }) {
  const tail = 3 + Math.min(4, stage.step);
  const colors = ["#065f46", "#14532d", "#0f766e", "#1e3a8a"];
  return (
    <>
      <Legs x1={50} x2={66} top={92} />
      {stage.step >= 2 && (
        <path
          d="M50 102 l-4 -2 M66 102 l-4 -2"
          stroke="#d97706"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {Array.from({ length: tail }, (_, i) => (
        <path
          key={i}
          d={`M38 76 q${-24 + i * 2} ${-10 - i * 6} ${-4 + i * 3} ${-40 + i * 3}`}
          stroke={colors[i % colors.length]}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <ellipse cx="58" cy="78" rx="28" ry="20" fill="#c2410c" />
      <ellipse cx="74" cy="84" rx="12" ry="12" fill="#7c2d12" />
      <ellipse
        cx="54"
        cy="76"
        rx="16"
        ry="10"
        fill="#92400e"
        transform="rotate(-10 54 76)"
      />
      <path d="M64 70 q4 -20 6 -30 l14 2 q-2 16 -4 30 z" fill="#c2410c" />
      {/* Penas douradas do pescoço. */}
      {stage.step >= 1 && (
        <path
          d="M64 70 q2 -14 6 -26 l3 4 l2 -5 l3 4 l3 -4 l1 5 q-2 12 -4 24 z"
          fill="#f59e0b"
        />
      )}
      <circle cx="76" cy="38" r="13" fill="#c2410c" />
      <path
        d="M64 30 q1 -12 6 -4 q2 -14 7 -3 q3 -13 7 -1 q5 -8 5 4 z"
        fill="#dc2626"
      />
      <path d="M84 48 q-4 8 0 13 q5 -4 2 -13 z" fill="#dc2626" />
      <SideEye x={79} y={36} sad={sad} />
      <path d="M88 37 l10 3 l-10 5 z" fill="#f59e0b" />
      {stage.step >= 5 &&
        [
          [24, 30],
          [98, 22],
          [104, 70],
        ].map(([x, y]) => (
          <path
            key={x}
            d={`M${x} ${y - 5} l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 z`}
            fill="#facc15"
          />
        ))}
    </>
  );
}

/**
 * Tuca: crocodilinho cabeçudo (ainda com casca), crocodilo jovem e o
 * crocodilão escuro, com mais espinhos e dentes.
 */
function Croc({ stage, sad }: { stage: PetStage; sad: boolean }) {
  const { form, growth, step } = stage;
  const baby = form === "baby";
  const adult = form === "adult";
  const skin = adult ? "#2f6b35" : baby ? "#6cc06e" : "#4d9e4f";
  const dark = adult ? "#1f4d25" : baby ? "#4d9e4f" : "#3f8a46";
  const belly = adult ? "#a3c97a" : "#b7d98a";
  // Focinho cresce até caber no desenho (borda em x = 120).
  const snout = baby
    ? 10 + 4 * growth
    : adult
      ? 22 + 4 * growth
      : 16 + 6 * growth;
  const spikes = baby
    ? [46, 58]
    : adult
      ? [24, 34, 44, 54, 64, 74]
      : [34, 46, 58, 70].slice(0, 2 + Math.min(2, step));
  const eye = baby ? 8 : 7 - 2 * growth;
  return (
    <>
      <path d="M22 88 q-16 6 -20 -6 q10 4 22 -4" fill={dark} />
      <ellipse cx="54" cy="88" rx={baby ? 28 : 34} ry="18" fill={skin} />
      <ellipse cx="54" cy="94" rx={baby ? 20 : 26} ry="10" fill={belly} />
      {spikes.map((x) => (
        <path key={x} d={`M${x} 72 l5 -7 l5 7 z`} fill={dark} />
      ))}
      <rect x="34" y="98" width="9" height="12" rx="4" fill={dark} />
      <rect x="64" y="98" width="9" height="12" rx="4" fill={dark} />
      <ellipse
        cx="88"
        cy="76"
        rx={baby ? 19 : 16}
        ry={baby ? 16 : 13}
        fill={skin}
      />
      <rect x="92" y="74" width={snout} height="12" rx="6" fill={skin} />
      <path d={`M96 84 h${snout - 6}`} stroke={dark} strokeWidth="1.5" />
      {(adult || (form === "young" && step >= 3)) &&
        [100, 106, 112]
          .filter((x) => x < 92 + snout)
          .map((x) => <path key={x} d={`M${x} 84 l2 3 l2 -3`} fill="#fff" />)}
      <circle cx="84" cy="64" r={eye} fill={skin} />
      <circle cx="96" cy="64" r={eye} fill={skin} />
      <Eyes x1={84} x2={96} y={63} sad={sad} />
      {baby && step <= 1 && (
        <path
          d="M76 58 l4 -8 l4 5 l4 -7 l4 7 l4 -5 l4 8 q-12 -5 -24 0 z"
          fill="#e7f0d4"
          stroke="#9cb77a"
          strokeWidth="2"
        />
      )}
      {adult && step >= 4 && (
        <path d="M80 52 l3 -8 l4 5 l3 -7 l3 7 l4 -5 l3 8 z" fill="#facc15" />
      )}
    </>
  );
}

/** "Meus bichinhos": todas as fases, com as já alcançadas reveladas. */
export function PetCollection({ level }: { level: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PET_PHASES.map((p, i) => {
        const open = level >= p.level;
        return (
          <li
            key={p.label}
            className={`flex flex-col items-center rounded-xl border p-3 text-center ${open ? "border-brand-200 bg-brand-50" : "border-line"}`}
          >
            <PetArt
              // A forma já crescida, no último nível antes da próxima.
              stage={petStage((PET_PHASES[i + 1]?.level ?? p.level + 7) - 1)}
              className={`size-20 ${open ? "" : "opacity-20 brightness-0"}`}
            />
            <strong className="mt-1 text-sm">{open ? p.label : "???"}</strong>
            <span className="text-xs text-ink-500">
              {open ? `Desde o nível ${p.level}` : `Nível ${p.level}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
