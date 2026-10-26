import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiKey2Line,
  RiLockPasswordLine,
  RiMailCheckLine,
} from "react-icons/ri";
import { supabase } from "./supabase";
import { authError, passwordError } from "./auth";
type Mode = "login" | "signup" | "confirm" | "forgot" | "recover" | "password";
export default function AccountAccess({
  user,
  recovery,
  onRecovered,
  initialEmail = "",
  initialMode,
}: {
  user: string;
  recovery: boolean;
  onRecovered: () => void;
  initialEmail?: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(
    recovery ? "password" : initialMode || "login",
  );
  const [email, setEmail] = useState(initialEmail);
  // Na tela de código, o e-mail só é pedido quando ainda não sabemos qual é.
  const [emailKnown, setEmailKnown] = useState(Boolean(initialEmail));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (recovery) {
      setMode("password");
      setPassword("");
      setConfirmation("");
      setError("");
      setMessage("Confirmação recebida. Escolha sua nova senha.");
    }
  }, [recovery]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  function change(next: Mode) {
    if (inFlight.current) return;
    setEmailKnown(false);
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmation("");
    setToken("");
    setVisible(false);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || inFlight.current) return;
    setError("");
    setMessage("");
    if (mode === "signup" || mode === "password") {
      const problem = passwordError(password, confirmation);
      if (problem) {
        setError(problem);
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const address = email.trim();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error?.code === "email_not_confirmed") {
          setPassword("");
          setEmailKnown(true);
          setMode("confirm");
          await supabase.auth.resend({ type: "signup", email: address });
          setCooldown(60);
          setMessage(
            "Seu e-mail ainda não foi confirmado. Enviamos um novo código.",
          );
          return;
        }
        if (error) throw error;
        setPassword("");
        setMessage(
          "Conta conectada. Seus registros podem ser salvos na conta.",
        );
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        setPassword("");
        setConfirmation("");
        setCooldown(60);
        if (data.session) {
          setMessage("Conta criada e conectada.");
          setMode("login");
        } else {
          setEmailKnown(true);
          setMode("confirm");
          setMessage(
            "Se o cadastro puder ser concluído, o código chega em instantes. Confira também o spam. Se já possui uma conta, volte e use Entrar ou Esqueci minha senha.",
          );
        }
      } else if (mode === "confirm") {
        const { error } = await supabase.auth.verifyOtp({
          email: address,
          token: token.trim(),
          type: "email",
        });
        if (error) throw error;
        setToken("");
        setMode("login");
        setMessage("E-mail confirmado. Sua conta está conectada.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(address);
        if (error) throw error;
        setCooldown(60);
        setMode("recover");
        setMessage(
          "Se houver uma conta para esse e-mail, o código chega em instantes. Confira também o spam.",
        );
      } else if (mode === "recover") {
        const { error } = await supabase.auth.verifyOtp({
          email: address,
          token: token.trim(),
          type: "recovery",
        });
        if (error) throw error;
        setToken("");
        setMode("password");
        setMessage("Código confirmado. Escolha sua nova senha.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setConfirmation("");
        setMode("login");
        onRecovered();
        setMessage("Senha atualizada com sucesso.");
      }
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function resend() {
    if (!supabase || inFlight.current || cooldown || !email.trim()) return;
    setError("");
    inFlight.current = true;
    setBusy(true);
    try {
      const { error } =
        mode === "recover"
          ? await supabase.auth.resetPasswordForEmail(email.trim())
          : await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw error;
      setCooldown(60);
      setMessage(
        "Se houver uma confirmação pendente, um novo código será enviado. Confira seu e-mail.",
      );
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  if (!supabase) return null;
  const changingPassword = mode === "password";
  const successBox =
    "mb-4 rounded-lg bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800";
  if (user && !changingPassword)
    return (
      <div className="mt-4">
        {message && (
          <p role="status" className={successBox}>
            {message}
          </p>
        )}
        <button className="btn-secondary" onClick={() => change("password")}>
          <RiLockPasswordLine className="size-4" />
          Alterar minha senha
        </button>
      </div>
    );
  const titles: Record<Mode, string> = {
    login: "Entrar",
    signup: "Criar conta",
    confirm: "Confirme seu e-mail",
    forgot: "Esqueceu a senha?",
    recover: "Digite o código",
    password: "Nova senha",
  };
  const labels: Record<Mode, string> = {
    login: "Entrar",
    signup: "Criar conta",
    confirm: "Confirmar e-mail",
    forgot: "Enviar código",
    recover: "Verificar código",
    password: "Salvar nova senha",
  };
  const notices = (
    <>
      {error && (
        <p
          className="mb-4 rounded-lg bg-brand-50 p-3 text-sm leading-relaxed text-brand-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {message && (
        <p className={successBox} role="status">
          {message}
        </p>
      )}
    </>
  );
  const submitButton = (
    <button className="btn-primary w-full" type="submit">
      {busy ? "Aguarde…" : labels[mode]}
      {!busy && <RiCheckLine className="size-4" />}
    </button>
  );
  const passwordField = (
    <label className="mb-4 block">
      <span className="label">
        {mode === "password" ? "Nova senha" : "Senha"}
      </span>
      <span className="relative block">
        <input
          className="input pr-12"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type={visible ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "login" ? 1 : 8}
          required
        />
        <button
          type="button"
          className="icon-btn absolute top-1/2 right-1 -translate-y-1/2"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? (
            <RiEyeOffLine className="size-5" />
          ) : (
            <RiEyeLine className="size-5" />
          )}
        </button>
      </span>
    </label>
  );
  const confirmationField = (
    <label className="mb-4 block">
      <span className="label">Confirme a senha</span>
      <input
        className="input"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        minLength={8}
        required
      />
      <span className="hint block">Mínimo de 8 caracteres.</span>
    </label>
  );
  const emailField = (readOnly = false) => (
    <label className="mb-4 block">
      <span className="label">E-mail</span>
      <input
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        readOnly={readOnly}
      />
    </label>
  );

  // Etapas fora do login/cadastro abrem como telas próprias.
  if (mode !== "login" && mode !== "signup") {
    const code = mode === "confirm" || mode === "recover";
    const steps = ["forgot", "recover", "password"] as const;
    const step = steps.indexOf(mode as (typeof steps)[number]);
    const back = () => {
      if (recovery) onRecovered();
      if (mode === "recover") change("forgot");
      else change("login");
    };
    const Icon =
      mode === "confirm"
        ? RiMailCheckLine
        : mode === "password"
          ? RiLockPasswordLine
          : RiKey2Line;
    return (
      <div className={user ? "mt-4" : ""}>
        <button
          type="button"
          className="btn-ghost -ml-2 mb-6 text-ink-700"
          disabled={busy}
          onClick={back}
        >
          <RiArrowLeftLine className="size-5" />
          {user
            ? "Cancelar"
            : mode === "recover"
              ? "Trocar e-mail"
              : "Voltar"}
        </button>
        {step >= 0 && !user && (
          <ol
            className="mb-6 flex gap-1.5"
            aria-label={`Etapa ${step + 1} de 3`}
          >
            {steps.map((s, i) => (
              <li
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brand-600" : "bg-line"}`}
              />
            ))}
          </ol>
        )}
        {!user && (
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="size-6" />
          </span>
        )}
        <h2 className="text-2xl font-bold tracking-tight">{titles[mode]}</h2>
        <p className="mt-2 mb-6 text-[15px] leading-relaxed text-ink-500">
          {mode === "forgot" ? (
            "Informe o e-mail da conta. Vamos enviar um código para você criar uma nova senha."
          ) : mode === "password" ? (
            "Defina a nova senha da sua conta."
          ) : emailKnown || mode === "recover" ? (
            <>
              Enviamos um código de 6 dígitos para{" "}
              <strong className="font-semibold break-all text-ink-900">
                {email.trim()}
              </strong>
              .
            </>
          ) : (
            "Informe seu e-mail e o código de 6 dígitos que enviamos."
          )}
        </p>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="min-w-0">
            {mode === "forgot" && emailField()}
            {mode === "confirm" && !emailKnown && emailField()}
            {code && (
              <label className="mb-4 block">
                <span className="label">Código</span>
                <input
                  className="input min-h-14 text-center text-2xl tracking-[0.5em] tabular-nums placeholder:text-ink-400/50"
                  value={token}
                  onChange={(e) =>
                    setToken(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,10}"
                  minLength={6}
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="000000"
                  aria-describedby="otp-help"
                />
                <span id="otp-help" className="hint block">
                  Vale por 1 hora. Se não chegar, olhe a caixa de spam.
                </span>
              </label>
            )}
            {mode === "password" && (
              <>
                {passwordField}
                {confirmationField}
              </>
            )}
            {notices}
            {submitButton}
          </fieldset>
        </form>
        {code && (
          <div className="mt-4 flex justify-center">
            <button
              disabled={busy || cooldown > 0 || !email.trim()}
              className="btn-ghost"
              onClick={resend}
            >
              {cooldown ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
            </button>
          </div>
        )}
      </div>
    );
  }
  const tab = (active: boolean) =>
    `flex-1 rounded-md py-2 text-sm font-medium transition-colors ${active ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"}`;
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{titles[mode]}</h2>
      <div
        className="mt-5 mb-6 flex gap-1 rounded-lg bg-surface p-1 ring-1 ring-line"
        aria-label="Acesso à conta"
      >
        <button
          type="button"
          className={tab(mode === "login")}
          aria-pressed={mode === "login"}
          disabled={busy}
          onClick={() => change("login")}
        >
          Entrar
        </button>
        <button
          type="button"
          className={tab(mode === "signup")}
          aria-pressed={mode === "signup"}
          disabled={busy}
          onClick={() => change("signup")}
        >
          Criar conta
        </button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="min-w-0">
          {mode === "signup" && (
            <label className="mb-4 block">
              <span className="label">Nome</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={60}
                required
              />
            </label>
          )}
          {emailField()}
          {passwordField}
          {mode === "login" && (
            <div className="-mt-2 mb-4 flex justify-end">
              <button
                type="button"
                className="btn-ghost -mr-2"
                onClick={() => change("forgot")}
              >
                Esqueceu a senha?
              </button>
            </div>
          )}
          {mode === "signup" && confirmationField}
          {notices}
          {submitButton}
        </fieldset>
      </form>
      {mode === "login" && (
        <div className="mt-4 flex justify-center">
          <button
            disabled={busy}
            className="btn-ghost text-ink-700"
            onClick={() => change("confirm")}
          >
            Tenho um código de confirmação
          </button>
        </div>
      )}
    </div>
  );
}
