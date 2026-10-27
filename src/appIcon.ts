import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PresetKey } from "./theme";

/** Plugin nativo (android/.../AppIconPlugin.java): alterna os activity-alias do ícone. */
const AppIcon = registerPlugin<{
  set(options: { name: string }): Promise<void>;
  pending(): Promise<{ name: string | null }>;
  apply(): Promise<void>;
}>("AppIcon");
const KEY = "ritmo-app-icon";
const android = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

/**
 * Guarda o ícone na cor escolhida (só no Android). Ele só é trocado em
 * applyAppIcon, porque o Android fecha o app ao trocar o ícone.
 */
export async function setAppIcon(name: PresetKey) {
  if (!android()) return;
  try {
    if ((localStorage.getItem(KEY) || "red") === name) return;
    await AppIcon.set({ name });
    localStorage.setItem(KEY, name);
  } catch {
    /* ícone fica como estava; a cor do app já mudou */
  }
}

/** Há um ícone novo esperando para ser aplicado? */
export async function appIconPending() {
  if (!android()) return false;
  return !!(await AppIcon.pending().catch(() => ({ name: null }))).name;
}

/** Troca o ícone agora: o app fecha e volta pelo ícone novo. */
export const applyAppIcon = () => AppIcon.apply();
