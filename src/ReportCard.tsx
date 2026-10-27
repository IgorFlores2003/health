import { useMemo, useState } from "react";
import { RiFilePdf2Line, RiShareLine } from "react-icons/ri";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { today, type State } from "./domain";
import { analyzePeriod } from "./report";

/** Primeira data com algum registro (período "Tudo"). */
export function firstDate(state: State) {
  const dates = [
    ...state.weights,
    ...state.exercises,
    ...state.pressures,
    ...(state.foods ?? []),
    ...(state.water ?? []),
  ].map((x) => x.date);
  return dates.length ? dates.sort()[0] : today();
}

const label = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/** Plugin nativo (android/.../FileOpenerPlugin.java): abre no leitor de PDF. */
const FileOpener = registerPlugin<{
  open(options: { uri: string; mime: string }): Promise<void>;
}>("FileOpener");

/** Gera o PDF com todas as marcações e o resumo do período do filtro. */
export default function ReportCard({
  state,
  from,
  to,
  onError,
}: {
  state: State;
  /** Período do filtro da aba Registros. */
  from: string;
  to: string;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const r = useMemo(() => analyzePeriod(state, from, to), [state, from, to]);
  const total =
    r.foods.length + r.exercises.length + r.weights.length + r.pressures.length;

  async function generate(action: "open" | "share") {
    // No navegador, a aba é aberta já no toque (depois o bloqueador de pop-up impede).
    const tab =
      !Capacitor.isNativePlatform() && action === "open"
        ? window.open("", "_blank")
        : null;
    setBusy(true);
    try {
      const { buildReportPdf } = await import("./reportPdf");
      const doc = buildReportPdf(state, r);
      const name = `ritmo-relatorio-${from}-a-${to}.pdf`;
      if (!Capacitor.isNativePlatform()) {
        if (tab) tab.location.href = String(doc.output("bloburl"));
        else doc.save(name);
        return;
      }
      // No app Android não há download do navegador: salva no cache e abre
      // no leitor de PDF do celular (ou compartilha).
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
      if (action === "open")
        try {
          await FileOpener.open({ uri: file.uri, mime: "application/pdf" });
          return;
        } catch {
          // Sem leitor de PDF instalado: oferece compartilhar/salvar.
        }
      await Share.share({ title: "Relatório Ritmo", url: file.uri });
    } catch (e) {
      tab?.close();
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
            <p className="mt-1 text-sm font-medium text-ink-700">
              {from === to
                ? `Dia ${label(from)}`
                : `De ${label(from)} a ${label(to)}`}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            className="btn-primary"
            disabled={busy || total === 0}
            onClick={() => generate("open")}
          >
            <RiFilePdf2Line className="size-5" />
            {busy ? "Gerando…" : "Abrir PDF"}
          </button>
          <button
            className="btn-secondary"
            disabled={busy || total === 0}
            onClick={() => generate("share")}
            aria-label="Compartilhar ou salvar PDF"
            title="Compartilhar ou salvar"
          >
            <RiShareLine className="size-5" />
            <span className="hidden sm:inline">Compartilhar</span>
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
