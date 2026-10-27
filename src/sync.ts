import { useCallback, useEffect, useRef, useState } from "react";
import { initial, validState, type State } from "./domain";
import { mergeStates } from "./merge";
import { supabase } from "./supabase";

export type SyncStatus = "loading" | "saving" | "saved" | "offline" | "off";

/**
 * dirty: há alteração deste aparelho ainda não gravada na conta.
 * syncedAt: updated_at da versão da conta que este aparelho conhece.
 * base: essa versão (serve para juntar alterações de dois aparelhos).
 */
type Meta = { dirty: boolean; syncedAt: string | null; base: State | null };
const DELAY = 1200;
const metaKey = (userId: string) => `ritmo-sync-v2:${userId}`;

function readMeta(userId: string, state: State): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(metaKey(userId)) || "null");
    if (m && typeof m.dirty === "boolean")
      return { ...m, base: validState(m.base) ? m.base : null };
  } catch {
    /* sem metadados: decide abaixo */
  }
  // Aparelho que já tinha dados antes da sincronização automática: os dados
  // locais entram na conta (juntados com o que já estiver lá).
  return {
    dirty: JSON.stringify(state) !== JSON.stringify(initial),
    syncedAt: null,
    base: null,
  };
}
function writeMeta(userId: string, meta: Meta) {
  try {
    localStorage.setItem(metaKey(userId), JSON.stringify(meta));
  } catch {
    /* o salvamento local já avisa quando o armazenamento falha */
  }
}
/** Sem base conhecida, junta tudo: nenhum registro de nenhum lado é perdido. */
const emptyBase = (remote: State): State => ({
  ...remote,
  weights: [],
  exercises: [],
  pressures: [],
  foods: [],
  completedDays: [],
});

/**
 * Mantém health_snapshots igual ao estado do app. A gravação é condicional à
 * versão que este aparelho conhece (updated_at): se outro aparelho gravou
 * antes, as duas versões são juntadas registro por registro e a gravação é
 * repetida, em vez de uma sobrescrever a outra. Nada inválido é gravado.
 */
export function useCloudSync(
  userId: string,
  state: State,
  setState: (s: State) => void,
) {
  const [status, setStatus] = useState<SyncStatus>(
    supabase ? "loading" : "off",
  );
  const meta = useRef<Meta>(readMeta(userId, state));
  const ready = useRef(false);
  const adopted = useRef<State | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const running = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const update = useCallback(
    (m: Meta) => {
      meta.current = m;
      writeMeta(userId, m);
    },
    [userId],
  );
  const adopt = useCallback(
    (s: State) => {
      adopted.current = s;
      latest.current = s;
      setState(s);
    },
    [setState],
  );

  const run = useCallback(async () => {
    const db = supabase;
    if (!db) return;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await db
        .from("health_snapshots")
        .select("payload, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return setStatus("offline");
      ready.current = true;
      const remote = data && validState(data.payload) ? data : null;
      const local = latest.current;
      if (!meta.current.dirty && remote) {
        if (remote.updated_at !== meta.current.syncedAt) adopt(remote.payload);
        update({
          dirty: false,
          syncedAt: remote.updated_at,
          base: remote.payload,
        });
        return setStatus("saved");
      }
      // Dados deste aparelho que não passam na validação não podem subir:
      // em vez de travar em silêncio, fica com a cópia da conta.
      if (!validState(local)) {
        if (!remote) return setStatus("offline");
        adopt(remote.payload);
        update({
          dirty: false,
          syncedAt: remote.updated_at,
          base: remote.payload,
        });
        return setStatus("saved");
      }
      let next = local;
      if (remote && remote.updated_at !== meta.current.syncedAt)
        next = mergeStates(
          meta.current.base ?? emptyBase(remote.payload),
          local,
          remote.payload,
        );
      setStatus("saving");
      const updatedAt = new Date().toISOString();
      const write = data
        ? db
            .from("health_snapshots")
            .update({ payload: next, updated_at: updatedAt })
            .eq("user_id", userId)
            .eq("updated_at", data.updated_at)
            .select("updated_at")
        : db
            .from("health_snapshots")
            .insert({ user_id: userId, payload: next, updated_at: updatedAt })
            .select("updated_at");
      const { data: rows, error: writeError } = await write;
      // Outro aparelho gravou entre a leitura e a escrita: lê de novo e junta.
      if (
        (writeError && writeError.code === "23505") ||
        (!writeError && !rows?.length)
      )
        continue;
      if (writeError) return setStatus("offline");
      const syncedAt = rows![0].updated_at as string;
      const changedMeanwhile = latest.current !== local;
      if (next !== local)
        adopt(
          changedMeanwhile ? mergeStates(local, latest.current, next) : next,
        );
      update({ dirty: changedMeanwhile, syncedAt, base: next });
      if (changedMeanwhile) again.current = true;
      return setStatus(changedMeanwhile ? "saving" : "saved");
    }
    setStatus("offline");
  }, [userId, adopt, update]);

  /** Uma sincronização por vez; pedidos durante uma rodada geram mais uma. */
  const sync = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return running.current;
    }
    running.current = (async () => {
      do {
        again.current = false;
        await run();
      } while (again.current);
    })();
    try {
      await running.current;
    } finally {
      running.current = null;
    }
  }, [run]);

  useEffect(() => {
    void sync();
    const online = () => void sync();
    // Ao voltar para o app, traz o que foi salvo em outro aparelho.
    const visible = () => document.visibilityState === "visible" && sync();
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    // Com o app aberto na tela, confere a conta a cada 30 s (o que foi
    // feito no outro aparelho aparece sem precisar sair e voltar).
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, 30000);
    return () => {
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(poll);
    };
  }, [sync]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (adopted.current === state) {
      adopted.current = null;
      return;
    }
    if (!supabase) return;
    update({ ...meta.current, dirty: true });
    if (!ready.current) return;
    setStatus("saving");
    const id = setTimeout(() => void sync(), DELAY);
    return () => clearTimeout(id);
  }, [state, sync, update]);

  /**
   * Descarta o que só existe neste aparelho e usa a cópia da conta (para
   * quando os aparelhos ficaram diferentes).
   */
  const useAccountCopy = useCallback(async () => {
    const db = supabase;
    if (!db) return false;
    const { data, error } = await db
      .from("health_snapshots")
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data || !validState(data.payload)) return false;
    adopt(data.payload);
    update({ dirty: false, syncedAt: data.updated_at, base: data.payload });
    setStatus("saved");
    return true;
  }, [userId, adopt, update]);

  return { status, syncNow: sync, useAccountCopy };
}
