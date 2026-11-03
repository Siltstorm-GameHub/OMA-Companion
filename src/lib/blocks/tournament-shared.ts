// ============================================
// OMA Blocks — Live-Turnier: Typen und Regeln ohne Datenbank-Abhängigkeit
// ============================================
// Getrennt von tournament.ts, damit Client-Komponenten (TournamentStandings, Versus-Client) die Regeln
// importieren können, ohne Prisma in den Browser-Bundle zu ziehen.

import { MAX_ROOM_PLAYERS } from "./protocol";

/** Punkte je Platz in einer Runde (Platz 6+ = 1 Punkt). */
export const PLACE_POINTS = [10, 7, 5, 3, 2, 1, 1, 1];
export const pointsForPlace = (place: number) => PLACE_POINTS[place - 1] ?? 1;

export const ROUND_LIMITS = { min: 1, max: 10 };
export const ADVANCE_LIMITS = { min: 1, max: 4 };

export type TournamentPhase = "pending" | "groups" | "final" | "done";

export function groupLabel(no: number): string {
  return `Gruppe ${String.fromCharCode(65 + no)}`;
}

export interface StandingRow {
  userId: string;
  name: string;
  image: string | null;
  points: number;
  wins: number;
  rounds: number;
  avgPlace: number | null;
}

export interface StageView {
  label: string;
  rounds: number;
  roundsPlayed: number;
  rows: StandingRow[];
}

export interface TournamentState {
  eventId: string;
  title: string;
  startAt: string;
  phase: TournamentPhase;
  groupRounds: number;
  finalRounds: number;
  advancePerGroup: number;
  checkInEnabled: boolean;
  /** Spieler, die beim Start ausgelost würden (angemeldet bzw. eingecheckt) */
  eligibleCount: number;
  groups: StageView[];
  final: StageView | null;
  /** Endrangliste (nur phase "done") */
  ranking: StandingRow[];
  me: {
    eligible: boolean;
    group: number | null;
    finalist: boolean;
    /** Darf gerade einen Turnier-Raum betreten */
    canPlay: boolean;
  };
}

/** Wie viele pro Gruppe ins Finale kommen — so, dass das Finale in einen Raum (max. 8) passt. */
export function advanceCount(groups: number, advancePerGroup: number): number {
  return Math.max(1, Math.min(advancePerGroup, Math.floor(MAX_ROOM_PLAYERS / Math.max(1, groups))));
}
