/** Vídeos educativos que vão dentro do app (public/videos). */
export type Video = {
  id: string;
  title: string;
  topic: "Hidratação" | "Alimentação";
  /** Duração em segundos. */
  seconds: number;
  summary: string;
  points: string[];
};

export const VIDEOS: Video[] = [
  {
    id: "5-dicas-para-beber-mais-agua",
    title: "5 dicas para beber mais água",
    topic: "Hidratação",
    seconds: 197,
    summary:
      "Mudanças simples na rotina, com um pouco de psicologia, para lembrar de beber água ao longo do dia.",
    points: [
      "Deixe a garrafa à vista: na mesa, perto do computador e em lugares frequentes.",
      "Associe a água a um hábito que você já tem; a repetição vira lembrete natural.",
      "Use alarmes discretos, em intervalos lógicos, com pausas curtas para beber.",
      "Tenha objetivos específicos, como uma garrafa de 500 ml, para ver o progresso.",
      "Marque no app sem cobrar perfeição: não cumpriu, retome na próxima oportunidade.",
    ],
  },
  {
    id: "habito-saudavel-3-dicas",
    title: "Hábito saudável: 3 dicas",
    topic: "Alimentação",
    seconds: 244,
    summary:
      "Por que as intenções saudáveis falham na correria e três dicas para comer melhor com pequenas mudanças.",
    points: [
      "Acessibilidade: deixe verduras higienizadas em potes na geladeira, prontas para comer.",
      "Integração: some ao que você já come, como uma banana no café ou salada no almoço.",
      "Planejamento: escolha alimentos da época, faça lista de compras e deixe comida preparada.",
      "Fuja da armadilha da pressa, que leva a escolher o mais fácil na hora da fome.",
      "Melhorar não exige mudanças radicais: pequenas ações diárias valem mais que restrições.",
    ],
  },
];
