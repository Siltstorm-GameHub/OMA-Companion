// ============================================
// OMA Blocks — signierte Tokens zwischen App und Multiplayer-Server
// ============================================
// Die App (Vercel) stellt eingeloggten Nutzern ein kurzlebiges Token aus (/api/blocks/mp-token), mit
// dem sie sich beim Multiplayer-Server (src/blocks-server, läuft im Bot-Prozess auf Render) anmelden — dort gibt es kein
// eigenes Login. Umgekehrt signiert der Server seine Rundenergebnisse, bevor er sie an
// /api/blocks/match-result schickt. Beide Seiten teilen sich dafür BLOCKS_MP_SECRET.
//
// Nur node:crypto — läuft in Next-Route-Handlern (Node-Runtime) und im Bot-Prozess auf Render (tsx).

import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_TTL_SECONDS = 10 * 60;

export interface MpTokenPayload {
  uid: string;
  name: string;
  img: string | null;
  /** Ablauf (Unix-Sekunden). */
  exp: number;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function hmac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function signMpToken(secret: string, payload: Omit<MpTokenPayload, "exp">, now = Date.now()): string {
  const full: MpTokenPayload = { ...payload, exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS };
  const body = b64url(JSON.stringify(full));
  return `${body}.${hmac(secret, body)}`;
}

export function verifyMpToken(secret: string, token: unknown, now = Date.now()): MpTokenPayload | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(secret, body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MpTokenPayload;
    if (typeof p.uid !== "string" || typeof p.name !== "string" || typeof p.exp !== "number") return null;
    if (p.exp * 1000 < now) return null;
    return { uid: p.uid, name: p.name.slice(0, 64), img: typeof p.img === "string" ? p.img : null, exp: p.exp };
  } catch {
    return null;
  }
}

// ── Turnier-Tickets ──
// Für Live-Turniere (lib/blocks/tournament.ts) stellt die App zusätzlich ein Ticket aus: Welche Gruppe,
// wie viele Runden, wer gehört dazu. Der Server baut daraus den Turnier-Raum — ohne eigene Datenbank.
// Eigener Signatur-Präfix, damit ein Anmelde-Token nie als Ticket durchgeht (und umgekehrt).

export type TournamentStage = "group" | "final";

export interface TournamentTicket {
  uid: string;
  /** Event-ID */
  ev: string;
  st: TournamentStage;
  /** Gruppe (0-basiert, Finale = 0) */
  g: number;
  /** Runden dieser Phase insgesamt */
  n: number;
  /** Bereits gewertete Runden (nach einem Server-Neustart geht es dort weiter) */
  done: number;
  /** Spieler-IDs der Gruppe bzw. des Finales */
  roster: string[];
  exp: number;
}

const TICKET_PREFIX = "ticket.";

export function signTicket(secret: string, payload: Omit<TournamentTicket, "exp">, now = Date.now()): string {
  const full: TournamentTicket = { ...payload, exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS };
  const body = b64url(JSON.stringify(full));
  return `${body}.${hmac(secret, TICKET_PREFIX + body)}`;
}

export function verifyTicket(secret: string, token: unknown, now = Date.now()): TournamentTicket | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(secret, TICKET_PREFIX + body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TournamentTicket;
    if (typeof p.uid !== "string" || typeof p.ev !== "string" || typeof p.exp !== "number") return null;
    if (p.st !== "group" && p.st !== "final") return null;
    if (!Array.isArray(p.roster) || !p.roster.every((r) => typeof r === "string") || p.roster.length > 8) return null;
    if (!Number.isInteger(p.g) || !Number.isInteger(p.n) || !Number.isInteger(p.done) || p.n < 1 || p.n > 20) return null;
    if (p.exp * 1000 < now) return null;
    return p;
  } catch {
    return null;
  }
}

/** Header-Name für signierte Server→App-Nachrichten (Signatur = hmac(secret, rawBody)). */
export const SIGNATURE_HEADER = "x-blocks-signature";

/** Rundenergebnis, das der Multiplayer-Server an die App meldet. */
export interface MatchResultPayload {
  roomCode: string;
  round: number;
  startedAt: string;
  endedAt: string;
  placements: { userId: string; place: number }[];
  /** Nur bei Turnier-Runden. */
  tournament?: { ev: string; st: TournamentStage; g: number };
}
