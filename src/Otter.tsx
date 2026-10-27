import { useCallback, useEffect, useState } from "react";
import { today } from "./domain";
import { otterFitness, type DayGoals } from "./gamification";
import { RiAlarmWarningLine } from "react-icons/ri";
import Choice from "./Choice";
import { nudgeMessage, sendNudge } from "./nudges";
import { loadOtter, removeHelper, setHelping, setOtterMode } from "./otterApi";
import type { SocialProfile } from "./social";
import { CheckItem, Panel } from "./ui";

const BROWN = "#8b5a3c";
const BELLY = "#e3c29f";
const DARK = "#3a2618";

/**
 * A lontra na academia. `fit` de 0 a 1: gordinha e largada no banco com uma
 * rosquinha (desandou) → magra e forte levantando o haltere.
 */
function OtterGym({ fit }: { fit: number }) {
  const training = fit >= 0.4;
  const strong = fit >= 0.7;
  const width = 1.45 - 0.55 * fit;
  return (
    <svg viewBox="0 0 220 170" className="w-full max-w-72" aria-hidden>
      {/* Academia: parede, chão, banco e kettlebell. */}
      <rect
        x="0"
        y="0"
        width="220"
        height="150"
        rx="14"
        fill="var(--color-surface)"
      />
      <rect
        x="0"
        y="148"
        width="220"
        height="22"
        rx="6"
        fill="var(--color-line)"
      />
      <rect
        x="150"
        y="122"
        width="58"
        height="10"
        rx="4"
        fill="var(--color-ink-400)"
      />
      <rect x="156" y="132" width="6" height="16" fill="var(--color-ink-400)" />
      <rect x="196" y="132" width="6" height="16" fill="var(--color-ink-400)" />
      <path d="M18 148 a12 12 0 0 1 24 0 Z" fill="#52525b" />
      <path
        d="M24 136 a6 6 0 0 1 12 0"
        stroke="#52525b"
        strokeWidth="3"
        fill="none"
      />
      {!training && (
        // Haltere esquecido no chão.
        <g>
          <rect x="44" y="142" width="34" height="4" rx="2" fill="#71717a" />
          <rect x="40" y="136" width="8" height="14" rx="2" fill="#3f3f46" />
          <rect x="74" y="136" width="8" height="14" rx="2" fill="#3f3f46" />
        </g>
      )}
      <g
        className={training ? "animate-breathe" : "animate-breathe-slow"}
        style={{ transformOrigin: "110px 148px" }}
      >
        {/* Rabo, pernas e corpo (largura conforme a forma). */}
        <path
          d={`M${110 + 34 * width} 128 q30 4 34 -14`}
          stroke={BROWN}
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <rect
          x={110 - 26 * width}
          y="132"
          width="18"
          height="18"
          rx="8"
          fill={BROWN}
        />
        <rect
          x={110 + 26 * width - 18}
          y="132"
          width="18"
          height="18"
          rx="8"
          fill={BROWN}
        />
        <ellipse cx="110" cy="108" rx={36 * width} ry="40" fill={BROWN} />
        <ellipse cx="110" cy="114" rx={24 * width} ry="28" fill={BELLY} />
        {strong && (
          // Tanquinho.
          <g stroke={BROWN} strokeWidth="1.6" opacity="0.5">
            <line x1="110" y1="98" x2="110" y2="130" />
            <line x1="100" y1="106" x2="120" y2="106" />
            <line x1="100" y1="116" x2="120" y2="116" />
          </g>
        )}
        {/* Cabeça. */}
        <circle cx="88" cy="38" r="7" fill={BROWN} />
        <circle cx="132" cy="38" r="7" fill={BROWN} />
        <circle cx="110" cy="58" r="27" fill={BROWN} />
        <ellipse cx="110" cy="67" rx="16" ry="11" fill={BELLY} />
        <ellipse cx="110" cy="61" rx="5.5" ry="3.8" fill={DARK} />
        {training ? (
          <>
            <circle cx="100" cy="52" r="3.5" fill={DARK} />
            <circle cx="120" cy="52" r="3.5" fill={DARK} />
            {/* Faixa de academia e gota de suor. */}
            <rect
              x="84"
              y="38"
              width="52"
              height="6"
              rx="3"
              fill="var(--color-brand-600)"
            />
            <path
              d="M140 46 c0 0 -4 6 -4 8 a4 4 0 0 0 8 0 c0 -2 -4 -8 -4 -8z"
              fill="#38bdf8"
            />
            <path
              d="M104 72 q6 4 12 0"
              stroke={DARK}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* Olhos cansados. */}
            <path
              d="M96 53 h8 M116 53 h8"
              stroke={DARK}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M104 74 q6 -3 12 0"
              stroke={DARK}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </>
        )}
        <g stroke={DARK} strokeWidth="1" opacity="0.6">
          <line x1="92" y1="64" x2="78" y2="62" />
          <line x1="92" y1="68" x2="78" y2="70" />
          <line x1="128" y1="64" x2="142" y2="62" />
          <line x1="128" y1="68" x2="142" y2="70" />
        </g>
        {training ? (
          // Braços levantando o haltere (sobe e desce).
          <g className="animate-lift" style={{ transformOrigin: "110px 90px" }}>
            <path
              d={`M${110 - 30 * width} 92 L72 30`}
              stroke={BROWN}
              strokeWidth={strong ? 13 : 10}
              strokeLinecap="round"
            />
            <path
              d={`M${110 + 30 * width} 92 L148 30`}
              stroke={BROWN}
              strokeWidth={strong ? 13 : 10}
              strokeLinecap="round"
            />
            {strong && (
              <>
                <circle cx="80" cy="60" r="7" fill={BROWN} />
                <circle cx="140" cy="60" r="7" fill={BROWN} />
              </>
            )}
            <rect
              x="60"
              y="24"
              width="100"
              height="5"
              rx="2.5"
              fill="#71717a"
            />
            <rect x="54" y="14" width="10" height="25" rx="3" fill="#3f3f46" />
            <rect x="156" y="14" width="10" height="25" rx="3" fill="#3f3f46" />
          </g>
        ) : (
          // Braços caídos segurando uma rosquinha.
          <g>
            <path
              d={`M${110 - 30 * width} 96 Q78 120 92 126`}
              stroke={BROWN}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M${110 + 30 * width} 96 Q142 120 128 126`}
              stroke={BROWN}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="110" cy="124" r="11" fill="#f472b6" />
            <circle cx="110" cy="124" r="4" fill={BELLY} />
          </g>
        )}
      </g>
    </svg>
  );
}

const MESSAGES: [number, string][] = [
  [0.8, "Sarada! Vocês estão arrasando."],
  [0.6, "Treinando firme, continuem assim!"],
  [0.4, "Começando a pegar o ritmo. Bora!"],
  [0.2, "Desanimada… precisa de água, comida certa e treino."],
  [0, "Desandou: a lontra largou o treino. Vamos voltar?"],
];

/**
 * Lontra: cuidar sozinho, com um amigo específico (os dois se escolhem) ou
 * aberta para qualquer amigo ajudar. Fica magra e forte quando o time
 * cumpre as metas da semana e desanda junto quando não.
 */
export default function OtterCard({
  userId,
  myGoals,
  friends,
  onNotice,
}: {
  userId: string;
  /** Metas dos últimos 7 dias (calculadas no aparelho). */
  myGoals: DayGoals[];
  friends: { id: string; person?: SocialProfile | null }[];
  onNotice: (text: string) => void;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadOtter>>>();
  const refresh = useCallback(
    () =>
      loadOtter(userId)
        .then(setData)
        .catch(() => setData(undefined)),
    [userId],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const team = data?.team ?? [];
  const fit = otterFitness([myGoals, ...team.map((id) => data!.goals(id))]);
  const name = (id: string | null | undefined) =>
    friends.find((f) => f.id === id)?.person?.name ?? "Amigo";
  const todayGoals = (g: DayGoals[]) => g.find((x) => x.date === today());
  const act = (action: () => Promise<unknown>, done?: string) =>
    action()
      .then(() => {
        if (done) onNotice(done);
        return refresh();
      })
      .catch((e) => onNotice(e instanceof Error ? e.message : "Falha."));
  const mode = data?.mode ?? "solo";

  return (
    <>
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Sua lontra</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Fica magra e forte quando o time bebe água, come dentro da meta e
              treina. Se desandarem, ela desanda junto.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700 tabular-nums">
            {Math.round(fit * 100)}%
          </span>
        </div>
        <div className="mt-3 flex justify-center">
          <OtterGym fit={fit} />
        </div>
        <p className="mt-2 text-center font-medium">
          {MESSAGES.find(([min]) => fit >= min)![1]}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Today label="Você hoje" goals={todayGoals(myGoals)} />
          {team.map((id) => (
            <Today
              key={id}
              label={`${name(id)} hoje`}
              goals={todayGoals(data!.goals(id))}
              onRemove={
                mode === "open"
                  ? () => act(() => removeHelper(userId, id))
                  : undefined
              }
              onNudge={() => {
                const goals = todayGoals(data!.goals(id));
                return act(
                  () => sendNudge(id, nudgeMessage(goals)),
                  `Orelha puxada! ${name(id)} vai receber um "bora lá".`,
                );
              }}
            />
          ))}
        </div>
        {data?.invitedBy.map((id) => (
          <div
            key={id}
            className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-brand-50 p-3 text-sm"
          >
            <span>{name(id)} quer cuidar da lontra com você.</span>
            <button
              className="btn-primary min-h-9 px-3 text-sm"
              onClick={() =>
                act(
                  () => setOtterMode(userId, "buddy", id),
                  `Agora você e ${name(id)} cuidam da lontra juntos.`,
                )
              }
            >
              Aceitar
            </button>
          </div>
        ))}
        <div className="mt-4">
          <span className="label">Quem cuida</span>
          <Choice
            label="Quem cuida da lontra"
            value={mode}
            onChange={(m) =>
              act(() =>
                setOtterMode(
                  userId,
                  m,
                  m === "buddy"
                    ? (data?.buddy ?? friends[0]?.id ?? null)
                    : null,
                ),
              )
            }
            options={[
              { id: "solo", label: "Sozinho" },
              { id: "buddy", label: "Com um amigo" },
              { id: "open", label: "Amigos ajudam" },
            ]}
          />
          {mode === "buddy" && (
            <select
              className="input mt-3"
              aria-label="Amigo da dupla"
              value={data?.buddy ?? ""}
              onChange={(e) =>
                act(() => setOtterMode(userId, "buddy", e.target.value))
              }
            >
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.person?.name ?? "Amigo"}
                </option>
              ))}
            </select>
          )}
          <p className="hint">
            {!data
              ? "Conecte-se para cuidar da lontra com amigos."
              : mode === "solo"
                ? "Só as suas metas contam."
                : mode === "buddy"
                  ? !friends.length
                    ? "Adicione um amigo para cuidarem juntos."
                    : data.mutual
                      ? `Você e ${name(data.buddy)} cuidam da lontra juntos.`
                      : `Esperando ${name(data.buddy)} escolher você também. Até lá, contam só as suas metas.`
                  : team.length
                    ? `${team.length} amigo(s) ajudando. Qualquer amigo pode entrar ou sair quando quiser.`
                    : "Qualquer amigo pode entrar para ajudar. Ainda ninguém entrou."}{" "}
            Só aparece se cada um cumpriu as metas, nunca os valores.
          </p>
        </div>
      </Panel>
      {!!data?.openFriends.length && (
        <Panel>
          <h2 className="text-base font-semibold">Lontras de amigos</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Ajude: suas metas cumpridas também deixam a lontra deles mais forte.
          </p>
          <ul className="mt-2 divide-y divide-line">
            {data.openFriends.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 py-3"
              >
                <span className="text-sm font-medium">
                  Lontra de {name(f.id)}
                </span>
                <button
                  className={
                    f.helping
                      ? "btn-ghost text-sm"
                      : "btn-primary min-h-9 px-3 text-sm"
                  }
                  onClick={() =>
                    act(
                      () => setHelping(userId, f.id, !f.helping),
                      f.helping
                        ? undefined
                        : `Você está ajudando a lontra de ${name(f.id)}!`,
                    )
                  }
                >
                  {f.helping ? "Parar de ajudar" : "Ajudar"}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function Today({
  label,
  goals,
  onRemove,
  onNudge,
}: {
  label: string;
  goals?: DayGoals;
  /** Tirar quem está ajudando (lontra aberta). */
  onRemove?: () => void;
  /** Mandar um "bora lá" para quem está fora da meta. */
  onNudge?: () => void;
}) {
  const behind = !goals?.water || !goals?.calories || !goals?.exercise;
  const item = (done: boolean | undefined, text: string) => (
    <li>
      <CheckItem done={done}>{text}</CheckItem>
    </li>
  );
  return (
    <div className="rounded-lg bg-surface p-3 text-sm">
      <p className="flex items-center justify-between gap-2 font-medium">
        {label}
        {onRemove && (
          <button className="text-xs text-ink-500 underline" onClick={onRemove}>
            Tirar
          </button>
        )}
      </p>
      <ul className="mt-1 space-y-0.5">
        {item(goals?.water, "Meta de água")}
        {item(goals?.calories, "Dentro das calorias")}
        {item(goals?.exercise, "Exercício")}
      </ul>
      {onNudge && behind && (
        <button
          className="btn-secondary mt-2 min-h-9 w-full px-3 text-sm"
          onClick={onNudge}
        >
          <RiAlarmWarningLine className="size-4" /> Puxar orelha
        </button>
      )}
    </div>
  );
}
