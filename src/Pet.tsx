import { PET_PHASES, petStage, type PetStage } from "./gamification";

const INK = "#1f1f23";
const CRACKS = [
  "M48 34 l5 7 l-4 5 l6 6",
  "M70 30 l-4 8 l5 4 l-3 7",
  "M40 52 l7 3 l-2 6 l7 2",
  "M78 50 l-6 4 l3 6 l-6 3",
];

/** Desenho do bichinho na fase atual (ovo, Pipoca ou Tuca). */
export function PetArt({
  stage,
  sad = false,
  className = "size-28",
}: {
  stage: PetStage;
  /** Com sede ou fome: carinha triste. */
  sad?: boolean;
  className?: string;
}) {
  const motion = {
    still: "",
    shake: "animate-shake",
    wobble: "animate-wobble",
    idle: "animate-rit",
  }[stage.motion];
  const scale = 0.6 + 0.4 * stage.growth;
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} shrink-0 overflow-visible`}
      aria-hidden
    >
      <ellipse cx="60" cy="114" rx="30" ry="4" fill="rgb(0 0 0 / 0.1)" />
      <g className={motion} style={{ transformOrigin: "60px 112px" }}>
        {stage.phase === "egg" ? (
          <Egg croc={stage.line === "croc"} cracks={stage.cracks} />
        ) : (
          <g
            transform={`translate(60 112) scale(${scale}) translate(-60 -112)`}
          >
            {stage.line === "chick" ? (
              <Chicken growth={stage.growth} sad={sad} />
            ) : (
              <Croc growth={stage.growth} sad={sad} />
            )}
          </g>
        )}
      </g>
    </svg>
  );
}

function Egg({ croc, cracks }: { croc: boolean; cracks: number }) {
  return (
    <>
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

/** Pipoca: pintinho amarelo que vira uma galinha com crista. */
function Chicken({ growth, sad }: { growth: number; sad: boolean }) {
  const hen = growth >= 0.5;
  const body = hen ? "#fff7e6" : "#facc15";
  return (
    <>
      <path
        d="M50 104 v8 M70 104 v8"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {hen && <path d="M28 70 q-14 -14 -6 -30 q8 12 16 18 z" fill="#f4e3c1" />}
      <ellipse cx="60" cy="80" rx="30" ry="26" fill={body} />
      <ellipse
        cx="38"
        cy="80"
        rx="9"
        ry="14"
        fill={hen ? "#f4e3c1" : "#eab308"}
        transform="rotate(-20 38 80)"
      />
      <ellipse
        cx="82"
        cy="80"
        rx="9"
        ry="14"
        fill={hen ? "#f4e3c1" : "#eab308"}
        transform="rotate(20 82 80)"
      />
      <circle cx="60" cy="46" r="20" fill={body} />
      {hen && (
        <>
          {/* Crista e barbela crescem com ela. */}
          <path
            d={`M50 30 q4 -${10 * growth} 8 0 q4 -${12 * growth} 8 0 q4 -${9 * growth} 7 2`}
            fill="#ef4444"
          />
          <ellipse cx="60" cy="60" rx="3.5" ry={5 * growth} fill="#ef4444" />
        </>
      )}
      <Eyes x1={52} x2={68} y={44} sad={sad} />
      <path d="M55 51 l5 6 l5 -6 z" fill="#f97316" />
      {!hen && (
        <path d="M58 26 q2 -6 6 -4" stroke={body} strokeWidth="3" fill="none" />
      )}
    </>
  );
}

/** Tuca: filhote de crocodilo que cresce e fica forte. */
function Croc({ growth, sad }: { growth: number; sad: boolean }) {
  // Focinho cresce até caber no desenho (borda em x = 120).
  const snout = 16 + 10 * growth;
  return (
    <>
      <path d="M22 88 q-16 6 -20 -6 q10 4 22 -4" fill="#3f8a46" />
      <ellipse cx="54" cy="88" rx="34" ry="18" fill="#4d9e4f" />
      <ellipse cx="54" cy="94" rx="26" ry="10" fill="#b7d98a" />
      {[34, 46, 58, 70].map((x) => (
        <path key={x} d={`M${x} 72 l5 -7 l5 7 z`} fill="#3f8a46" />
      ))}
      <rect x="34" y="98" width="9" height="12" rx="4" fill="#3f8a46" />
      <rect x="64" y="98" width="9" height="12" rx="4" fill="#3f8a46" />
      {/* Cabeça e focinho (o focinho cresce com ele). */}
      <ellipse cx="88" cy="76" rx="16" ry="13" fill="#4d9e4f" />
      <rect x="92" y="74" width={snout} height="12" rx="6" fill="#4d9e4f" />
      <path d={`M96 84 h${snout - 6}`} stroke="#2f6b35" strokeWidth="1.5" />
      {growth > 0.4 &&
        [100, 106, 112]
          .filter((x) => x < 92 + snout)
          .map((x) => <path key={x} d={`M${x} 84 l2 3 l2 -3`} fill="#fff" />)}
      <circle cx="84" cy="64" r={7 - 2 * growth} fill="#4d9e4f" />
      <circle cx="96" cy="64" r={7 - 2 * growth} fill="#4d9e4f" />
      <Eyes x1={84} x2={96} y={63} sad={sad} />
    </>
  );
}

/** "Meus bichinhos": todas as fases, com as já alcançadas reveladas. */
export function PetCollection({ level }: { level: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PET_PHASES.map((p) => {
        const open = level >= p.level;
        return (
          <li
            key={p.label}
            className={`flex flex-col items-center rounded-xl border p-3 text-center ${open ? "border-brand-200 bg-brand-50" : "border-line"}`}
          >
            <PetArt
              stage={petStage(p.level)}
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
