import { useState } from "react";
import { RiStarLine } from "react-icons/ri";
import type { State } from "./domain";
import { PetArt } from "./Pet";
import {
  dailyMissions,
  dayXp,
  mascotMood,
  nextEvolution,
  petStage,
  progressLevel,
  SOCIAL_LIMIT,
  XP,
} from "./gamification";
import Sheet from "./Sheet";
import { CheckItem } from "./ui";

/** Card do Início: mascote, nível e missões do dia (medalhas ficam no Perfil). */
export default function MascotCard({
  state,
  date,
}: {
  state: State;
  date: string;
}) {
  const [rules, setRules] = useState(false);
  const mood = mascotMood(state, date);
  const level = progressLevel(state);
  const pet = petStage(level.level);
  const missions = dailyMissions(state, date);
  const next = nextEvolution(level.level);
  const todayXp = dayXp(state, date);
  return (
    <section className="card">
      <div className="flex items-center gap-4">
        <PetArt
          stage={pet}
          sad={mood.mood === "thirsty" || mood.mood === "hungry"}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-700">
            {pet.form === "egg" ? pet.name : `${pet.name} · ${pet.formLabel}`} ·
            nível {level.level} · {pet.label}
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
          {next && (
            <p className="mt-0.5 text-[13px] text-ink-500">
              {pet.form === "egg" && next.form === "baby"
                ? "Nasce"
                : "Evolui para " + next.label}{" "}
              no nível {next.from}
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Missões de hoje</h3>
        <span className="text-[13px] text-ink-500">
          +{todayXp.total} XP hoje
        </span>
      </div>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {missions.map((m) => (
          <li
            key={m.id}
            className={`rounded-lg px-3 py-2 text-sm ${m.done ? "bg-brand-50" : "bg-surface"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <CheckItem done={m.done}>{m.label}</CheckItem>
              <span className="shrink-0 text-xs font-medium text-brand-700">
                +{XP.mission} XP
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn-secondary flex-1 sm:flex-none"
          onClick={() => setRules(true)}
        >
          <RiStarLine className="size-5" /> Como ganhar XP
        </button>
      </div>
      {rules && (
        <Sheet title="Como ganhar XP" onClose={() => setRules(false)}>
          <ul className="divide-y divide-line">
            {[
              ["Cada missão do dia", `+${XP.mission} XP`],
              ["Completar as 5 missões do dia", `+${XP.fullDay} XP de bônus`],
              [
                "Publicar na comunidade",
                `+${XP.post} XP (até ${SOCIAL_LIMIT.post} por dia)`,
              ],
              [
                "Comentar no post de um amigo",
                `+${XP.comment} XP (até ${SOCIAL_LIMIT.comment} por dia)`,
              ],
              [
                "Curtir o post de um amigo",
                `+${XP.like} XP (até ${SOCIAL_LIMIT.like} por dia)`,
              ],
            ].map(([what, xp]) => (
              <li
                key={what}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span>{what}</span>
                <strong className="shrink-0 text-right font-semibold text-brand-700">
                  {xp}
                </strong>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-500">
            Os primeiros níveis passam rápido e depois vão ficando mais
            demorados. Hoje você já ganhou {todayXp.missions} XP com missões e{" "}
            {todayXp.social} XP com amigos.
          </p>
        </Sheet>
      )}
    </section>
  );
}
