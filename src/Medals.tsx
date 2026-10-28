import type { IconType } from "react-icons";
import {
  RiBookletFill,
  RiFireFill,
  RiFootprintFill,
  RiMedalFill,
  RiRocket2Fill,
  RiRunFill,
  RiScales3Fill,
  RiTrophyFill,
  RiDropFill,
  RiWaterFlashFill,
} from "react-icons/ri";
import type { State } from "./domain";
import { medals } from "./gamification";
import { CardHeader, Panel } from "./ui";

/** Ícone de cada medalha (pelo id em gamification.ts). */
export const MEDAL_ICONS: Record<string, IconType> = {
  first: RiFootprintFill,
  week: RiFireFill,
  month: RiTrophyFill,
  water1: RiDropFill,
  water7: RiWaterFlashFill,
  diary: RiBookletFill,
  athlete: RiRunFill,
  kg1: RiScales3Fill,
  kg5: RiRocket2Fill,
  goal: RiMedalFill,
};

/** Medalhas no Perfil: conquistadas, com o progresso das que faltam. */
export default function Medals({
  state,
  onShare,
}: {
  state: State;
  /** Compartilhar uma medalha com os amigos. */
  onShare?: (text: string) => void;
}) {
  const all = medals(state);
  const earned = all.filter((m) => m.earned).length;
  return (
    <Panel className="mb-4">
      <CardHeader title={`Medalhas · ${earned}/${all.length}`} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {all.map((m) => {
          const Icon = MEDAL_ICONS[m.id] ?? RiMedalFill;
          return (
            <li
              key={m.id}
              className={`flex flex-col items-center rounded-xl border p-4 text-center ${m.earned ? "border-brand-200 bg-brand-50" : "border-line"}`}
            >
              <Icon
                className={`size-10 ${m.earned ? "text-brand-600" : "text-ink-400 opacity-40"}`}
                aria-hidden
              />
              <strong className="mt-2 text-sm">{m.title}</strong>
              <span className="mt-1 text-[13px] text-ink-500">{m.text}</span>
              {m.earned ? (
                onShare && (
                  <button
                    className="btn-ghost mt-2 text-sm"
                    onClick={() =>
                      onShare(`Conquistei a medalha "${m.title}": ${m.text}`)
                    }
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
          );
        })}
      </ul>
    </Panel>
  );
}
