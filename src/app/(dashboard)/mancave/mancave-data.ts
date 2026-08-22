import type { RoomCategory } from "@/lib/room-items";

/**
 * Kategorien, die "sinnvoll auf/um den Schreibtisch" stehen — genau die
 * Teilmenge der Gaming-Zimmer-Möbel, die in der Mancave-Szene als Gadgets
 * auftauchen. Tapeten/Böden/Poster/Pflanzen/Vitrine etc. bleiben draußen.
 * "schreibtisch" bewusst NICHT dabei — der Tisch ist die Bühne selbst, wird
 * separat aus `roomItemKeys` herausgesucht (siehe MancaveScene3D.tsx).
 * "sitzen" (Stuhl) bewusst NICHT dabei — die Ego-Perspektive sitzt der User
 * SELBST auf dem Stuhl, der taucht im eigenen Blickfeld nicht auf.
 */
export const MANCAVE_GADGET_CATEGORIES: RoomCategory[] = [
  "rechner", "bildschirm", "peripherie", "licht", "konsole",
];

export type MancaveRenderZone = "monitor" | "other";

export function renderZoneFor(category: RoomCategory): MancaveRenderZone {
  return category === "bildschirm" ? "monitor" : "other";
}

export interface MancaveGadget {
  key:         string;
  label:       string;
  description: string;
  imageUrl?:   string;
  accent:      "violet" | "teal" | "amber" | "rose" | "slate";
  category:    RoomCategory;
  zone:        MancaveRenderZone;
  price:       number;
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

/** Ausbau-Stand eines Mancave-Slots (siehe mancave-items.ts, mancave-economy.ts). */
export interface MancaveItemStatus {
  key:      string;
  label:    string;
  baseline: boolean;
  tier:     number;
  maxTier:  number;
  /** Münzen für den nächsten Stufenschritt, null = Höchststufe erreicht. */
  nextCost: number | null;
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
  /**
   * Alle aufgestellten Gaming-Zimmer-Item-Keys (ungefiltert) — Restbestand aus
   * der Zeit vor dem neuen Ausbausystem, aktuell nur noch für's Gadgets-Panel
   * (Foto-Liste der besessenen Peripherie) relevant, siehe `gadgets` oben.
   */
  roomItemKeys: string[];
  /** Ausbau-Stand aller Mancave-Slots — neues, vom Gaming-Zimmer unabhängiges System. */
  items:        MancaveItemStatus[];
  /** Boden/Wand/Fenster-Stufe, aus dem Durchschnitt aller `items`-Stufen berechnet. */
  surfaceTier:  number;
}
