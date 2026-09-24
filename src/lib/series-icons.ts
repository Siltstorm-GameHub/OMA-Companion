import { isPictoId, PICTO_DEFAULT_COLOR } from "@/lib/picto-icons";
import {
  Repeat, Trophy, Swords, Gamepad2, Crown, Flame, Star, Zap, Target, Shield,
  Rocket, Medal, Dice5, Puzzle, Heart, Skull, Ghost, Sparkles, Award, Gem,
  Joystick, Dumbbell, Music, Clapperboard, Palette,
  type LucideIcon,
} from "lucide-react";

const DEFAULT_COLOR = "#2dd4bf"; // teal-400 — Fallback-Icon (Repeat)

const LEGACY_SERIES_ICONS: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: "Trophy",       label: "Pokal",       icon: Trophy,       color: "#f59e0b" },
  { value: "Swords",       label: "Schwerter",   icon: Swords,       color: "#ef4444" },
  { value: "Gamepad2",     label: "Controller",  icon: Gamepad2,     color: "#8b5cf6" },
  { value: "Joystick",     label: "Joystick",    icon: Joystick,     color: "#6366f1" },
  { value: "Crown",        label: "Krone",       icon: Crown,        color: "#eab308" },
  { value: "Medal",        label: "Medaille",    icon: Medal,        color: "#f97316" },
  { value: "Award",        label: "Auszeichnung",icon: Award,        color: "#06b6d4" },
  { value: "Flame",        label: "Flamme",      icon: Flame,        color: "#f43f5e" },
  { value: "Star",         label: "Stern",       icon: Star,         color: "#0ea5e9" },
  { value: "Sparkles",     label: "Funken",      icon: Sparkles,     color: "#d946ef" },
  { value: "Zap",          label: "Blitz",       icon: Zap,          color: "#84cc16" },
  { value: "Target",       label: "Zielscheibe", icon: Target,       color: "#10b981" },
  { value: "Shield",       label: "Schild",      icon: Shield,       color: "#3b82f6" },
  { value: "Rocket",       label: "Rakete",      icon: Rocket,       color: "#a855f7" },
  { value: "Dice5",        label: "Würfel",      icon: Dice5,        color: "#ec4899" },
  { value: "Puzzle",       label: "Puzzle",      icon: Puzzle,       color: "#22c55e" },
  { value: "Heart",        label: "Herz",        icon: Heart,        color: "#f87171" },
  { value: "Skull",        label: "Totenkopf",   icon: Skull,        color: "#94a3b8" },
  { value: "Ghost",        label: "Geist",       icon: Ghost,        color: "#a5b4fc" },
  { value: "Gem",          label: "Edelstein",   icon: Gem,          color: "#22d3ee" },
  { value: "Dumbbell",     label: "Hantel",      icon: Dumbbell,     color: "#ea580c" },
  { value: "Music",        label: "Musik",       icon: Music,        color: "#a78bfa" },
  { value: "Clapperboard", label: "Klappe",      icon: Clapperboard, color: "#fbbf24" },
  { value: "Palette",      label: "Palette",     icon: Palette,      color: "#e879f9" },
];

const SERIES_ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = Object.fromEntries(
  LEGACY_SERIES_ICONS.map(i => [i.value, { icon: i.icon, color: i.color }])
);

/*
 * Gespeichertes Format: "pi:<icon-id>:<#hex>" (Icon aus src/lib/picto-icons.ts
 * plus Farbe in einem Feld, daher keine eigene DB-Spalte). Ältere Werte wie
 * "Trophy" sind Lucide-Namen: sie werden weiter angezeigt, aber nicht mehr
 * zur Auswahl angeboten.
 */
export type SeriesIconValue =
  | { kind: "picto"; id: string; color: string }
  | { kind: "legacy"; name: string };

export function encodeSeriesIcon(id: string, color: string): string {
  return `pi:${id}:${color}`;
}

/** Zerlegt einen gespeicherten Wert; null = kein (gültiges) Icon. */
export function decodeSeriesIcon(value: string | null | undefined): SeriesIconValue | null {
  if (!value) return null;
  if (value.startsWith("pi:")) {
    const [, id, color] = value.split(":");
    if (!id || !isPictoId(id)) return null;
    return { kind: "picto", id, color: /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? color : PICTO_DEFAULT_COLOR };
  }
  return { kind: "legacy", name: value };
}

/** Liefert die Icon-Komponente für einen alten Lucide-Namen, Fallback: Repeat (Reihe wiederholt sich). */
export function resolveSeriesIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Repeat;
  return SERIES_ICON_MAP[name]?.icon ?? Repeat;
}

/** Farbe (Hex) eines gespeicherten Icon-Werts, Fallback: Teal. */
export function resolveSeriesColor(value: string | null | undefined): string {
  const d = decodeSeriesIcon(value);
  if (d?.kind === "picto") return d.color;
  if (d?.kind === "legacy") return SERIES_ICON_MAP[d.name]?.color ?? DEFAULT_COLOR;
  return DEFAULT_COLOR;
}
