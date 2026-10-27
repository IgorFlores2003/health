import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Hydration } from "./domain";

/** Faixa de ids reservada aos lembretes de água. */
const FIRST_ID = 1000;
const MAX_REMINDERS = 96;

export const remindersSupported = () => Capacitor.isNativePlatform();

/** Pede a permissão de notificação (Android 13+). true se liberada. */
export async function allowReminders() {
  if (!remindersSupported()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const asked = await LocalNotifications.requestPermissions();
  return asked.display === "granted";
}

/** Horários do dia (minutos desde 0h) entre o início e o fim, a cada intervalo. */
function reminderTimes(h: Hydration) {
  const times: number[] = [];
  for (
    let t = h.startHour * 60;
    t < h.endHour * 60 && times.length < MAX_REMINDERS;
    t += h.everyMinutes
  )
    times.push(t);
  return times;
}

/**
 * Troca os lembretes agendados pelos da configuração atual. Cada horário
 * repete todo dia no aparelho, mesmo com o app fechado.
 */
export async function syncWaterReminders(h: Hydration | undefined) {
  if (!remindersSupported()) return;
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter(
    (n) => n.id >= FIRST_ID && n.id < FIRST_ID + MAX_REMINDERS,
  );
  if (ours.length)
    await LocalNotifications.cancel({
      notifications: ours.map((n) => ({ id: n.id })),
    });
  if (!h?.reminders) return;
  if ((await LocalNotifications.checkPermissions()).display !== "granted")
    return;
  await LocalNotifications.schedule({
    notifications: reminderTimes(h).map((t, i) => ({
      id: FIRST_ID + i,
      title: "Hora de beber água",
      body: `Que tal um copo de ${h.cupMl} ml agora?`,
      schedule: {
        on: { hour: Math.floor(t / 60), minute: t % 60 },
        allowWhileIdle: true,
      },
    })),
  });
}

/** Notificação na hora (ex.: desafio concluído), se o aparelho permitir. */
export async function notifyNow(title: string, body: string) {
  if (!remindersSupported()) return;
  if ((await LocalNotifications.checkPermissions()).display !== "granted")
    return;
  await LocalNotifications.schedule({
    notifications: [
      { id: 2000 + Math.floor(Math.random() * 100000), title, body },
    ],
  });
}
