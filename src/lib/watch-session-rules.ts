import { randomBytes } from "node:crypto";

/**
 * Regeln für "Zusammen ansehen"-Sessions (Einladung aus der Live-Steuerung) — ohne Datenbank,
 * damit testbar. Datenzugriff: lib/watch-sessions.ts.
 */

/** Host + bis zu 3 Eingeladene = höchstens 4 Streams im Raster. */
export const SESSION_MAX_MEMBERS = 4;
/** Vergessene Sessions laufen von selbst aus. */
export const SESSION_MAX_AGE_MS = 12 * 3600_000;

export type MemberStatus = "invited" | "accepted" | "declined";

export function isSessionActive(s: { endedAt: Date | null; createdAt: Date }, now: number): boolean {
  return !s.endedAt && now - s.createdAt.getTime() < SESSION_MAX_AGE_MS;
}

/** Wie viele weitere Einladungen passen noch? Abgelehnte belegen keinen Platz. */
export function freeSlots(members: { status: string }[]): number {
  return Math.max(0, SESSION_MAX_MEMBERS - members.filter(m => m.status !== "declined").length);
}

/** Kurzer, gut teilbarer Link-Teil (ohne verwechselbare Zeichen wie 0/O, 1/l). */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function makeSlug(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join("");
}

export const SESSION_TITLE_MAX = 60;
export function sanitizeSessionTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim().slice(0, SESSION_TITLE_MAX);
  return t || null;
}
