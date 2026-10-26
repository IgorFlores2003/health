import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Activity, ShieldCheck } from "lucide-react";
import AccountAccess from "./AccountAccess";
import App from "./App";
import { supabase } from "./supabase";
import { hasConfirmedEmail } from "./access";

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
    setChecking(true);
    const timer = setTimeout(() => {
      if (active) {
        active = false;
        setChecking(false);
        setError(
          "A verificação demorou mais que o esperado. Confira sua conexão e tente novamente.",
        );
      }
    }, 15000);
    void supabase.auth
      .getUser(session.access_token)
      .then(({ data, error }) => {
        if (!active) return;
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
  if (allowed && verified && !recovery)
    return <App key={verified.id} account={verified} />;
  return (
    <div className="auth-screen">
      <section className="auth-story">
        <div className="auth-brand">
          <Activity size={30} />
          <span>ritmo.</span>
        </div>
        <div>
          <span className="eyebrow">SUA SAÚDE, NO SEU TEMPO</span>
          <h1>
            Seu próximo passo
            <br />
            começa por aqui.
          </h1>
          <p>
            Um espaço para acompanhar seu peso, seu movimento e suas pequenas
            conquistas.
          </p>
        </div>
        <div className="auth-private">
          <ShieldCheck size={20} />
          Uma conta só sua. Uma jornada no seu ritmo.
        </div>
      </section>
      <section className="auth-entry">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Activity size={25} /> ritmo.
          </div>
          {checking ? (
            <div className="auth-loading" role="status">
              <span className="auth-spinner" />
              Verificando sua sessão…
            </div>
          ) : !supabase ? (
            <>
              <h2>Acesso temporariamente indisponível</h2>
              <p>
                A conexão do aplicativo ainda precisa ser configurada. Tente
                novamente mais tarde.
              </p>
            </>
          ) : error ? (
            <>
              <h2>Vamos confirmar seu acesso</h2>
              <p role="alert" className="auth-error">
                {error}
              </p>
              <div className="action-row">
                <button
                  className="primary"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Tentar novamente
                </button>
                {pendingEmail && (
                  <button
                    className="secondary"
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
                  className="secondary"
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
          <p className="auth-footnote">
            Seus registros ficam disponíveis depois de entrar e confirmar seu
            e-mail.
          </p>
        </div>
      </section>
    </div>
  );
}
