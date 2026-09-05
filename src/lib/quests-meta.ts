// TOURNAMENT und DUEL_PLAYED sind aus dem aktiven Rotationspool entfernt (Turniere laufen
// inzwischen vollständig über Events → EVENT_ATTEND; das 1v1-Münzenduell wurde durch OMA Battle
// Cards ersetzt, siehe BATTLE_CARD_DUEL), bleiben aber im Union-Typ für die History-Anzeige alter Quests.
//
// Bewusst ausgelagert aus `quests.ts`: diese Datei hat KEINE Imports (kein prisma,
// notify-dispatch, discord-rest, web-push), damit sie gefahrlos auch von Client-Components
// importiert werden kann (z.B. `ProfileQuestsAndTournaments.tsx`), ohne Node-only-Module wie
// `net`/`tls` (via https-proxy-agent) ins Browser-Bundle zu ziehen.
export type QuestType =
  | "VOICE_MINUTES" | "MESSAGES" | "EVENT_ATTEND" | "TOURNAMENT"
  | "POLL_VOTE" | "DAILY_SPIN" | "DUEL_PLAYED" | "PREDICTION_MADE"
  | "JOB_CLAIM" | "BATTLE_CARD_DUEL";

export const QUEST_TYPE_META: Record<
  QuestType,
  { label: string; unit: string; icon: string; color: string; bar: string; bg: string }
> = {
  VOICE_MINUTES: {
    label: "Sprachkanal", unit: "Minuten",     icon: "🎙️",
    color: "text-violet-300", bar: "from-violet-600 to-violet-400", bg: "from-violet-500/10",
  },
  MESSAGES: {
    label: "Nachrichten", unit: "Nachrichten", icon: "💬",
    color: "text-blue-300",   bar: "from-blue-600 to-blue-400",     bg: "from-blue-500/10",
  },
  EVENT_ATTEND: {
    label: "Events",      unit: "Events",      icon: "📅",
    color: "text-emerald-300", bar: "from-emerald-600 to-emerald-400", bg: "from-emerald-500/10",
  },
  TOURNAMENT: {
    label: "Turniere",    unit: "Turniere",    icon: "⚔️",
    color: "text-amber-300",  bar: "from-amber-600 to-amber-400",   bg: "from-amber-500/10",
  },
  POLL_VOTE: {
    label: "Umfragen",    unit: "Abstimmungen", icon: "🗳️",
    color: "text-pink-300",   bar: "from-pink-600 to-pink-400",     bg: "from-pink-500/10",
  },
  DAILY_SPIN: {
    label: "Glücksrad",   unit: "Spins",       icon: "🎰",
    color: "text-yellow-300", bar: "from-yellow-600 to-yellow-400", bg: "from-yellow-500/10",
  },
  DUEL_PLAYED: {
    label: "Münzen-Duell (alt)", unit: "Duelle", icon: "⚔️",
    color: "text-rose-300",   bar: "from-rose-600 to-rose-400",     bg: "from-rose-500/10",
  },
  PREDICTION_MADE: {
    label: "Vorhersagen", unit: "Tipps",       icon: "🎯",
    color: "text-cyan-300",   bar: "from-cyan-600 to-cyan-400",     bg: "from-cyan-500/10",
  },
  JOB_CLAIM: {
    label: "Idle-Job",    unit: "Abholungen",  icon: "💼",
    color: "text-violet-300", bar: "from-violet-600 to-violet-400", bg: "from-violet-500/10",
  },
  BATTLE_CARD_DUEL: {
    label: "Battle Cards", unit: "Duelle",     icon: "🃏",
    color: "text-red-300",    bar: "from-red-600 to-red-400",       bg: "from-red-500/10",
  },
};
