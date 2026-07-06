import {
  Repeat, Trophy, Swords, Gamepad2, Crown, Flame, Star, Zap, Target, Shield,
  Rocket, Medal, Dice5, Puzzle, Heart, Skull, Ghost, Sparkles, Award, Gem,
  Joystick, Dumbbell, Music, Clapperboard, Palette,
  type LucideIcon,
} from "lucide-react";

export const SERIES_ICONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "Trophy",       label: "Pokal",       icon: Trophy },
  { value: "Swords",       label: "Schwerter",   icon: Swords },
  { value: "Gamepad2",     label: "Controller",  icon: Gamepad2 },
  { value: "Joystick",     label: "Joystick",    icon: Joystick },
  { value: "Crown",        label: "Krone",       icon: Crown },
  { value: "Medal",        label: "Medaille",    icon: Medal },
  { value: "Award",        label: "Auszeichnung",icon: Award },
  { value: "Flame",        label: "Flamme",      icon: Flame },
  { value: "Star",         label: "Stern",       icon: Star },
  { value: "Sparkles",     label: "Funken",      icon: Sparkles },
  { value: "Zap",          label: "Blitz",       icon: Zap },
  { value: "Target",       label: "Zielscheibe", icon: Target },
  { value: "Shield",       label: "Schild",      icon: Shield },
  { value: "Rocket",       label: "Rakete",      icon: Rocket },
  { value: "Dice5",        label: "Würfel",      icon: Dice5 },
  { value: "Puzzle",       label: "Puzzle",      icon: Puzzle },
  { value: "Heart",        label: "Herz",        icon: Heart },
  { value: "Skull",        label: "Totenkopf",   icon: Skull },
  { value: "Ghost",        label: "Geist",       icon: Ghost },
  { value: "Gem",          label: "Edelstein",   icon: Gem },
  { value: "Dumbbell",     label: "Hantel",      icon: Dumbbell },
  { value: "Music",        label: "Musik",       icon: Music },
  { value: "Clapperboard", label: "Klappe",      icon: Clapperboard },
  { value: "Palette",      label: "Palette",     icon: Palette },
];

const SERIES_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  SERIES_ICONS.map(i => [i.value, i.icon])
);

/** Liefert die Icon-Komponente für einen gespeicherten Icon-Namen, Fallback: Repeat (Reihe wiederholt sich). */
export function resolveSeriesIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Repeat;
  return SERIES_ICON_MAP[name] ?? Repeat;
}
