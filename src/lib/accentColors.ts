/**
 * Zentrale Akzentfarben für Dashboard-Kacheln (Glow/Border/Badge-Effekte).
 * Vorher waren dieselben rgba(...)-Werte an >15 Stellen in page.tsx dupliziert.
 */
export const ACCENT_RGB = {
  teal: "20,184,166",
  amber: "245,158,11",
  violet: "139,92,246",
  violetLight: "167,139,250",
  rose: "244,63,94",
  red: "239,68,68",
} as const;

export type AccentName = keyof typeof ACCENT_RGB;

export function acc(name: AccentName, alpha: number): string {
  return `rgba(${ACCENT_RGB[name]}, ${alpha})`;
}
