import { useState } from "react";
import { RiMedalLine } from "react-icons/ri";
import type { State } from "./domain";
import {
  dailyMissions,
  mascotMood,
  medals,
  progressLevel,
} from "./gamification";
import Sheet from "./Sheet";
import { CheckItem } from "./ui";

/**
 * Rit, o mascote do Ritmo: uma gotinha na cor do app que fica com sede,
 * mais cheinha ou magrinha e feliz conforme as metas da pessoa.
 */
function Rit({
  mood,
  body,
}: {
  mood: ReturnType<typeof mascotMood>["mood"];
  body: number;
}) {
  const sad = mood === "thirsty" || mood === "hungry";
  const mouth = {
    happy: "M42 74 Q60 92 78 74",
    ok: "M46 76 Q60 84 74 76",
    full: "M46 78 Q60 82 74 78",
    thirsty: "M48 82 Q60 72 72 82",
    hungry: "M48 82 Q60 74 72 82",
  }[mood];
  return (
    <svg
      viewBox="0 0 120 130"
      className="animate-rit size-28 shrink-0 overflow-visible"
      aria-hidden
    >
      <ellipse cx="60" cy="124" rx={34 * body} ry="5" fill="rgb(0 0 0 / 0.1)" />
      {/* Corpo: largura acompanha o quanto tem comido. */}
      <g transform={`translate(60 0) scale(${body} 1) translate(-60 0)`}>
        <path
          d="M60 8 C60 8 18 52 18 80 C18 104 37 120 60 120 C83 120 102 104 102 80 C102 52 60 8 60 8 Z"
          fill="var(--color-brand-500)"
          opacity={mood === "thirsty" ? 0.7 : 1}
        />
        <path
          d="M40 60 C36 70 36 80 40 90"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />
      </g>
      {/* Olhos e bochechas. */}
      {mood === "happy" ? (
        <>
          <path
            d="M42 64 Q48 58 54 64"
            stroke="#1f1f23"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M66 64 Q72 58 78 64"
            stroke="#1f1f23"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="48" cy="64" r="5" fill="#1f1f23" />
          <circle cx="72" cy="64" r="5" fill="#1f1f23" />
          <circle cx="49.5" cy="62.5" r="1.6" fill="white" />
          <circle cx="73.5" cy="62.5" r="1.6" fill="white" />
        </>
      )}
      {sad && (
        <>
          <path
            d="M41 55 L53 58"
            stroke="#1f1f23"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M79 55 L67 58"
            stroke="#1f1f23"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
      <circle cx="38" cy="76" r="5" fill="#ff8fab" opacity="0.6" />
      <circle cx="82" cy="76" r="5" fill="#ff8fab" opacity="0.6" />
      <path
        d={mouth}
        stroke="#1f1f23"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      {mood === "thirsty" && (
        <>
          {/* Língua de fora e gota de suor. */}
          <path d="M56 80 Q60 90 64 80" fill="#ff6b81" />
          <path
            d="M96 40 C96 40 90 48 90 52 C90 55 93 57 96 57 C99 57 102 55 102 52 C102 48 96 40 96 40 Z"
            fill="#38bdf8"
          />
        </>
      )}
      {mood === "happy" && (
        <>
          <text x="98" y="30" fontSize="16">
            ✨
          </text>
          <text x="4" y="44" fontSize="12">
            ✨
          </text>
        </>
      )}
    </svg>
  );
}

/** Card do Início: mascote, nível, missões do dia e medalhas. */
export default function MascotCard({
  state,
  date,
  onShare,
}: {
  state: State;
  date: string;
  /** Compartilhar uma medalha com os amigos. */
  onShare?: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const mood = mascotMood(state, date);
  const level = progressLevel(state);
  const missions = dailyMissions(state, date);
  const all = medals(state);
  const earned = all.filter((m) => m.earned).length;
  return (
    <section className="card">
      <div className="flex items-center gap-4">
        <Rit mood={mood.mood} body={mood.body} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-700">
            Rit · nível {level.level}
          </p>
          <p className="mt-1 font-semibold leading-snug">{mood.message}</p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Progresso do nível"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={level.progress * 100}
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${level.progress * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            {level.xp} XP · faltam {level.toNext} para o nível {level.level + 1}
          </p>
        </div>
      </div>
      <h3 className="mt-5 text-sm font-semibold">Missões de hoje</h3>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {missions.map((m) => (
          <li
            key={m.id}
            className={`rounded-lg px-3 py-2 text-sm ${m.done ? "bg-brand-50" : "bg-surface"}`}
          >
            <CheckItem done={m.done}>{m.label}</CheckItem>
          </li>
        ))}
      </ul>
      <button
        className="btn-secondary mt-4 w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <RiMedalLine className="size-5" /> Medalhas · {earned}/{all.length}
      </button>
      {open && (
        <Sheet title="Medalhas" onClose={() => setOpen(false)}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {all.map((m) => (
              <li
                key={m.id}
                className={`flex flex-col items-center rounded-xl border p-4 text-center ${m.earned ? "border-brand-200 bg-brand-50" : "border-line"}`}
              >
                <span
                  className={`text-4xl ${m.earned ? "" : "opacity-30 grayscale"}`}
                  aria-hidden
                >
                  {m.icon}
                </span>
                <strong className="mt-2 text-sm">{m.title}</strong>
                <span className="mt-1 text-[13px] text-ink-500">{m.text}</span>
                {m.earned ? (
                  onShare && (
                    <button
                      className="btn-ghost mt-2 text-sm"
                      onClick={() => {
                        setOpen(false);
                        onShare(
                          `${m.icon} Conquistei a medalha "${m.title}": ${m.text}`,
                        );
                      }}
                    >
                      Compartilhar
                    </button>
                  )
                ) : (
                  <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-brand-400"
                      style={{ width: `${m.progress * 100}%` }}
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </section>
  );
}
