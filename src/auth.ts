export function passwordError(password: string, confirmation: string) {
  if (password.length < 8) return "Use uma senha com pelo menos 8 caracteres.";
  if (password !== confirmation) return "As senhas não conferem.";
  return "";
}
export function authError(error: unknown): string {
  const e = error as { code?: string; status?: number };
  const messages: Record<string, string> = {
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed:
      "Confirme seu e-mail antes de entrar. Use a opção Confirmar e-mail.",
    user_already_exists:
      "Não foi possível criar a conta. Tente entrar ou recuperar sua senha.",
    email_exists:
      "Não foi possível criar a conta. Tente entrar ou recuperar sua senha.",
    signup_disabled:
      "O cadastro está temporariamente indisponível. Tente novamente mais tarde.",
    email_provider_disabled:
      "O acesso por e-mail está temporariamente indisponível.",
    weak_password:
      "Essa senha não atende aos requisitos de segurança. Use uma senha mais longa, com letras, números e símbolos.",
    same_password: "Escolha uma senha diferente da atual.",
    otp_expired: "Código inválido ou expirado. Solicite um novo código.",
    otp_disabled: "A confirmação está temporariamente indisponível.",
    over_email_send_rate_limit:
      "Aguarde alguns minutos antes de solicitar outro e-mail.",
    over_request_rate_limit:
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    email_address_invalid: "Confira o endereço de e-mail informado.",
    email_address_not_authorized:
      "O envio de e-mails ainda não está disponível. Tente novamente mais tarde.",
    reauthentication_needed: "Entre novamente antes de alterar sua senha.",
  };
  if (e?.code && messages[e.code]) return messages[e.code];
  if (e?.status === 429) return "Muitas tentativas. Aguarde alguns minutos.";
  if (e?.status && e.status >= 500)
    return "O serviço está temporariamente indisponível. Tente novamente.";
  return "Não foi possível concluir. Confira sua conexão e tente novamente.";
}
