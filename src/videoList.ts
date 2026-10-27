/**
 * Vídeos educativos de fontes de saúde reconhecidas. IDs do YouTube
 * conferidos no oEmbed; para trocar, edite esta lista.
 */
export type Video = {
  id: string;
  title: string;
  channel: string;
  topic: "Alimentação" | "Hidratação" | "Pressão arterial" | "Exercício" | "Bem-estar";
};
export const VIDEOS: Video[] = [
  {
    id: "Ng7oA2M4f7o",
    title: "Guia Alimentar | Adultos e Idosos",
    channel: "Ministério da Saúde",
    topic: "Alimentação",
  },
  {
    id: "L1M5yEjqDOs",
    title: "Dá pra manter uma alimentação saudável na correria do dia a dia?",
    channel: "Einstein Hospital Israelita",
    topic: "Alimentação",
  },
  {
    id: "I9QhGeMvtqw",
    title: "Quantos litros de água você precisa beber todos os dias?",
    channel: "Drauzio Varella",
    topic: "Hidratação",
  },
  {
    id: "Hg3K0mqhrJc",
    title: "Como saber se você está bebendo água o suficiente",
    channel: "Drauzio Varella",
    topic: "Hidratação",
  },
  {
    id: "NVAJa5o3rpc",
    title: "Saiba como medir a pressão arterial para identificar a hipertensão",
    channel: "Drauzio Varella",
    topic: "Pressão arterial",
  },
  {
    id: "7VPR3wFx43w",
    title: "Como medir, prevenir e tratar a hipertensão",
    channel: "Sírio-Libanês",
    topic: "Pressão arterial",
  },
  {
    id: "_mKVuik02h4",
    title: "Atividade física: como começar?",
    channel: "Einstein Hospital Israelita",
    topic: "Exercício",
  },
  {
    id: "7QSEMJr6uXs",
    title: "Tipos de atividade física: existe um tipo certo para cada pessoa?",
    channel: "Einstein Hospital Israelita",
    topic: "Exercício",
  },
  {
    id: "_cPSjc8OZ_w",
    title: "Hábitos que podem melhorar o seu sono",
    channel: "Drauzio Varella",
    topic: "Bem-estar",
  },
  {
    id: "rLArQfAsO8c",
    title: "Vício em dietas: como não cair na armadilha das dietas restritivas?",
    channel: "Einstein Hospital Israelita",
    topic: "Bem-estar",
  },
];
