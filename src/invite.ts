import { Capacitor } from "@capacitor/core";

/**
 * Convite de amizade por link: https://health-e7a86.web.app/amigo/CODIGO.
 * No Android o link abre o app (App Links, public/.well-known/assetlinks.json);
 * sem o app, abre a versão web. O código fica guardado até a pessoa entrar
 * na conta e é usado na aba Amigos.
 */
export const APP_URL = "https://health-e7a86.web.app";
const KEY = "ritmo-invite";

export const inviteLink = (code: string) => `${APP_URL}/amigo/${code}`;

function codeFrom(url: string) {
  const m =
    /\/amigo\/([0-9a-f]{8})\b/i.exec(url) ??
    /[?&]amigo=([0-9a-f]{8})\b/i.exec(url);
  return m ? m[1].toUpperCase() : null;
}
function save(code: string) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* sem armazenamento: usa só nesta sessão */
  }
}

/** Código de convite guardado (e que ainda não foi usado). */
export function takeInvite() {
  try {
    const code = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}

/**
 * Lê convites: o endereço com que o app/web abriu e, no Android, links
 * abertos com o app já rodando. Chama onInvite quando chega um código.
 */
export async function listenInvites(onInvite: (code: string) => void) {
  if (!Capacitor.isNativePlatform()) {
    const code = codeFrom(location.href);
    if (code) {
      save(code);
      history.replaceState(null, "", "/");
      onInvite(code);
    }
    return () => {};
  }
  const { App } = await import("@capacitor/app");
  const launch = await App.getLaunchUrl();
  const first = launch?.url && codeFrom(launch.url);
  if (first) {
    save(first);
    onInvite(first);
  }
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    const code = codeFrom(url);
    if (code) {
      save(code);
      onInvite(code);
    }
  });
  return () => void handle.remove();
}
