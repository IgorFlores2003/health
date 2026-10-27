import { RiBookOpenLine } from "react-icons/ri";
import { today, type State } from "./domain";
import { mascotMood, petStage, type progressLevel } from "./gamification";
import { PetArt } from "./Pet";
import { Avatar } from "./photos";

/**
 * Topo do Perfil: foto, nome e nível, com o bichinho atual se mexendo logo
 * abaixo. O livrinho abre a Pokédex com todas as formas dos bichinhos.
 */
export default function ProfileHero({
  state,
  level,
  onPokedex,
}: {
  state: State;
  level: ReturnType<typeof progressLevel>;
  onPokedex: () => void;
}) {
  const pet = petStage(level.level);
  const mood = mascotMood(state, today());
  return (
    <section className="card mb-4 max-w-2xl">
      <div className="flex items-center gap-4">
        <Avatar
          path={state.profile.photo}
          name={state.profile.name}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {state.profile.name || "Seu perfil"}
          </h1>
          <p className="text-sm text-ink-500">
            Nível {level.level} · {level.xp} XP
          </p>
        </div>
        <button
          className="icon-btn size-11 bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700"
          onClick={onPokedex}
          aria-label="Abrir a Pokédex dos bichinhos"
          title="Pokédex"
        >
          <RiBookOpenLine className="size-6" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-4 rounded-xl bg-surface p-3">
        <PetArt
          stage={pet}
          sad={mood.mood === "thirsty" || mood.mood === "hungry"}
          className="size-24"
          alive
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-700">
            {pet.form === "egg" ? pet.name : `${pet.name} · ${pet.formLabel}`}
          </p>
          <p className="mt-0.5 font-semibold leading-snug">{pet.label}</p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Progresso do nível"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level.progress * 100)}
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${level.progress * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            Faltam {level.toNext} XP para o nível {level.level + 1}
          </p>
        </div>
      </div>
    </section>
  );
}
