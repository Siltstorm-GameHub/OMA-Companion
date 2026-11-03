// ============================================
// OMA Blocks — Versus-Protokoll (WebSocket, JSON)
// ============================================
// Gemeinsame Nachrichtentypen von Browser und Multiplayer-Server (src/blocks-server). Rein, ohne
// Abhängigkeiten. Der Server entscheidet über Raum-Zustand, Seed, Ziel und Lücke der Garbage sowie
// über K.o.-Reihenfolge und Sieger; die Clients simulieren ihr eigenes Feld.

import type { SpinKind } from "./engine";

/** Pfad, unter dem der Versus-WebSocket erreichbar ist (wss://<host>/blocks). */
export const BLOCKS_WS_PATH = "/blocks";
export const MAX_ROOM_PLAYERS = 8;
export const COUNTDOWN_MS = 3000;
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type RoomPhase = "lobby" | "countdown" | "playing" | "results";

export interface RoomPlayer {
  id: string;
  name: string;
  image: string | null;
  host: boolean;
  /** Spielt in der laufenden Runde mit (false = kam während der Runde dazu, schaut zu). */
  inRound: boolean;
  alive: boolean;
  /** Platz in der laufenden/letzten Runde (1 = Sieger), null solange noch im Spiel. */
  place: number | null;
  wins: number;
}

export interface RoomState {
  code: string;
  isPublic: boolean;
  phase: RoomPhase;
  players: RoomPlayer[];
  round: number;
}

export interface ClearReport {
  lines: number;
  spin: SpinKind;
  combo: number;
  b2b: boolean;
  perfectClear: boolean;
}

// ── Client → Server ──
export type ClientMessage =
  | { t: "hello"; token: string }
  | { t: "quick" }
  | { t: "create"; isPublic?: boolean }
  | { t: "join"; code: string }
  | { t: "leave" }
  | { t: "start" }
  /** Eigenes sichtbares Feld (200 Zeichen, siehe encodeVisibleBoard) + wartende Garbage. */
  | { t: "board"; b: string; g: number }
  /** Nach Verrechnung verbleibender Angriff (sent) für einen Clear. */
  | { t: "attack"; sent: number; clear: ClearReport }
  | { t: "dead" }
  | { t: "ping" };

// ── Server → Client ──
export type ServerMessage =
  | { t: "welcome"; userId: string }
  | { t: "room"; room: RoomState }
  | { t: "left" }
  | { t: "start"; seed: number; round: number; countdownMs: number; players: string[] }
  | { t: "board"; id: string; b: string; g: number }
  | { t: "garbage"; lines: number; hole: number; from: string }
  | { t: "ko"; id: string; place: number; by: string | null }
  | { t: "end"; round: number; placements: { id: string; place: number }[]; winnerId: string | null }
  | { t: "error"; message: string }
  | { t: "pong" };

export function isRoomCode(s: unknown): s is string {
  if (typeof s !== "string" || s.length !== ROOM_CODE_LENGTH) return false;
  for (const ch of s) if (!ROOM_CODE_ALPHABET.includes(ch)) return false;
  return true;
}
