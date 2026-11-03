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

/** Header-Name für signierte Server→App-Nachrichten (Signatur = hmac(secret, rawBody)). */
export const SIGNATURE_HEADER = "x-blocks-signature";

/** Rundenergebnis, das der Multiplayer-Server an die App meldet. */
export interface MatchResultPayload {
  roomCode: string;
  round: number;
  startedAt: string;
  endedAt: string;
  placements: { userId: string; place: number }[];
}
