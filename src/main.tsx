import React from "react";
import { createRoot } from "react-dom/client";
import AuthGate from "./AuthGate";
import { ConfirmHost } from "./confirm";
import { applyAccent, applyColorMode, colorMode } from "./theme";
import "./styles.css";

// Aplica a última cor escolhida antes de renderizar (evita piscar o vermelho).
try {
  applyAccent(localStorage.getItem("ritmo-accent") || undefined);
} catch {
  /* sem armazenamento: fica a cor padrão */
}

// Claro/escuro antes de renderizar; no modo Sistema, acompanha o aparelho.
applyColorMode();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (colorMode() === "system") applyColorMode();
});

// Tocar em qualquer parte de um campo de data abre o calendário
// (no iOS/Safari o campo não tem ícone próprio).
document.addEventListener("click", (e) => {
  const el = e.target;
  if (el instanceof HTMLInputElement && el.type === "date" && !el.disabled)
    try {
      el.showPicker();
    } catch {
      /* navegador sem showPicker: abre pelo comportamento padrão */
    }
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate />
    <ConfirmHost />
  </React.StrictMode>,
);
