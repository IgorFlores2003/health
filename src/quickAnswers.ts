import { basal, byDate, currentWeight, type State } from "./domain.ts";
import { dailyBudget, dailyEnergy } from "./energy.ts";

/**
 * Respostas na hora para as perguntas óbvias (os atalhos do Assistente),
 * calculadas no aparelho com as mesmas fórmulas do app, sem chamar a IA.
 * Só responde quando a pergunta é exatamente uma delas; o resto vai à IA.
 */
const kcal = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kcal`;
const kg = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const normalize = (q: string) =>
  q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DEFICIT =
  /^(eu )?(estou|fiquei|tive|to|fiz) (em )?(um )?(deficit|superavit)( calorico)?( (neste|nesse|hoje|no|do) dia| hoje)?$|^com base nos alimentos e exercicios registrados neste dia estou em deficit calorico explique o saldo e as limitacoes dos dados$/;
const BASAL =
  /^(o )?que (e|significa) (o |a )?(metabolismo basal|basal|taxa metabolica basal|tmb)$/;
const PROGRESS = /^resum(a|e|o|ir) (o )?meu progresso( ate aqui| ate agora)?$/;
const STREAK = /^como (acompanhar|manter|melhorar) (a )?minha constancia$/;

export function quickAnswer(question: string, state: State, date: string) {
  const q = normalize(question);
  if (DEFICIT.test(q)) return deficit(state, date);
  if (BASAL.test(q)) return basalText(state);
  if (PROGRESS.test(q)) return progress(state);
  if (STREAK.test(q)) return streak(state);
  return null;
}

function deficit(state: State, date: string) {
  const d = dailyEnergy(state, date);
  const when = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
  if (!d.complete) {
    const missing = [
      !state.profileReviewed && "salvar seu perfil",
      !d.weight && "registrar um peso nessa data ou antes",
      !d.foodCount && "registrar o que comeu e bebeu",
      d.foodMissing > 0 &&
        `informar as calorias de ${d.foodMissing} alimento(s) pendente(s)`,
      d.exerciseMissing > 0 &&
        `informar as calorias de ${d.exerciseMissing} exercício(s) pendente(s)`,
      !d.completed &&
        "marcar no Diário que registrou tudo do dia",
    ].filter(Boolean) as string[];
    return [
      `Ainda não dá para dizer se houve déficit em ${when}: os registros estão incompletos.`,
      `Para concluir, falta:\n${missing.map((m) => `- ${m}`).join("\n")}`,
      d.expenditure !== null && d.foodCount
        ? `Até agora: consumo de ${kcal(d.intake)} e gasto estimado de ${kcal(d.expenditure)}. Um saldo parcial não confirma déficit.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  const diff = Math.abs(d.balance!);
  const verdict = {
    deficit: `Sim, déficit estimado de ${kcal(diff)}.`,
    surplus: `Não, superávit estimado de ${kcal(diff)}.`,
    near_balance: `Você ficou próximo do equilíbrio (diferença de ${kcal(diff)}).`,
    incomplete: "",
  }[d.status];
  return [
    `${verdict} Em ${when}:`,
    `- Consumo: ${kcal(d.intake)}`,
    `- Gasto do dia: ${kcal(d.expenditure!)} (o maior entre o seu nível de atividade e a rotina leve mais ${kcal(d.active)} de exercícios)`,
    `- Saldo: ${d.balance! > 0 ? "+" : "−"}${kcal(diff)}`,
    "",
    `É uma estimativa: o gasto vem de fórmulas populacionais${d.aiFoods ? " e algumas calorias de alimentos foram estimadas pela IA" : ""}. Diferença de até 100 kcal conta como equilíbrio.`,
  ].join("\n");
}

function basalText(state: State) {
  const bmr = basal(currentWeight(state), state.profile);
  return [
    "Metabolismo basal é a energia que o corpo gasta em repouso total para se manter vivo: respirar, bater o coração, manter a temperatura e o funcionamento dos órgãos. É a maior parte do gasto do dia.",
    bmr
      ? `O seu basal estimado é de ${kcal(bmr)} por dia, pela fórmula Mifflin–St Jeor com seu peso, altura, idade e coeficiente. Somando suas atividades, o gasto do dia fica em torno de ${kcal(Math.round(bmr * state.profile.activity))}.`
      : "Para calcular o seu, salve o perfil e registre o peso.",
    "A meta de calorias do app nunca fica abaixo do seu basal. É uma estimativa, não uma medição.",
  ].join("\n\n");
}

function progress(state: State) {
  const weights = byDate(state.weights);
  if (!weights.length)
    return "Ainda não há pesos registrados. Registre o peso para acompanhar o progresso.";
  const first = weights[0];
  const last = weights.at(-1)!;
  const change = last.value - first.value;
  const since = new Date(first.date + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long" },
  );
  const lines = [
    weights.length === 1
      ? `Você tem um peso registrado: ${kg(last.value)}.`
      : `Desde ${since} você foi de ${kg(first.value)} para ${kg(last.value)} (${change > 0 ? "+" : change < 0 ? "−" : ""}${kg(Math.abs(change))}).`,
  ];
  if (state.goal) {
    const left = Math.abs(last.value - state.goal);
    lines.push(
      left < 0.05
        ? `Você chegou ao peso desejado de ${kg(state.goal)}.`
        : `Faltam ${kg(left)} para o peso desejado de ${kg(state.goal)}.`,
    );
  }
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const minutes = state.exercises
    .filter((e) => week.includes(e.date))
    .reduce((t, e) => t + e.minutes, 0);
  const diaryDays = week.filter((d) =>
    (state.foods ?? []).some((f) => f.date === d),
  ).length;
  lines.push(
    `Nos últimos 7 dias: ${Math.round(minutes)} min de exercício (a OMS recomenda de 150 a 300 min por semana) e ${diaryDays} dia(s) com alimentação registrada.`,
  );
  const budget = dailyBudget(state, week[0]);
  if (budget.ready)
    lines.push(`Sua meta de calorias de hoje é ${kcal(budget.available)}.`);
  return lines.join("\n\n");
}

function streak(state: State) {
  const days = new Set(
    [
      ...state.weights,
      ...state.exercises,
      ...(state.foods ?? []),
      ...(state.water ?? []),
    ].map((x) => x.date),
  );
  let run = 0;
  const d = new Date();
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!days.has(key)) break;
    run += 1;
    d.setDate(d.getDate() - 1);
  }
  return [
    run
      ? `Você registrou algo em ${run} dia(s) seguido(s) até hoje.`
      : "Hoje ainda não há registros.",
    "Dicas para manter a constância:",
    "- Pese-se no mesmo horário, de preferência de manhã, e olhe a tendência do gráfico, não o dia a dia.",
    "- Registre as refeições logo depois de comer; a foto do prato ou o áudio deixam isso rápido.",
    "- Ative os lembretes de água em Perfil.",
    "- Marque o dia como completo no Diário para ver o saldo.",
    "- Use o relatório em PDF de 7 ou 30 dias para revisar a semana.",
  ].join("\n");
}
