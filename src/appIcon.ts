import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PresetKey } from "./theme";

/** Plugin nativo (android/.../AppIconPlugin.java): alterna os activity-alias do ícone. */
const AppIcon = registerPlugin<{
  set(options: { name: string }): Promise<void>;
}>("AppIcon");
const KEY = "ritmo-app-icon";

/** Troca o ícone do app no Android; no navegador não faz nada. */
export async function setAppIcon(name: PresetKey) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android")
    return;
  try {
    if ((localStorage.getItem(KEY) || "red") === name) return;
    await AppIcon.set({ name });
    localStorage.setItem(KEY, name);
  } catch {
    /* ícone fica como estava; a cor do app já mudou */
  }
}
