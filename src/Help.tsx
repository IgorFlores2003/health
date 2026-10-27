import { RiPlayCircleLine, RiQuestionLine } from "react-icons/ri";
import { Panel } from "./ui";

const FAQ: [string, string][] = [
  [
    "Como a meta de calorias é calculada?",
    "Pelo seu perfil: o gasto do dia (basal × seu nível de atividade, ou a rotina leve mais os exercícios registrados, o que for maior), menos 500 kcal para emagrecer ou mais 300 kcal para ganhar peso. Ela nunca fica abaixo do mínimo seguro. Todas as fórmulas estão em Conta e privacidade → Fórmulas e cálculos.",
  ],
  [
    "Como a meta de água é calculada?",
    "35 ml por kg do seu peso. Toque em “Bebi” no card de água, ou informe outro valor em litros. Os lembretes ficam em Configurações → Água.",
  ],
  [
    "Por que o dia aparece como incompleto?",
    "O saldo só é confirmado quando o perfil está salvo, há um peso registrado, nenhum alimento ou exercício está sem calorias e você marca no Diário que registrou tudo do dia.",
  ],
  [
    "Como registrar comida mais rápido?",
    "No Diário, toque em Alimento: tire uma foto do prato, fale o que comeu ou escreva (ex.: “1 copo americano de suco”). A IA estima as porções e você confere antes de salvar.",
  ],
  [
    "Como adicionar um amigo?",
    "Em Social → Amigos, envie seu convite (o link já abre o app com o seu código) ou digite o código de amigo da outra pessoa. A amizade vale quando ela aceitar.",
  ],
  [
    "O que é a lontra e o puxar orelha?",
    "Em Social → Lontra: ela fica magra e forte quando você (e quem cuida dela com você) bate as metas de água, calorias e exercício na semana. Se um amigo do time estiver fora da meta, toque em Puxar orelha para mandar um “bora lá” para o celular dele.",
  ],
  [
    "O que meus amigos veem?",
    "Seu nome, foto, nível, medalhas, seus posts e, se a opção estiver ligada, os exercícios e as medalhas novas. Peso, pressão e alimentação nunca são mostrados.",
  ],
  [
    "Não recebo notificações. O que fazer?",
    "No celular, permita as notificações do Ritmo nas configurações do Android. Os lembretes de água e os puxões de orelha só chegam no app Android.",
  ],
  [
    "Como excluir meus dados?",
    "Escreva para o contato indicado na Política de Privacidade (Conta e privacidade). Você também pode apagar posts e registros a qualquer momento.",
  ],
];

/** Ajuda: repetir o tutorial e as dúvidas mais comuns. */
export default function Help({ onTutorial }: { onTutorial: () => void }) {
  return (
    <div className="grid max-w-2xl gap-4">
      <Panel>
        <h2 className="text-base font-semibold">Tutorial</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          A nuvenzinha mostra de novo as principais partes do app.
        </p>
        <button className="btn-primary mt-4" onClick={onTutorial}>
          <RiPlayCircleLine className="size-5" /> Repetir tutorial
        </button>
      </Panel>
      <Panel>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <RiQuestionLine className="size-5 text-brand-600" /> Principais
          dúvidas
        </h2>
        <div className="mt-2 divide-y divide-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {q}
                <span className="text-ink-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-3 text-sm leading-relaxed text-ink-500">{a}</p>
            </details>
          ))}
        </div>
      </Panel>
    </div>
  );
}
