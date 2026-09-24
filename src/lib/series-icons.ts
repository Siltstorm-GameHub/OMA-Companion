import { isPictoId, PICTO_DEFAULT_COLOR } from "@/lib/picto-icons";

/*
 * Gespeichertes Format: "pi:<icon-id>:<#hex>" (Icon aus src/lib/picto-icons.ts plus Farbe in
 * einem Feld, daher keine eigene DB-Spalte).
 *
 * Ältere Reihen und Squads haben noch einen der früheren Lucide-Namen ("Trophy", "Swords", …).
 * Diese werden beim Lesen auf das passende Pictoicon in der alten Farbe abgebildet, damit sie
 * nichts verlieren. prisma/manual-sql/migrate_series_icons_to_picto.sql schreibt die Werte
 * dauerhaft um; danach ist diese Tabelle nur noch ein Sicherheitsnetz.
 */
export const LEGACY_SERIES_ICONS: Record<string, { id: string; color: string }> = {
  Trophy:       { id: "trophy-0",    color: "#f59e0b" },
  Swords:       { id: "battle",      color: "#ef4444" },
  Gamepad2:     { id: "game",        color: "#8b5cf6" },
  Joystick:     { id: "joystick",    color: "#6366f1" },
  Crown:        { id: "crown",       color: "#eab308" },
  Medal:        { id: "medal-0",     color: "#f97316" },
  Award:        { id: "award",       color: "#06b6d4" },
  Flame:        { id: "fire",        color: "#f43f5e" },
  Star:         { id: "star",        color: "#0ea5e9" },
  Sparkles:     { id: "magic",       color: "#d946ef" },
  Zap:          { id: "thunder",     color: "#84cc16" },
  Target:       { id: "target",      color: "#10b981" },
  Shield:       { id: "shield",      color: "#3b82f6" },
  Rocket:       { id: "rocket",      color: "#a855f7" },
  Dice5:        { id: "dice",        color: "#ec4899" },
  Puzzle:       { id: "puzzle",      color: "#22c55e" },
  Heart:        { id: "life",        color: "#f87171" },
  Skull:        { id: "skull",       color: "#94a3b8" },
  Ghost:        { id: "bat",         color: "#a5b4fc" },
  Gem:          { id: "gem-diamond", color: "#22d3ee" },
  Dumbbell:     { id: "training",    color: "#ea580c" },
  Music:        { id: "music",       color: "#a78bfa" },
  Clapperboard: { id: "movie",       color: "#fbbf24" },
  Palette:      { id: "flower",      color: "#e879f9" },
};

export type SeriesIconValue = { id: string; color: string };

export function encodeSeriesIcon(id: string, color: string): string {
  return `pi:${id}:${color}`;
}

/** Zerlegt einen gespeicherten Wert (auch alte Lucide-Namen); null = kein (gültiges) Icon. */
export function decodeSeriesIcon(value: string | null | undefined): SeriesIconValue | null {
  if (!value) return null;
  if (value.startsWith("pi:")) {
    const [, id, color] = value.split(":");
    if (!id || !isPictoId(id)) return null;
    return { id, color: /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? color : PICTO_DEFAULT_COLOR };
  }
  return LEGACY_SERIES_ICONS[value] ?? null;
}

/** Farbe (Hex) eines gespeicherten Icon-Werts, Fallback: Teal. */
export function resolveSeriesColor(value: string | null | undefined): string {
  return decodeSeriesIcon(value)?.color ?? PICTO_DEFAULT_COLOR;
}
