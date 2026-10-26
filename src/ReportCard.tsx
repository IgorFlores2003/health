import { useMemo, useState } from "react";
import { RiFilePdf2Line } from "react-icons/ri";
import { today, type State } from "./domain";
import { analyzePeriod } from "./report";

const periods = [
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "all", label: "Tudo" },
];

function firstDate(state: State) {
  const dates = [
    ...state.weights,
    ...state.exercises,
    ...state.pressures,
    ...(state.foods ?? []),
  ].map((x) => x.date);
  return dates.length ? dates.sort()[0] : today();
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Gera o PDF com todas as marcações e o resumo do período escolhido. */
export default function ReportCard({
  state,
  onError,
}: {
  state: State;
  onError: (message: string) => void;
}) {
  const [period, setPeriod] = useState("30");
  const [busy, setBusy] = useState(false);
  const from = period === "all" ? firstDate(state) : daysAgo(Number(period));
  const to = today();
  const r = useMemo(() => analyzePeriod(state, from, to), [state, from, to]);
  const total =
    r.foods.length + r.exercises.length + r.weights.length + r.pressures.length;

  async function generate() {
    setBusy(true);
    try {
      const { buildReportPdf } = await import("./reportPdf");
      const doc = buildReportPdf(state, r);
      const name = `ritmo-relatorio-${from}-a-${to}.pdf`;
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) {
        doc.save(name);
        return;
      }
      // No app Android o download do navegador não existe: salva e compartilha.
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const data = doc.output("datauristring").split(",")[1];
      const file = await Filesystem.writeFile({
        path: name,
        data,
        directory: Directory.Cache,
      });
      await Share.share({ title: "Relatório Ritmo", url: file.uri });
    } catch (e) {
      if (!(e instanceof Error && /cancel/i.test(e.message)))
        onError("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <RiFilePdf2Line className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Relatório em PDF</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Todas as marcações do período, um resumo da trajetória, os dias
              ótimos, os dias em que pesou a mão e o que dá para melhorar.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div
            className="flex rounded-lg border border-line p-0.5"
            role="radiogroup"
            aria-label="Período"
          >
            {periods.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={period === p.id}
                className={`min-h-9 rounded-md px-3 text-sm font-medium ${period === p.id ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface"}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            disabled={busy || total === 0}
            onClick={generate}
          >
            <RiFilePdf2Line className="size-5" />
            {busy ? "Gerando…" : "Gerar PDF"}
          </button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ["Marcações", total],
          ["Dias ótimos", r.great.length],
          ["Pesou a mão", r.over.length],
          ["Incompletos", r.incomplete.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface px-3 py-2">
            <dt className="text-ink-500">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="hint">
        O relatório é gerado no seu aparelho. Ele mostra estimativas com base no
        que foi registrado e não substitui nutricionista, médico ou profissional
        de educação física.
      </p>
    </section>
  );
}
