import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

/**
 * Pede o push de uma ação para os amigos (função supabase/functions/notify):
 * puxão, comentário, curtida ou post. Se falhar, a ação já está salva e
 * aparece na aba Notificações deles.
 */
export function pushNotify(
  body:
    | { nudge: string }
    | { comment: string }
    | { like: string }
    | { post: string },
) {
  void supabase?.functions.invoke("notify", { body }).catch(() => undefined);
}

/**
 * Push (Firebase Cloud Messaging) no Android: o aparelho se registra e
 * guarda o endereço em push_tokens. Assim puxões, comentários, curtidas e
 * posts chegam mesmo com o app fechado. Ao tocar na notificação, onOpen
 * recebe o tipo e o post para abrir a tela certa.
 */
export async function registerPush(
  onOpen: (kind?: string, post?: string) => void,
) {
  if (!supabase || Capacitor.getPlatform() !== "android") return;
  const db = supabase;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.checkPermissions();
  const granted =
    perm.receive === "granted" ||
    (await PushNotifications.requestPermissions()).receive === "granted";
  if (!granted) return;
  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener("registration", ({ value }) => {
    void db.rpc("save_push_token", { t: value, p: "android" });
  });
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    ({ notification }) =>
      onOpen(notification.data?.kind, notification.data?.post),
  );
  await PushNotifications.register();
}

/** Ao sair da conta: este aparelho para de receber push dessa conta. */
export async function unregisterPush() {
  if (!supabase || Capacitor.getPlatform() !== "android") return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const db = supabase;
  await new Promise<void>((done) => {
    void PushNotifications.addListener("registration", async ({ value }) => {
      await db.from("push_tokens").delete().eq("token", value);
      done();
    });
    void PushNotifications.register();
    setTimeout(done, 3000);
  });
  await PushNotifications.removeAllListeners();
}
