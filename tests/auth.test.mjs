import test from "node:test";
import assert from "node:assert/strict";
import { passwordError, authError } from "../src/auth.ts";
import { authConfiguration, configurationError } from "../scripts/configure-auth.mjs";
test("new passwords require length and matching confirmation", () => {
  assert.match(passwordError("abc", "abc"), /8 caracteres/);
  assert.match(passwordError("abcdefgh", "abcdxxxx"), /não conferem/);
  assert.equal(passwordError("abcdefgh", "abcdefgh"), "");
});
test("auth failures are translated without exposing backend secrets", () => {
  assert.match(authError({ code: "invalid_credentials" }), /incorretos/);
  assert.match(authError({ code: "otp_expired" }), /expirado/);
  assert.match(authError({ status: 429 }), /Aguarde/);
  assert.equal(
    authError(new Error("secret backend detail")),
    "Não foi possível concluir. Confira sua conexão e tente novamente.",
  );
});
const env = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ACCESS_TOKEN: "test-only",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "587",
  SMTP_USER: "test@example.com",
  SMTP_PASSWORD: "abcd efgh ijkl mnop",
  SMTP_FROM_EMAIL: "test@example.com",
};
const templates = { confirmation: "{{ .Token }}", recovery: "{{ .Token }}" };
test("SMTP config keeps confirmation enabled and uses OTP templates", () => {
  const { body, ref } = authConfiguration(env, templates);
  assert.equal(ref, "example");
  assert.equal(body.mailer_autoconfirm, false);
  assert.equal(body.disable_signup, false);
  assert.equal(body.smtp_pass, "abcdefghijklmnop");
  assert.equal(body.smtp_port, "587");
  assert.equal(body.mailer_templates_recovery_content, "{{ .Token }}");
});
test("SMTP refuses missing credentials, different projects and unsafe ports", () => {
  assert.throws(
    () => authConfiguration({ ...env, SMTP_PASSWORD: "" }, templates),
    /SMTP_PASSWORD/,
  );
  assert.throws(
    () =>
      authConfiguration(
        { ...env, SUPABASE_PROJECT_REF: "different" },
        templates,
      ),
    /difere/,
  );
  assert.throws(
    () => authConfiguration({ ...env, SMTP_PORT: "25" }, templates),
    /segura/,
  );
  assert.throws(
    () => authConfiguration({ ...env, SMTP_PASSWORD: "short" }, templates),
    /16 letras/,
  );
});

test("configuration diagnostics name invalid fields without printing server values", () => {
  const message = configurationError(400, {message: ["smtp_port must be a string", "smtp_pass: private-secret"]}, ["smtp_port", "smtp_pass"]);
  assert.match(message, /smtp_port/);
  assert.match(message, /HTTP 400/);
  assert.ok(!message.includes("private-secret"));
  assert.ok(!configurationError(400, {message:"unknown secret"}, ["smtp_port"]).includes("unknown secret"));
});
