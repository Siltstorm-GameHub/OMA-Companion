import {
  Sparkles, Tv2, Swords, LayoutGrid, Table2, Trophy, Users, TrendingUp, CalendarClock, Clapperboard, Radio,
  Megaphone, Link2, Monitor, Info,
} from "@/components/icons";
import type { EditorElementOption } from "./LayoutEditor";
import type { ElementKey, ProfileElementKey } from "./types";
import type { PauseElementKey, ClipElementKey } from "./sceneLayouts";

/** Elemente des Layout-Editors — gemeinsam für Overlay-Einstellungen und Live-Steuerung. */

export const EVENT_EDITOR_OPTIONS: EditorElementOption<ElementKey>[] = [
  { key: "brand",        label: "OMA-Logo & Ich",       icon: Sparkles,   fixed: true },
  { key: "liveinfo",     label: "Live / Event / Spiel", icon: Tv2 },
  { key: "ticker",       label: "Aktuelles Match",      icon: Swords },
  { key: "bracket",      label: "Turnierbaum",          icon: LayoutGrid, hint: "nur K.-o.-Turniere" },
  { key: "table",        label: "Tabelle",              icon: Table2,     hint: "Liga, Runden, FFA" },
  { key: "seriesTable",  label: "Gesamttabelle",        icon: Trophy,     hint: "nur Eventreihen" },
  { key: "participants", label: "Teilnehmer",           icon: Users },
];

export const PROFILE_EDITOR_OPTIONS: EditorElementOption<ProfileElementKey>[] = [
  { key: "brand",       label: "OMA-Logo & Ich", icon: Sparkles, fixed: true },
  { key: "rank",        label: "Rang",           icon: TrendingUp },
  { key: "nextEvent",   label: "Nächstes Event", icon: CalendarClock, hint: "passend zu deinem Spiel zuerst" },
  { key: "community",   label: "Clips",          icon: Clapperboard,  hint: "Clip des Monats, Umfrage, Wanderpokal" },
  { key: "liveMembers", label: "Gerade live",    icon: Radio,         hint: "Raid-Tipps" },
];

export const PAUSE_EDITOR_OPTIONS: EditorElementOption<PauseElementKey>[] = [
  { key: "title",     label: "Titel",                icon: Megaphone,    hint: "Logo, Pausentext, Kanal" },
  { key: "main",      label: "Turnier / Events",     icon: LayoutGrid,   hint: "Tabelle bzw. Turnierbaum, ohne Event: nächste Events" },
  { key: "info",      label: "Live / Event / Spiel", icon: Tv2,          hint: "nur während Events" },
  { key: "match",     label: "Aktuelles Match",      icon: Swords,       hint: "nur während Events" },
  { key: "series",    label: "Gesamttabelle",        icon: Trophy,       hint: "nur Eventreihen" },
  { key: "community", label: "Clips",                icon: Clapperboard, hint: "nur ohne Event" },
  { key: "live",      label: "Gerade live",          icon: Radio,        hint: "nur ohne Event" },
  { key: "footer",    label: "Link zur App",         icon: Link2 },
];

export const CLIP_EDITOR_OPTIONS: EditorElementOption<ClipElementKey>[] = [
  { key: "title",   label: "Titel",        icon: Megaphone, hint: "Text, Countdown, Kanal" },
  { key: "player",  label: "Clip-Player",  icon: Monitor,   hint: "inkl. Logo-Karte zwischen den Clips" },
  { key: "caption", label: "Clip-Info",    icon: Info,      hint: "Titel, Kanal, Spiel" },
  { key: "footer",  label: "Link zur App", icon: Link2 },
];
