// ============================================
// OMA Quest — Ziel-Arten von Quests (rein): Anzeige (Symbol, Kurzname) für Log und Editor
// ============================================
// Eine Ziel-Art ist nur ein String (objectiveType), damit neue welche dazukommen können, ohne die Datenbank zu ändern. Diese Datei ist
// die eine Stelle, die jeder Art ein Symbol und einen Namen gibt — für die Gruppierung im Quest-Log und die Auswahl im Location-Editor.

export type QuestObjectiveType =
  | "WORLD_STEP" | "MONSTER_SLAIN" | "TIER_SLAIN" | "COMPANION_TAMED" | "TRAVEL_DISTANCE" | "ITEM_COLLECTED" | "LOCATION_DISCOVERED"
  | "MESSAGE_SENT" | "VOICE_MINUTES" | "EVENT_ATTEND" | "POLL_VOTE" | "BATTLE_CARD_DUEL" | "STORY_NODE_COMPLETED" | "LOCATION_VISITED";

export interface ObjectiveMeta { icon: string; label: string; /** Gruppe im Quest-Log */ group: "welt" | "kampf" | "erkundung" | "gemeinschaft" }

export const OBJECTIVE_META: Record<QuestObjectiveType, ObjectiveMeta> = {
  WORLD_STEP: { icon: "💬", label: "Gespräch/Ort", group: "welt" },
  MONSTER_SLAIN: { icon: "⚔️", label: "Monster besiegen", group: "kampf" },
  TIER_SLAIN: { icon: "💀", label: "Elite/Boss besiegen", group: "kampf" },
  COMPANION_TAMED: { icon: "🐾", label: "Begleiter zähmen", group: "kampf" },
  TRAVEL_DISTANCE: { icon: "🥾", label: "Reisen", group: "erkundung" },
  ITEM_COLLECTED: { icon: "📦", label: "Gegenstände sammeln", group: "erkundung" },
  LOCATION_DISCOVERED: { icon: "🚩", label: "Location entdecken", group: "erkundung" },
  MESSAGE_SENT: { icon: "🗨️", label: "Nachrichten", group: "gemeinschaft" },
  VOICE_MINUTES: { icon: "🎙️", label: "Sprachchat", group: "gemeinschaft" },
  EVENT_ATTEND: { icon: "📅", label: "Event", group: "gemeinschaft" },
  POLL_VOTE: { icon: "🗳️", label: "Umfrage", group: "gemeinschaft" },
  BATTLE_CARD_DUEL: { icon: "🃏", label: "Duell", group: "gemeinschaft" },
  STORY_NODE_COMPLETED: { icon: "📖", label: "Story-Ereignis", group: "erkundung" },
  LOCATION_VISITED: { icon: "🚩", label: "Location besuchen", group: "erkundung" },
};

export const GROUP_LABEL: Record<ObjectiveMeta["group"], string> = { welt: "Welt-Quests", kampf: "Kampf", erkundung: "Erkundung", gemeinschaft: "Gemeinschaft" };
export const GROUP_ORDER: ObjectiveMeta["group"][] = ["welt", "kampf", "erkundung", "gemeinschaft"];

export const isObjectiveType = (v: unknown): v is QuestObjectiveType => typeof v === "string" && v in OBJECTIVE_META;
export const metaOf = (t: string): ObjectiveMeta => OBJECTIVE_META[t as QuestObjectiveType] ?? { icon: "📜", label: t, group: "welt" };

/** Ziel-Arten, die ein Ort-Ersteller im Editor als "Ziel"-Schritt einer Quest nutzen kann (siehe QuestEditor). */
export const GOAL_STEP_TYPES: { type: "MONSTER_SLAIN" | "COMPANION_TAMED"; label: string }[] = [
  { type: "MONSTER_SLAIN", label: "Monster besiegen" },
  { type: "COMPANION_TAMED", label: "Begleiter zähmen" },
];
