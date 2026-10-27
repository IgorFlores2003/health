import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

/**
 * Push (Firebase Cloud Messaging) no Android: o aparelho se registra e
 * guarda o endereço em push_tokens. Assim o puxão de orelha chega mesmo com
 * o app fechado (função supabase/functions/notify).
 */
export async function registerPush() {
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
