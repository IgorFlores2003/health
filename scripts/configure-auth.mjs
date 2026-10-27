import { readFileSync, existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

export function authConfiguration(env, templates) {
  const required = [
    "VITE_SUPABASE_URL",
    "SUPABASE_ACCESS_TOKEN",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length)
    throw new Error(
      `Preencha em .env.smtp: ${missing.join(", ")}. A URL pública é lida do .env.`,
    );
  let url;
  try {
    url = new URL(env.VITE_SUPABASE_URL);
  } catch {
    throw new Error("URL do Supabase inválida.");
  }
  const match = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
  if (!match || url.protocol !== "https:")
    throw new Error("Informe a URL HTTPS do projeto Supabase no .env.");
  if (env.SUPABASE_PROJECT_REF && env.SUPABASE_PROJECT_REF !== match[1])
    throw new Error(
      "O projeto informado difere do projeto usado pelo aplicativo.",
    );
  const port = Number(env.SMTP_PORT);
  if (![465, 587].includes(port))
    throw new Error("Use a porta SMTP segura 465 ou 587.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SMTP_FROM_EMAIL))
    throw new Error("E-mail remetente inválido.");
  const password =
    env.SMTP_HOST === "smtp.gmail.com"
      ? env.SMTP_PASSWORD.replace(/\s/g, "")
      : env.SMTP_PASSWORD;
  if (env.SMTP_HOST === "smtp.gmail.com" && !/^[a-zA-Z]{16}$/.test(password))
    throw new Error(
      "Para Gmail, preencha a senha de app de 16 letras, não a senha normal da conta.",
    );
  return {
    ref: match[1],
    body: {
      external_email_enabled: true,
      disable_signup: false,
      mailer_autoconfirm: false,
      mailer_secure_email_change_enabled: true,
      // Mesma regra da tela de cadastro (src/auth.ts), valendo no servidor.
      password_min_length: 8,
      smtp_admin_email: env.SMTP_FROM_EMAIL,
      smtp_host: env.SMTP_HOST,
      smtp_port: String(port),
      smtp_user: env.SMTP_USER,
      smtp_pass: password,
      smtp_sender_name: env.SMTP_FROM_NAME || "Ritmo",
      mailer_subjects_confirmation: "Confirme seu e-mail no Ritmo",
      mailer_templates_confirmation_content: templates.confirmation,
      mailer_subjects_recovery: "Recupere sua senha no Ritmo",
      mailer_templates_recovery_content: templates.recovery,
    },
  };
}
export function configurationError(status, responseBody, fieldNames) {
  // Only return field names known to our own request, never server-provided values.
  const serialized = JSON.stringify(responseBody ?? {});
  const fields = fieldNames.filter((field) =>
    new RegExp(`\\b${field}\\b`).test(serialized),
  );
  const detail = fields.length ? ` Campos citados: ${fields.join(", ")}.` : "";
  return `Não foi possível aplicar a configuração (HTTP ${status}).${detail} Confira o formato dos campos e as permissões do token administrativo.`;
}
async function main() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  for (const file of [".env", ".env.smtp"]) {
    const path = resolve(root, file);
    if (existsSync(path)) loadEnvFile(path);
  }
  const templates = {
    confirmation: readFileSync(
      resolve(root, "supabase/templates/confirmation.html"),
      "utf8",
    ),
    recovery: readFileSync(
      resolve(root, "supabase/templates/recovery.html"),
      "utf8",
    ),
  };
  const { ref, body } = authConfiguration(process.env, templates);
  if (process.argv.includes("--check")) {
    console.log(
      "Configuração local válida. Senhas e tokens ocultos. Nenhuma alteração remota realizada.",
    );
    return;
  }
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const headers = {
    Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
  const result = await fetch(endpoint, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!result.ok) {
    const responseBody = await result.json().catch(() => null);
    throw new Error(
      configurationError(result.status, responseBody, Object.keys(body)),
    );
  }
  const verification = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  if (!verification.ok)
    throw new Error(
      "A configuração foi enviada, mas não foi possível confirmar a leitura remota.",
    );
  const actual = await verification.json();
  for (const key of [
    "external_email_enabled",
    "disable_signup",
    "mailer_autoconfirm",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_admin_email",
    "smtp_sender_name",
    "mailer_templates_confirmation_content",
    "mailer_templates_recovery_content",
  ]) {
    if (actual[key] !== body[key])
      throw new Error(
        "A configuração foi enviada, mas a verificação remota encontrou uma divergência.",
      );
  }
  console.log(
    "Cadastro, confirmação por código, recuperação de senha e SMTP configurados no Supabase. Teste o cadastro no app para verificar a entrega real do e-mail.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(
      error?.cause
        ? "Falha de conexão com a API do Supabase. Confira sua rede."
        : error.message,
    );
    process.exitCode = 1;
  });
}
