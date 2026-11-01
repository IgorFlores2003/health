import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { today, type State } from "./domain";
import { addSteps, stepDelta, type SensorMark } from "./stepMath";

export { setSteps } from "./stepMath";

/** Plugin nativo (android/.../StepCounterPlugin.java). */
const StepCounter = registerPlugin<{
  status(): Promise<{ available: boolean; granted: boolean }>;
  requestAccess(): Promise<{ available: boolean; granted: boolean }>;
  read(): Promise<{ steps: number; bootAt: number }>;
}>("StepCounter");

const isAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
const read = <T>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: recomeça a contagem na próxima vez */
  }
};

export type StepCounterState = {
  /** O celular tem contador de passos (só no app Android). */
  supported: boolean;
  /** Contagem automática ligada neste aparelho. */
  enabled: boolean;
  error: string;
  enable: () => Promise<void>;
  disable: () => void;
  refresh: () => Promise<void>;
};

/**
 * Contagem automática: lê o contador do celular ao abrir o app, a cada
 * minuto com ele aberto e ao voltar para ele. Só este aparelho conta (o
 * ligado fica guardado nele); os passos sincronizam com a conta.
 */
export function useStepCounter(
  userId: string,
  setState: Dispatch<SetStateAction<State>>,
): StepCounterState {
  const onKey = `ritmo-steps-on-${userId}`;
  const markKey = `ritmo-steps-mark-${userId}`;
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(() => read<boolean>(onKey) === true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAndroid()) return;
    void StepCounter.status()
      .then((s) => {
        setSupported(s.available);
        // Permissão retirada nas configurações do Android: desliga.
        if (!s.granted && read<boolean>(onKey)) {
          write(onKey, null);
          setEnabled(false);
        }
      })
      .catch(() => setSupported(false));
  }, [onKey]);
  const refresh = useCallback(async () => {
    if (!isAndroid()) return;
    try {
      const reading = await StepCounter.read();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { delta, next } = stepDelta(
        read<SensorMark>(markKey),
        reading,
        start.getTime(),
      );
      write(markKey, next);
      if (delta > 0)
        setState((s) => ({ ...s, steps: addSteps(s.steps, today(), delta) }));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível ler os passos.",
      );
    }
  }, [markKey, setState]);
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    const visible = () =>
      document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, refresh]);
  return {
    supported,
    enabled,
    error,
    enable: async () => {
      try {
        const s = await StepCounter.requestAccess();
        if (!s.available) throw Error("Este celular não tem contador de passos.");
        if (!s.granted)
          throw Error(
            "Sem a permissão de atividade física o Ritmo não consegue contar os passos. Ative em Configurações do Android → Apps → Ritmo → Permissões.",
          );
        write(markKey, null);
        write(onKey, true);
        setEnabled(true);
        setError("");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Não foi possível ativar a contagem.",
        );
      }
    },
    disable: () => {
      write(onKey, null);
      write(markKey, null);
      setEnabled(false);
    },
    refresh,
  };
}
