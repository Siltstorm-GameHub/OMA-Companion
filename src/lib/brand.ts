/** Zentrale Marken-Konstanten.
 *
 *  Diese Werte lagen vorher mehrfach als Literale im Code — im Hex-Grid
 *  (AnimatedBackground), im Default-Event-Cover (EventCoverDefault) und in
 *  dessen Server-Zwilling (lib/default-cover). Wer die Marke anfasst, sollte
 *  genau eine Datei anfassen müssen.
 *
 *  Bewusst reine Hex-/Zahlwerte, keine CSS-Variablen: Satori (next/og) rendert
 *  die OG-Bilder ausserhalb des Browsers und kann `var(--x)` nicht auflösen.
 */

export const BRAND = {
  /** Primärfarbe des Logos */
  teal:      "#14b8a6",
  tealLight: "#2dd4bf",
  tealDark:  "#0f766e",
  /** Sekundärfarbe des Logos */
  red:       "#8b2020",
  redLight:  "#991b1b",

  /** Hintergründe — dunkel ist der Default (html[data-theme="dark"]) */
  bgBase:     "#0d0d0f",
  bgSurface:  "#13131a",
  bgElevated: "#1a1a24",

  /** Verlauf der Cover-Flächen (Event-Cover, OG-Karten) */
  coverFrom: "#06080f",
  coverTo:   "#0c0a16",

  text:      "#ffffff",
  textDim:   "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.22)",
} as const;

/** Anzeigename der App — erscheint auf OG-Karten und im Default-Cover */
export const BRAND_NAME = "Old Masters Ally";
export const BRAND_NAME_SHORT = "OMA";
export const BRAND_TAGLINE = "Companion App";

/** Logo für die UI. Bewusst die 256er-Ableitung (~28 KB) statt des Originals
 *  public/OMALogoNew.png (2048×2048, 2,24 MB): grösser als 64 px wird das Logo
 *  nirgends dargestellt, 256 deckt also auch 4x-Retina ab. Alle Ableitungen
 *  erzeugt scripts/generate-brand-assets.ts aus dem Original. */
export const BRAND_LOGO = "/brand/logo-256.png";

/** Seitenverhältnis der Event-Cover und OG-Karten (Open-Graph-Standard). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Basis-URL der App für absolute Metadata-URLs.
 *  Vercel setzt VERCEL_PROJECT_PRODUCTION_URL automatisch; lokal fällt es auf
 *  localhost zurück, damit `next dev` keine Warnung wirft. */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
