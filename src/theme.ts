/**
 * Cor do app: a pessoa escolhe qualquer cor; a partir dela geramos a escala
 * brand-50…900 usada por todo o Tailwind (variáveis --color-brand-*).
 * O ícone do Android só pode trocar entre ícones já empacotados no app, então
 * ele usa a predefinição mais próxima da cor escolhida.
 */
export const DEFAULT_ACCENT = "#d91c1c";
export const PRESETS = [
  { key: "red", label: "Vermelho", hex: "#d91c1c" },
  { key: "orange", label: "Laranja", hex: "#ea580c" },
  { key: "amber", label: "Âmbar", hex: "#b45309" },
  { key: "green", label: "Verde", hex: "#16a34a" },
  { key: "teal", label: "Turquesa", hex: "#0d9488" },
  { key: "blue", label: "Azul", hex: "#2563eb" },
  { key: "indigo", label: "Anil", hex: "#4f46e5" },
  { key: "purple", label: "Roxo", hex: "#9333ea" },
  { key: "pink", label: "Rosa", hex: "#db2777" },
  { key: "graphite", label: "Grafite", hex: "#3f3f46" },
] as const;
export type PresetKey = (typeof PRESETS)[number]["key"];

type RGB = [number, number, number];
export const isHex = (v: unknown): v is string =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
export function toRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: RGB) =>
  "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
const mix = (a: RGB, b: RGB, t: number): RGB =>
  a.map((x, i) => x + (b[i] - x) * t) as RGB;
function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/** Contraste com texto branco (WCAG). */
const contrastWithWhite = (c: RGB) => 1.05 / (luminance(c) + 0.05);

/**
 * Escala completa. O tom 600 (botões com texto branco) é escurecido até ter
 * contraste mínimo de 4,5:1, para cores claras continuarem legíveis.
 */
export function palette(hex: string, dark = false): Record<string, string> {
  let base = toRgb(isHex(hex) ? hex : DEFAULT_ACCENT);
  for (let i = 0; i < 20 && contrastWithWhite(base) < 4.5; i++)
    base = mix(base, [0, 0, 0], 0.08);
  const white: RGB = [255, 255, 255];
  const black: RGB = [0, 0, 0];
  // Modo escuro: tons de fundo (50–300) puxados para o cartão escuro e tons
  // de texto (700–900) clareados, para continuarem legíveis.
  const card: RGB = [23, 23, 26];
  const steps: [string, RGB][] = dark
    ? [
        ["50", mix(base, card, 0.82)],
        ["100", mix(base, card, 0.7)],
        ["200", mix(base, card, 0.55)],
        ["300", mix(base, card, 0.38)],
        ["400", mix(base, white, 0.3)],
        ["500", mix(base, white, 0.15)],
        ["600", base],
        ["700", mix(base, white, 0.28)],
        ["800", mix(base, white, 0.42)],
        ["900", mix(base, white, 0.56)],
      ]
    : [
    ["50", mix(base, white, 0.93)],
    ["100", mix(base, white, 0.86)],
    ["200", mix(base, white, 0.72)],
    ["300", mix(base, white, 0.52)],
    ["400", mix(base, white, 0.3)],
    ["500", mix(base, white, 0.12)],
    ["600", base],
    ["700", mix(base, black, 0.16)],
    ["800", mix(base, black, 0.3)],
    ["900", mix(base, black, 0.44)],
  ];
  return Object.fromEntries(steps.map(([k, c]) => [k, toHex(c)]));
}

export type ColorMode = "system" | "light" | "dark";
const MODE_KEY = "ritmo-theme";
let accent: string | undefined;
export function colorMode(): ColorMode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "light" || m === "dark" ? m : "system";
  } catch {
    return "system";
  }
}
const systemDark = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-color-scheme: dark)").matches;
export const isDark = () =>
  colorMode() === "dark" || (colorMode() === "system" && systemDark());

/** Claro/escuro (preferência deste aparelho) e a cor recalculada para ele. */
export function applyColorMode(mode?: ColorMode) {
  if (mode)
    try {
      if (mode === "system") localStorage.removeItem(MODE_KEY);
      else localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* fica só nesta sessão */
    }
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#17171a" : "#ffffff");
  applyAccent(accent);
}

/** Aplica a cor no app inteiro e no ícone da aba do navegador. */
export function applyAccent(hex: string | undefined) {
  accent = hex;
  const p = palette(hex || DEFAULT_ACCENT, isDark());
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(p))
    root.setProperty(`--color-brand-${k}`, v);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 72 72"><rect x="18" y="18" width="72" height="72" rx="14" fill="${p["600"]}"/><g transform="translate(29 29) scale(2.0833)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" stroke="#fff" stroke-width="2.4"/></g></svg>`;
  const href = "data:image/svg+xml," + encodeURIComponent(svg);
  document
    .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    .forEach((l) => (l.href = href));
}

/** Predefinição mais próxima (usada para o ícone do Android). */
export function nearestPreset(hex: string): PresetKey {
  const c = toRgb(isHex(hex) ? hex : DEFAULT_ACCENT);
  let best: PresetKey = "red";
  let dist = Infinity;
  for (const p of PRESETS) {
    const d = toRgb(p.hex).reduce((s, x, i) => s + (x - c[i]) ** 2, 0);
    if (d < dist) [best, dist] = [p.key, d];
  }
  return best;
}
