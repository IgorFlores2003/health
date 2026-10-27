/** Passos do tutorial: a aba que fica aberta e o que a Nuvi explica. */
export const STEPS: { tab: string; title: string; text: string }[] = [
  {
    tab: "overview",
    title: "Oi! Eu sou a Nuvi",
    text: "Vou te mostrar o Ritmo rapidinho. São só alguns passos!",
  },
  {
    tab: "overview",
    title: "Início",
    text: "Aqui ficam as calorias de hoje, a água, as missões do dia e o seu bichinho, que evolui conforme você cumpre as metas.",
  },
  {
    tab: "nutrition",
    title: "Diário",
    text: "Registre o que comeu (foto do prato, áudio ou texto), seus exercícios e a pressão. No fim do dia, marque que registrou tudo.",
  },
  {
    tab: "records",
    title: "Registros",
    text: "Todo o seu histórico, com filtro de período e o relatório em PDF para levar ao médico ou nutricionista.",
  },
  {
    tab: "community",
    title: "Social",
    text: "Amigos e posts, a lontra que vocês cuidam juntos (dá até para puxar a orelha de quem sair da meta) e vídeos com dicas.",
  },
  {
    tab: "insights",
    title: "Assistente",
    text: "Tire dúvidas sobre o seu dia com a IA, escrevendo ou por áudio. Fica em Mais, no menu de baixo.",
  },
  {
    tab: "settings",
    title: "Configurações",
    text: "Tema escuro, lembretes de água, conta e a Ajuda, onde você pode me chamar de novo. Seu perfil, a meta de peso e a Pokédex dos bichinhos ficam em Perfil: é só tocar na sua foto no topo.",
  },
  {
    tab: "overview",
    title: "Prontinho!",
    text: "Comece registrando seu peso e um copo de água. Bora?",
  },
];

/** Nuvi: a nuvenzinha do tutorial. */
function Nuvi() {
  return (
    <svg viewBox="0 0 120 84" className="animate-rit w-24 shrink-0" aria-hidden>
      <path
        d="M30 74 C14 74 6 62 10 50 C13 40 22 36 30 37 C32 22 46 12 61 14 C74 15 83 24 86 34 C100 32 112 42 112 56 C112 68 102 76 90 74 Z"
        fill="#fff"
        stroke="var(--color-brand-300)"
        strokeWidth="3"
      />
      <circle cx="48" cy="48" r="4.5" fill="#1f1f23" />
      <circle cx="74" cy="48" r="4.5" fill="#1f1f23" />
      <circle cx="49.5" cy="46.5" r="1.4" fill="#fff" />
      <circle cx="75.5" cy="46.5" r="1.4" fill="#fff" />
      <circle cx="40" cy="57" r="4.5" fill="#ff8fab" opacity="0.6" />
      <circle cx="82" cy="57" r="4.5" fill="#ff8fab" opacity="0.6" />
      <path
        d="M54 57 Q61 64 68 57"
        stroke="#1f1f23"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Balão do tutorial (por cima do app, sem bloquear a tela de fundo). */
export default function Tutorial({
  step,
  onStep,
  onClose,
}: {
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
}) {
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div
      role="dialog"
      aria-label={`Tutorial: ${s.title}`}
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-2xl border border-line bg-white p-4 shadow-xl md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <Nuvi />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{s.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">{s.text}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${i === step ? "w-5 bg-brand-600" : "w-1.5 bg-line"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {!last && (
            <button
              className="btn-ghost text-sm text-ink-500"
              onClick={onClose}
            >
              Pular
            </button>
          )}
          {step > 0 && (
            <button
              className="btn-secondary min-h-9 px-3 text-sm"
              onClick={() => onStep(step - 1)}
            >
              Voltar
            </button>
          )}
          <button
            className="btn-primary min-h-9 px-4 text-sm"
            onClick={() => (last ? onClose() : onStep(step + 1))}
          >
            {last ? "Começar" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
