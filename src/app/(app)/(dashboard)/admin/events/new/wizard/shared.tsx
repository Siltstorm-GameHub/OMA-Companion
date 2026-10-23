// Typen und Konstanten des Event-Wizards (aufgeteilt aus EventSetupWizard.tsx)
import { EventCategory, EventGenre } from "@prisma/client";
import { TOURNAMENT_FORMATS } from "@/lib/tournament-formats";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeriesOption = {
  id: string;
  name: string;
  category: EventCategory | null;
  genre: EventGenre | null;
  placementRewardsJson: string | null;
  fixedFormat?: string | null;
  _count: { events: number };
};

export type SquadOption = { id: string; name: string };

export type PollConfig = {
  label: string;
  question: string;
  voterEligibility: "all" | "participants" | "players" | "spectators";
  answerType: "players" | "spectators" | "custom";
  customAnswers: string[];
  startOffsetHours: number;
  endOffsetHours: number;
  participationCoins: number;
  participationSeriesPoints: number;
  winnerCoins: number;
  winnerRankPoints: number;
};

export type PlacementReward = { place: number; coins: number; rankPoints: number };
export type StatRow = { field: string; pointsPer: number; isWinnerStat?: boolean; isMatchWinStat?: boolean };

// Vorausgefüllte Werte, wenn eine neue Saison im Anschluss an den Abschluss einer alten Reihe angelegt wird
export type SeasonPrefill = {
  oldSeriesId: string;
  oldSeriesName: string;
  groupId: string;
  seasonNumber: number;
  name: string;
  description: string;
  category: EventCategory;
  eventType: "community" | "tournament";
  fixedGenre: EventGenre | null;
  platforms: string[];
  variousGames: boolean;
  fixedGame: string;
  seriesFormat: string;
  seriesDiscordId: string;
  recurrenceType: "none" | RecurrenceType;
  recurrenceMonthlyMode: MonthlyMode;
  seriesHidden: boolean;
  seriesRegistrationLocked: boolean;
  seriesSquadId: string;
  spectatorMode: boolean;
  spectatorCoins: number;
  spectatorRankPts: number;
  statParticipationPts: number;
  statSpectatorParticipationPts: number;
  statPtsToGlobalRanking: boolean;
  statRows: StatRow[];
  eventStatFields: string[];
  winnerStatField: string;
  participationCoins: number;
  participationRankPts: number;
  placements: PlacementReward[];
  polls: PollConfig[];
  dominion: {
    enabled: boolean;
    triggerStats: string[];
    threshold: number;
    coins: number;
    seriesPoints: number;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const STEP_LABELS_EVENT  = ["Typ & Kategorie", "Grunddaten", "Turnier", "Belohnungen", "Zusammenfassung"];
export const STEP_LABELS_SERIES = ["Typ & Kategorie", "Reihen-Info", "Termine", "Reihen-Belohnungen", "Event-Einstellungen", "Zusammenfassung"];

export const CATEGORIES: { value: EventCategory; label: string; emoji: string; color: string; border: string; bg: string }[] = [
  { value: "competitive",     label: "Kompetitiv", emoji: "🏆", color: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/10" },
  { value: "fun",             label: "Fun",        emoji: "🎉", color: "text-amber-400",  border: "border-amber-400/40",  bg: "bg-amber-500/10" },
  { value: "casual",          label: "Casual",     emoji: "🛋️", color: "text-emerald-400",border: "border-emerald-500/40",bg: "bg-emerald-500/10" },
  { value: "training",        label: "Training",   emoji: "🎓", color: "text-indigo-400", border: "border-indigo-500/40", bg: "bg-indigo-500/10" },
  { value: "community_event", label: "Community",  emoji: "🤝", color: "text-violet-400", border: "border-violet-500/40", bg: "bg-violet-500/10" },
  { value: "special",         label: "Special",    emoji: "⭐", color: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-500/10" },
];

export const PLATFORMS: { value: string; label: string; icon: string }[] = [
  { value: "PC",     label: "PC",     icon: "🖥️" },
  { value: "Xbox",   label: "Xbox",   icon: "🟢" },
  { value: "PS",     label: "PS",     icon: "🔵" },
  { value: "Mobile", label: "Mobile", icon: "📱" },
];

// Punkt 3: Wertebereich/Label/Beschreibung kommen zentral aus @/lib/tournament-formats (siehe dort) —
// nur das wizard-eigene "hasStat"-Flag (zeigt den Stat-Felder-Editor im Turnier-Schritt) bleibt lokal.
export const FORMATS: { value: string; label: string; desc: string; hasStat: boolean }[] = TOURNAMENT_FORMATS.map(f => ({
  ...f,
  hasStat: f.value === "coop_stats" || f.value === "avg_stats",
}));

export const RECURRENCE_OPTS: { value: string; label: string; desc: string }[] = [
  { value: "none",      label: "Keine",          desc: "Manuell Termine hinzufügen" },
  { value: "weekly",    label: "Wöchentlich",    desc: "Jeden Woche am selben Wochentag" },
  { value: "biweekly",  label: "Zweiwöchentlich",desc: "Alle zwei Wochen" },
  { value: "monthly",   label: "Monatlich",      desc: "Einmal pro Monat" },
];

export const inputCls   = "w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none";
export const inputStyle = { background: "#0b1a17", border: "1px solid rgba(20,184,166,0.18)" };
export const labelCls   = "text-xs text-gray-500 mb-1 block";

// Vorlage aus einem bestehenden Event ("Event duplizieren", siehe new/page.tsx) — Datum/Uhrzeit
// werden bewusst NICHT übernommen, sondern als Vorschlag eine Woche später vorbelegt.
export type EventTemplate = {
  sourceTitle: string;
  title: string;
  category: EventCategory;
  eventType: "community" | "tournament";
  startAt: string;            // datetime-local (Berlin)
  endAt: string;              // datetime-local (Berlin) oder ""
  game: string;
  genre: EventGenre | null;
  maxPlayers: string;
  description: string;
  discordChannelId: string;
  seriesId: string | null;
  registrationLocked: boolean;
  squadId: string;
  spectatorMode: boolean;
  spectatorCoins: number;
  spectatorRankPts: number;
  participationCoins: number;
  participationRankPts: number;
  placements: PlacementReward[];
  polls: PollConfig[];
  format: string;
  playHomeAway: boolean;
  matchResultPoints: { win: number; draw: number } | null;
  statFields: string[];
  statPointsByField: Record<string, number>;
  checkInEnabled: boolean;
  checkInMinutes: number;
};
