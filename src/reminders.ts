import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Hydration } from "./domain";

/**
 * Tipo de notificação: cada um tem o seu ícone na barra de status
 * (android/app/src/main/res/drawable/ic_stat_*.xml) e a sua cor.
 */
export type NotifyKind =
  | "nudge"
  | "help"
  | "water"
  | "medal"
  | "level"
  | "pet"
  | "mission"
  | "goal"
  | "friend"
  | "like"
  | "comment";
export const NOTIFY_COLORS: Record<NotifyKind, string> = {
  nudge: "#F97316",
  help: "#DC2626",
  water: "#0EA5E9",
  medal: "#EAB308",
  level: "#8B5CF6",
  pet: "#22C55E",
  mission: "#16A34A",
  goal: "#D91C1C",
  friend: "#EC4899",
  like: "#E11D48",
  comment: "#2563EB",
};
const look = (kind: NotifyKind) => ({
  smallIcon: `ic_stat_${kind}`,
  iconColor: NOTIFY_COLORS[kind],
});

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
      ...look("water"),
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
export async function notifyNow(title: string, body: string, kind: NotifyKind) {
  if (!remindersSupported()) return;
  if ((await LocalNotifications.checkPermissions()).display !== "granted")
    return;
  await LocalNotifications.schedule({
    notifications: [
      {
        ...look(kind),
        id: 2000 + Math.floor(Math.random() * 100000),
        title,
        body,
      },
    ],
  });
}
