// ============================================
// OMA Gems — Zeichnungen für Helden-Teile (Phase 10e)
// ============================================
// Ein Zeichner liefert Teile als SVG-Dateien nach art/helden/ (Benennung und Gerüst siehe
// docs/gems-helden-geruest.md). `npx tsx scripts/import-hero-art.ts` prüft sie und schreibt sie nach
// art.generated.ts. Gibt es für ein Teil eine Zeichnung, nimmt parts.tsx bzw. HeroBackdrop.tsx sie
// statt der eingebauten Vektorgrafik — jedes Teil einzeln, ohne weitere Code-Änderung.
//
// Farbslots bleiben als Platzhalter („$main“ usw.) in den Daten und werden beim Zeichnen durch die
// Palette des Looks ersetzt; so färbt Kosmetik auch gezeichnete Teile um. Rein, ohne DOM.

import { HERO_ART } from "./art.generated";
import {
  HERO_ACCESSORIES,
  HERO_BACKDROPS,
  HERO_BASES,
  HERO_EMBLEMS,
  HERO_FACES,
  HERO_HAIRS,
  HERO_HEADGEAR,
} from "./look";

/** Ein SVG-Element: Tag, Attribute (React-Schreibweise, z. B. strokeWidth), Kinder. */
export type ArtNode = [tag: string, attrs: Record<string, string | number>, children: ArtNode[]];

export const COLOR_SLOTS = ["main", "dark", "light", "metal", "skin", "skinShade", "hair", "hairShade"] as const;
export type ColorSlot = (typeof COLOR_SLOTS)[number];

/** Platzhalterfarben für Zeichenprogramme ohne CSS-Variablen (alternativ fill="var(--main)"). */
export const PLACEHOLDER_COLORS: Record<string, ColorSlot> = {
  "#ff00ff": "main",
  "#800080": "dark",
  "#ff80ff": "light",
  "#00ffff": "metal",
  "#ffff00": "skin",
  "#808000": "skinShade",
  "#00ff00": "hair",
  "#008000": "hairShade",
};

/** Zeichenflächen: Figur-Teile auf dem Gerüst, Waffen und Embleme um ihren Ursprung, Hintergründe 3:4. */
export const ART_VIEWBOX = {
  figur: "0 0 220 240",
  waffe: "-60 -110 120 180",
  emblem: "-20 -20 40 40",
  hintergrund: "0 0 300 400",
} as const;

export interface ArtSlot {
  key: string;
  /** Wofür das Teil steht (für Prüfbogen und Import-Meldungen). */
  label: string;
  viewBox: keyof typeof ART_VIEWBOX;
}

const ids = (list: { id: string }[], skip: string[] = []) => list.map((o) => o.id).filter((id) => !skip.includes(id));

/** Alle Teile, die eine Zeichnung ersetzen kann — Dateiname ist `<key>.svg`. */
export const ART_SLOTS: ArtSlot[] = [
  ...["breit", "schlank", "robe"].map((b) => ({ key: `koerper-${b}`, label: `Körper ${b}`, viewBox: "figur" as const })),
  ...["breit", "schlank"].map((b) => ({ key: `beine-${b}`, label: `Beine ${b}`, viewBox: "figur" as const })),
  { key: "polster-breit", label: "Schulterpolster (breit)", viewBox: "figur" },
  { key: "kopf", label: "Kopf mit Schattenstufe", viewBox: "figur" },
  ...ids(HERO_FACES).map((id) => ({ key: `gesicht-${id}`, label: `Gesicht ${id}`, viewBox: "figur" as const })),
  ...ids(HERO_HAIRS, ["glatze"]).map((id) => ({ key: `frisur-${id}-vorn`, label: `Frisur ${id} vorn`, viewBox: "figur" as const })),
  ...["lang", "zopf"].map((id) => ({ key: `frisur-${id}-hinten`, label: `Frisur ${id} hinten`, viewBox: "figur" as const })),
  ...ids(HERO_HEADGEAR, ["keine"]).map((id) => ({ key: `kopfbedeckung-${id}-vorn`, label: `Kopfbedeckung ${id} vorn`, viewBox: "figur" as const })),
  { key: "kopfbedeckung-kapuze-hinten", label: "Kopfbedeckung kapuze hinten", viewBox: "figur" },
  ...ids(HERO_ACCESSORIES, ["keins", "umhang"]).map((id) => ({ key: `accessoire-${id}`, label: `Accessoire ${id}`, viewBox: "figur" as const })),
  { key: "accessoire-umhang-hinten", label: "Accessoire umhang hinten", viewBox: "figur" },
  ...ids(HERO_BASES).map((id) => ({ key: `waffe-${id}`, label: `Waffe ${id}`, viewBox: "waffe" as const })),
  ...ids(HERO_EMBLEMS).map((id) => ({ key: `emblem-${id}`, label: `Emblem ${id}`, viewBox: "emblem" as const })),
  ...ids(HERO_BACKDROPS).map((id) => ({ key: `hintergrund-${id}`, label: `Hintergrund ${id}`, viewBox: "hintergrund" as const })),
];

/** Gelieferte Zeichnung für ein Teil, sonst undefined (dann zeichnet der Code das Teil). */
export function heroArt(key: string): ArtNode[] | undefined {
  return (HERO_ART as Record<string, ArtNode[]>)[key];
}

export function deliveredArtKeys(): string[] {
  return Object.keys(HERO_ART);
}
