import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { RiPulseLine, RiShieldCheckLine } from "react-icons/ri";
import AccountAccess from "./AccountAccess";
import App from "./App";
import { supabase } from "./supabase";
import { hasConfirmedEmail } from "./access";
import { applyAccent } from "./theme";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [verified, setVerified] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [recovery, setRecovery] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      setSession(null);
      return;
    }
    // Supabase emits INITIAL_SESSION after reading its stored session.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") {
        setVerified(null);
        setRecovery(false);
        setError("");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session === undefined) return;
    let active = true;
    setVerified(null);
    setError("");
    if (!session || !supabase) {
      setChecking(false);
      return;
    }
    // Sem internet: confia na sessão guardada neste aparelho (já validada
    // antes) para abrir o app; tudo fica salvo e sobe quando a rede voltar.
    const offlineEntry = () => {
      if (!active || !hasConfirmedEmail(session.user)) return false;
      active = false;
      clearTimeout(timer);
      setVerified(session.user);
      setChecking(false);
      return true;
    };
    setChecking(true);
    const timer = setTimeout(() => {
      if (!navigator.onLine && offlineEntry()) return;
      if (active) {
        active = false;
        setChecking(false);
        setError(
          "A verificação demorou mais que o esperado. Confira sua conexão e tente novamente.",
        );
      }
    }, 15000);
    if (!navigator.onLine) {
      offlineEntry();
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
    void supabase.auth
      .getUser(session.access_token)
      .then(({ data, error }) => {
        if (!active) return;
        // Falha de rede (não é sessão inválida): entra com a sessão guardada.
        if (error?.name === "AuthRetryableFetchError" && offlineEntry()) return;
        if (error || !data.user) {
          setError(
            "Não foi possível validar sua sessão. Tente novamente ou entre com sua conta.",
          );
        } else if (!hasConfirmedEmail(data.user)) {
          setError(
            "Confirme seu e-mail antes de acessar seus registros. Informe o código que enviamos para você.",
          );
          setPendingEmail(data.user.email || "");
        } else setVerified(data.user);
      })
      .catch(() => {
        if (offlineEntry()) return;
        if (active)
          setError("Não foi possível validar sua sessão. Confira sua conexão.");
      })
      .finally(() => {
        if (active) {
          clearTimeout(timer);
          setChecking(false);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session, retry]);
  async function exit() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
      return;
    }
    setSession(null);
    setVerified(null);
    setRecovery(false);
  }
  const allowed =
    !checking &&
    verified?.id === session?.user.id &&
    hasConfirmedEmail(verified);
  const inApp = Boolean(allowed && verified && !recovery);
  // Fora da conta (login, cadastro, recuperação) vale sempre a cor padrão;
  // a cor escolhida pela pessoa só é aplicada dentro do app.
  useEffect(() => {
    if (!inApp && !checking) applyAccent(undefined);
  }, [inApp, checking]);
  if (inApp) return <App key={verified!.id} account={verified!} />;
  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="hidden w-[40%] max-w-xl flex-col justify-between bg-brand-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <RiPulseLine className="size-8" />
          Ritmo
        </div>
        <p className="max-w-xs text-lg leading-relaxed text-white">
          Peso, alimentação, exercícios e pressão arterial em um só lugar.
        </p>
        <p className="flex items-center gap-2 text-sm text-white opacity-80">
          <RiShieldCheckLine className="size-5" />
          Seus registros ficam na sua conta.
        </p>
      </aside>
      <main className="flex flex-1 justify-center px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:items-center">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-2xl font-bold tracking-tight lg:hidden">
            <RiPulseLine className="size-8 text-brand-600" />
            Ritmo
          </div>
          {checking ? (
            <div
              className="flex min-h-56 items-center justify-center gap-3 text-ink-500"
              role="status"
            >
              <span className="size-5 animate-spin rounded-full border-2 border-line border-t-brand-600" />
              Verificando sua sessão…
            </div>
          ) : !supabase ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                Acesso indisponível
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
                A conexão do aplicativo ainda precisa ser configurada. Tente
                novamente mais tarde.
              </p>
            </>
          ) : error ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                Confirme seu acesso
              </h2>
              <p
                role="alert"
                className="mt-4 mb-6 rounded-lg bg-brand-50 p-3 text-sm leading-relaxed text-brand-800"
              >
                {error}
              </p>
              <div className="flex flex-col gap-2">
                {pendingEmail && (
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      const address = pendingEmail;
                      await exit();
                      setPendingEmail(address);
                    }}
                  >
                    Informar código
                  </button>
                )}
                <button
                  className={pendingEmail ? "btn-secondary" : "btn-primary"}
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Tentar novamente
                </button>
                <button
                  className="btn-ghost text-ink-700"
                  onClick={async () => {
                    await exit();
                    setPendingEmail("");
                  }}
                >
                  Voltar para entrar
                </button>
              </div>
            </>
          ) : (
            <AccountAccess
              key={pendingEmail}
              initialEmail={pendingEmail}
              initialMode={pendingEmail ? "confirm" : undefined}
              user={recovery ? session?.user.email || "" : ""}
              recovery={recovery}
              onRecovered={() => setRecovery(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
