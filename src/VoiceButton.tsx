import { useEffect, useRef, useState } from "react";
import { RiMicLine, RiStopFill } from "react-icons/ri";
import { MAX_SECONDS, startRecording, voiceSupported } from "./voice";

/**
 * Grava um áudio e entrega para onAudio (que chama a IA e preenche o
 * formulário). Toque para começar, toque de novo para enviar.
 */
export default function VoiceButton({
  label = "Falar",
  hint,
  disabled,
  onAudio,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** Recebe o áudio e o formulário do botão; devolve o aviso a mostrar. */
  onAudio: (
    audio: Blob,
    form: HTMLFormElement | null,
  ) => Promise<string | void>;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const recording = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  useEffect(() => {
    if (seconds === null) return;
    if (seconds >= MAX_SECONDS) {
      void stop();
      return;
    }
    const t = setTimeout(
      () => setSeconds((s) => (s === null ? s : s + 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [seconds]);
  // Fechou o formulário gravando: solta o microfone.
  useEffect(() => () => void recording.current?.stop(), []);

  async function start() {
    setMessage(undefined);
    try {
      recording.current = await startRecording();
      setSeconds(0);
    } catch {
      setMessage({
        text: "Não foi possível usar o microfone. Permita o acesso ao microfone para o Ritmo.",
        error: true,
      });
    }
  }
  async function stop() {
    const r = recording.current;
    if (!r) return;
    recording.current = null;
    setSeconds(null);
    setBusy(true);
    try {
      const text = await onAudio(await r.stop(), button.current?.form ?? null);
      if (text) setMessage({ text });
    } catch (e) {
      setMessage({
        text:
          e instanceof Error ? e.message : "Não foi possível entender o áudio.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!voiceSupported()) return null;
  const live = seconds !== null;
  return (
    <div>
      <button
        ref={button}
        type="button"
        className={live ? "btn-primary animate-pulse" : "btn-secondary"}
        disabled={disabled || busy}
        aria-pressed={live}
        onClick={() => (live ? void stop() : void start())}
      >
        {live ? (
          <>
            <RiStopFill className="size-5" /> Parar e enviar ·{" "}
            <span className="tabular-nums">
              0:{String(seconds).padStart(2, "0")}
            </span>
          </>
        ) : (
          <>
            <RiMicLine className="size-5" />
            {busy ? "Entendendo…" : label}
          </>
        )}
      </button>
      {hint && !message && <p className="hint">{hint}</p>}
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`mt-2 text-[13px] ${message.error ? "text-brand-700" : "text-ink-500"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
