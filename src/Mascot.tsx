import { useState } from "react";
import { RiMedalLine } from "react-icons/ri";
import type { State } from "./domain";
import { PetArt } from "./Pet";
import {
  dailyMissions,
  petStage,
  mascotMood,
  medals,
  progressLevel,
} from "./gamification";
import Sheet from "./Sheet";
import { CheckItem } from "./ui";

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
  const pet = petStage(level.level);
  const missions = dailyMissions(state, date);
  const all = medals(state);
  const earned = all.filter((m) => m.earned).length;
  return (
    <section className="card">
      <div className="flex items-center gap-4">
        <PetArt
          stage={pet}
          sad={mood.mood === "thirsty" || mood.mood === "hungry"}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-700">
            {pet.name} · nível {level.level} · {pet.label}
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
