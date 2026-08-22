import type { RoomCategory } from "@/lib/room-items";

/**
 * Kategorien, die "sinnvoll auf/um den Schreibtisch" stehen — genau die
 * Teilmenge der Gaming-Zimmer-Möbel, die in der Mancave-Szene als Gadgets
 * auftauchen. Tapeten/Böden/Poster/Pflanzen etc. bleiben draußen, die wirken
 * hier nur als Rauschen.
 */
export const MANCAVE_GADGET_CATEGORIES: RoomCategory[] = [
  "schreibtisch", "rechner", "bildschirm", "peripherie", "sitzen", "licht", "konsole",
];

export type MancaveHotspotSlot = "monitor" | "desk" | "shelf" | "trophy";

export interface MancaveGadget {
  key:         string;
  label:       string;
  description: string;
  imageUrl?:   string;
  accent:      "violet" | "teal" | "amber" | "rose" | "slate";
  slot:        MancaveHotspotSlot;
}

export interface MancaveBadge {
  key:  string;
  icon: string;
  name: string;
  desc: string;
}

export interface MancavePokal {
  id:        string;
  title:     string;
  isSeries:  boolean;
  awardedAt: string;
}

export interface MancaveData {
  displayName:     string;
  avatarUrl:       string | null;
  rankPoints:      number;
  totalPoints:      number;
  rankLabel:       string;
  rankColor:       string;
  rankPct:         number;
  nextRankLabel:   string | null;
  leaderboardRank: number;
  totalUsers:      number;
  memberSince:     string;
  eventCount:      number;
  eventWins:       number;
  pollMasterCount: number;
  pokaleCount:     number;
  voiceHours:      number;
  messageCount:    number;
  topGames:        string[];
  badges:          MancaveBadge[];
  pokale:          MancavePokal[];
  gadgets:         MancaveGadget[];
}

/** Ordnet ein Gaming-Zimmer-Item einem Hotspot in der Mancave-Szene zu. */
export function gadgetSlotFor(category: RoomCategory): MancaveHotspotSlot {
  if (category === "bildschirm") return "monitor";
  if (category === "sitzen" || category === "konsole") return "desk";
  return "shelf";
}
