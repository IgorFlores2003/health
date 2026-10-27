import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { durationLabel, foodUnit, num, type State } from "./domain";
import { foodCalories } from "./energy";
import type { Report, ReportDay } from "./report";
import { palette, toRgb } from "./theme";

let RED: [number, number, number] = [217, 28, 28];
const INK: [number, number, number] = [0, 0, 0];
// Todo o texto do PDF é preto (pedido do usuário: nada em cinza).
const MUTED: [number, number, number] = [0, 0, 0];
const LINE: [number, number, number] = [236, 236, 239];
export const DISCLAIMER =
  "Este relatório mostra apenas o que foi registrado no Ritmo. Calorias e gastos são estimativas, e dias sem registro completo não refletem o consumo real. O app ajuda a acompanhar sua rotina, mas não substitui nutricionista, médico ou profissional de educação física.";

// Sem arredondar: mostra o valor exato (até 2 casas, só para cortar o
// ruído do ponto flutuante).
const br = (n: number, _digits?: number) => num(n);
const date = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
const weekday = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

export function buildReportPdf(state: State, r: Report) {
  // Detalhes do PDF na cor escolhida para o app.
  RED = toRgb(palette(state.accent ?? "#d91c1c")["600"]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  let y = 0;
  const ensure = (h: number) => {
    if (y + h > H - 22) {
      doc.addPage();
      y = 20;
    }
  };
  const heading = (text: string) => {
    ensure(16);
    y += 4;
    doc
      .setFont("helvetica", "bold")
      .setFontSize(13)
      .setTextColor(...INK);
    doc.text(text, M, y);
    y += 2;
    doc
      .setDrawColor(...RED)
      .setLineWidth(0.6)
      .line(M, y, M + 12, y);
    y += 6;
  };
  const paragraph = (text: string, size = 10, color = INK) => {
    doc
      .setFont("helvetica", "normal")
      .setFontSize(size)
      .setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - 2 * M) as string[];
    ensure(lines.length * size * 0.42 + 2);
    doc.text(lines, M, y);
    y += lines.length * size * 0.42 + 2;
  };
  const bullets = (items: string[]) => {
    for (const item of items) {
      doc
        .setFont("helvetica", "normal")
        .setFontSize(10)
        .setTextColor(...INK);
      const lines = doc.splitTextToSize(item, W - 2 * M - 5) as string[];
      ensure(lines.length * 4.2 + 2);
      doc.setFillColor(...RED).circle(M + 1.2, y - 1.2, 0.8, "F");
      doc.text(lines, M + 5, y);
      y += lines.length * 4.2 + 2;
    }
  };
  const table = (
    head: string[],
    body: (string | number)[][],
    empty: string,
  ) => {
    if (!body.length) return paragraph(empty, 10, MUTED);
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: M, right: M, bottom: 22 },
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 1.8,
        textColor: INK,
        lineColor: LINE,
        lineWidth: 0.2,
      },
      headStyles: { fillColor: RED, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 6;
  };

  // Cabeçalho
  doc.setFillColor(...RED).rect(0, 0, W, 34, "F");
  doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(20);
  doc.text("Relatório Ritmo", M, 16);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(
    `${state.profile.name || "Seu perfil"} · ${date(r.from)} a ${date(r.to)} (${r.spanDays} dias)`,
    M,
    24,
  );
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, M, 29);
  y = 44;

  // Aviso em destaque
  doc.setFont("helvetica", "normal").setFontSize(9.5);
  const warn = doc.splitTextToSize(DISCLAIMER, W - 2 * M - 10) as string[];
  const boxH = warn.length * 4 + 10;
  doc
    .setFillColor(255, 241, 241)
    .setDrawColor(...RED)
    .setLineWidth(0.4);
  doc.roundedRect(M, y, W - 2 * M, boxH, 2, 2, "FD");
  doc.setFont("helvetica", "bold").setTextColor(...RED);
  doc.text("Importante", M + 5, y + 6);
  doc.setFont("helvetica", "normal").setTextColor(...INK);
  doc.text(warn, M + 5, y + 11);
  y += boxH + 6;

  // Resumo
  heading("Resumo da trajetória");
  const summary: [string, string][] = [
    [
      "Peso",
      r.weight.first === null
        ? "Sem registros no período"
        : `${br(r.weight.first, 1)} kg para ${br(r.weight.last!, 1)} kg (${r.weight.change! > 0 ? "+" : ""}${br(r.weight.change!, 1)} kg)`,
    ],
    [
      "Exercícios",
      r.exercise.count
        ? `${r.exercise.count} treino(s) em ${r.exercise.activeDays} dia(s) · ${durationLabel(r.exercise.minutes)} no total · média de ${br(r.exercise.weeklyMinutes)} min/semana${r.exercise.km ? ` · ${br(r.exercise.km, 2)} km` : ""}${r.exercise.elevation ? ` · ${br(r.exercise.elevation)} m de elevação` : ""}`
        : "Nenhum registro",
    ],
    [
      "Alimentação",
      `${r.days.length} dia(s) com alimentos · ${r.great.length} dentro do disponível · ${r.over.length} acima · ${r.low.length} muito abaixo · ${r.incomplete.length} incompleto(s)`,
    ],
    [
      "Pressão",
      r.pressure.count
        ? `${r.pressure.count} medição(ões) · média ${br(r.pressure.systolic!)}/${br(r.pressure.diastolic!)} mmHg${r.pressure.pulse ? ` · pulso médio ${br(r.pressure.pulse)} bpm` : ""}`
        : "Nenhum registro",
    ],
  ];
  autoTable(doc, {
    startY: y,
    body: summary,
    theme: "plain",
    margin: { left: M, right: M, bottom: 22 },
    styles: { fontSize: 10, cellPadding: { top: 1.6, bottom: 1.6 } },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32, textColor: MUTED },
      1: { textColor: INK },
    },
  });
  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 4;

  const dayRows = (list: ReportDay[], showTop: boolean) =>
    list.map((d) => [
      weekday(d.date),
      `${br(d.consumed)} kcal`,
      d.available === null ? "-" : `${br(d.available)} kcal`,
      d.difference === null
        ? "-"
        : `${d.difference > 0 ? "+" : ""}${br(d.difference)} kcal`,
      ...(showTop
        ? [d.top.map((t) => `${t.name} (${br(t.kcal)})`).join(", ")]
        : []),
    ]);
  heading(`Dias ótimos (${r.great.length})`);
  paragraph(
    "Dias fechados como completos em que o consumo ficou dentro do disponível, sem ficar muito abaixo do gasto em repouso.",
    9,
    MUTED,
  );
  table(
    ["Dia", "Consumido", "Disponível", "Diferença"],
    dayRows(r.great, false),
    "Nenhum dia nessa situação no período.",
  );
  heading(`Dias em que pesou a mão (${r.over.length})`);
  paragraph(
    `Dias completos em que o consumo passou do disponível em mais de 100 kcal, com os itens que mais somaram.`,
    9,
    MUTED,
  );
  table(
    ["Dia", "Consumido", "Disponível", "Acima", "O que mais somou (kcal)"],
    dayRows(r.over, true),
    "Nenhum dia acima do disponível no período.",
  );
  if (r.low.length) {
    heading(`Dias muito abaixo (${r.low.length})`);
    table(
      ["Dia", "Consumido", "Disponível", "Diferença"],
      dayRows(r.low, false),
      "",
    );
  }

  heading("O que dá para melhorar");
  bullets(r.tips);

  // Todas as marcações
  heading("Todas as marcações");
  doc
    .setFont("helvetica", "bold")
    .setFontSize(10.5)
    .setTextColor(...INK);
  const sub = (t: string) => {
    ensure(10);
    doc
      .setFont("helvetica", "bold")
      .setFontSize(10.5)
      .setTextColor(...INK);
    doc.text(t, M, y);
    y += 4;
  };
  sub(`Alimentação (${r.foods.length})`);
  table(
    ["Data", "Alimento", "Quantidade", "kcal", "Origem"],
    [...r.foods]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((f) => {
        const kcal = foodCalories(f);
        return [
          date(f.date),
          f.name,
          `${br(f.grams)} ${foodUnit(f)}`,
          kcal === null ? "pendente" : br(kcal),
          f.source === "ai" ? "IA" : f.source === "label" ? "rótulo" : "-",
        ];
      }),
    "Nenhum alimento registrado.",
  );
  sub(`Exercícios (${r.exercises.length})`);
  table(
    [
      "Data",
      "Tipo",
      "Duração",
      "Distância",
      "Elevação",
      "Intensidade",
      "kcal ativas",
    ],
    r.exercises.map((x) => [
      date(x.date),
      x.type,
      x.minutes ? durationLabel(x.minutes) : "-",
      x.distanceKm ? `${br(x.distanceKm, 2)} km` : "-",
      x.elevationM ? `${br(x.elevationM)} m` : "-",
      x.intensity,
      x.activeCalories !== undefined ? br(x.activeCalories) : "estimado",
    ]),
    "Nenhum exercício registrado.",
  );
  sub(`Peso (${r.weights.length})`);
  table(
    ["Data", "Peso"],
    r.weights.map((w) => [date(w.date), `${br(w.value, 1)} kg`]),
    "Nenhum peso registrado.",
  );
  sub(`Pressão arterial (${r.pressures.length})`);
  table(
    ["Data", "Sistólica", "Diastólica", "Batimentos"],
    r.pressures.map((p) => [
      date(p.date),
      `${p.systolic} mmHg`,
      `${p.diastolic} mmHg`,
      p.pulse ? `${p.pulse} bpm` : "-",
    ]),
    "Nenhuma medição registrada.",
  );

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc
      .setDrawColor(...LINE)
      .setLineWidth(0.2)
      .line(M, H - 16, W - M, H - 16);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(7.5)
      .setTextColor(...MUTED);
    doc.text(
      "Estimativas para acompanhamento. O Ritmo não substitui nutricionista, médico ou profissional de educação física.",
      M,
      H - 11,
    );
    doc.text(`${i}/${pages}`, W - M, H - 11, { align: "right" });
  }
  return doc;
}
