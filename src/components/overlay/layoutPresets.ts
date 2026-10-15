/**
 * Fertige Layout-Vorlagen für Einsteiger — ein Klick setzt Turnier- und Normal-Ansicht. Positionen
 * in px (1920×1080) notiert und auf das 40px-Raster bzw. den Randabstand von 28px gelegt, damit
 * sie im Editor sauber einrasten. Gespeichert wird wie immer in Prozent.
 */
import { defaultStreamerEventLayout, defaultProfileLayout } from "./layout";
import { DEFAULT_ROTATE_SECONDS, type ElementKey, type ProfileElementKey, type OverlayLayout, type LayoutEntry } from "./types";

export type LayoutPreset = {
  key: string;
  label: string;
  hint: string;
  event: OverlayLayout<ElementKey>;
  profile: OverlayLayout<ProfileElementKey>;
};

const at = (x: number, y: number, scale?: number): LayoutEntry => ({
  x: Math.round((x / 1920) * 10000) / 100,
  y: Math.round((y / 1080) * 10000) / 100,
  ...(scale ? { scale } : {}),
});
const layout = <K extends string>(elements: Partial<Record<K, LayoutEntry>>): OverlayLayout<K> => ({ elements, rotateSeconds: DEFAULT_ROTATE_SECONDS });

// Spalten/Zeilen der einheitlichen Kacheln (460 breit; Leiste 90, Karte 200, Panel 340 hoch).
const LEFT = 28, RIGHT = 1920 - 28 - 460, BOTTOM_BAR = 1080 - 28 - 90;

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    key: "standard", label: "Standard", hint: "Infos unten, Tabellen oben rechts",
    event: defaultStreamerEventLayout(),
    profile: defaultProfileLayout(),
  },
  {
    key: "minimal", label: "Minimal", hint: "Nur Logo und das Nötigste",
    event: layout<ElementKey>({ brand: at(LEFT, BOTTOM_BAR), liveinfo: at(LEFT + 476, BOTTOM_BAR) }),
    profile: layout<ProfileElementKey>({ brand: at(LEFT, BOTTOM_BAR) }),
  },
  {
    key: "tournament", label: "Turnier groß", hint: "Tabelle & Turnierbaum extra groß",
    event: layout<ElementKey>({
      brand: at(LEFT, BOTTOM_BAR), liveinfo: at(LEFT + 476, BOTTOM_BAR), ticker: at(LEFT + 952, BOTTOM_BAR),
      // XL (1.3) → 598px breit: rechtsbündig mit Randabstand
      bracket: at(1920 - 28 - 598, 28, 1.3), table: at(1920 - 28 - 598, 28, 1.3),
      seriesTable: at(1920 - 28 - 598, 28, 1.3), participants: at(1920 - 28 - 598, 28, 1.3),
    }),
    profile: layout<ProfileElementKey>({
      brand: at(LEFT, BOTTOM_BAR), rank: at(1920 - 28 - 529, 28, 1.15), nextEvent: at(1920 - 28 - 529, 28, 1.15),
      community: at(LEFT, BOTTOM_BAR - 16 - 200), liveMembers: at(LEFT, BOTTOM_BAR - 16 - 200),
    }),
  },
  {
    key: "column", label: "Rechte Spalte", hint: "Alles untereinander am rechten Rand",
    event: layout<ElementKey>({
      brand: at(RIGHT, 28), liveinfo: at(RIGHT, 134), ticker: at(RIGHT, 240),
      bracket: at(RIGHT, 346), table: at(RIGHT, 346), seriesTable: at(RIGHT, 346), participants: at(RIGHT, 346),
    }),
    profile: layout<ProfileElementKey>({
      brand: at(RIGHT, 28), rank: at(RIGHT, 134), nextEvent: at(RIGHT, 134),
      community: at(RIGHT, 350), liveMembers: at(RIGHT, 350),
    }),
  },
];

/** Welche Vorlage entspricht genau dem aktuellen Layout? (für die Markierung "aktiv") */
export function matchingPreset(event: OverlayLayout<ElementKey>, profile: OverlayLayout<ProfileElementKey>): string | null {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return LAYOUT_PRESETS.find(p => same(p.event.elements, event.elements) && same(p.profile.elements, profile.elements))?.key ?? null;
}
