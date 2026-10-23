import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Twitch-Login für Zuschauer von "Zusammen ansehen" — unabhängig vom OMA-Login (Zuschauer brauchen
 * kein OMA-Konto). Das Twitch-Token liegt NICHT in unserer Datenbank, sondern verschlüsselt
 * (AES-256-GCM, Schlüssel aus AUTH_SECRET abgeleitet) in einem httpOnly-Cookie des Zuschauers.
 * Berechtigung: nur `user:write:chat` — Nachrichten im eigenen Namen schreiben, sonst nichts.
 */

export const VIEWER_COOKIE = "oma_twitch_viewer";
export const VIEWER_STATE_COOKIE = "oma_twitch_state";
export const VIEWER_SCOPES = ["user:write:chat"];
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage; das Twitch-Token wird bei Bedarf erneuert

const CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? "";

export type ViewerSession = {
  userId: string;
  login: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  /** ms seit Epoch */
  expiresAt: number;
};

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET fehlt");
  return createHash("sha256").update(`${secret}:twitch-viewer`).digest();
}

export function sealSession(s: ViewerSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(s), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64url")).join(".");
}

export function unsealSession(value: string | undefined): ViewerSession | null {
  if (!value) return null;
  try {
    const [iv, tag, data] = value.split(".").map(p => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const s = JSON.parse(json) as ViewerSession;
    return s.userId && s.accessToken ? s : null;
  } catch {
    return null; // manipuliert, alter Schlüssel o.ä. → wie abgemeldet
  }
}

export function setSessionCookie(res: NextResponse, s: ViewerSession) {
  res.cookies.set(VIEWER_COOKIE, sealSession(s), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(VIEWER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function readSession(req: NextRequest): ViewerSession | null {
  return unsealSession(req.cookies.get(VIEWER_COOKIE)?.value);
}

/** Muss in der Twitch Developer Console als OAuth-Redirect eingetragen sein. */
export function redirectUri(req: NextRequest): string {
  return `${req.nextUrl.origin}/api/twitch/viewer/callback`;
}

/** Nur relative Pfade innerhalb der App als Rücksprungziel (kein Open Redirect). */
export function safeReturnTo(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/zusammen";
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
    cache: "no-store",
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as TokenResponse) : null;
}

/** OAuth-Code gegen Token tauschen und den Twitch-Nutzer dazu laden. */
export async function sessionFromCode(code: string, redirect: string): Promise<ViewerSession | null> {
  const token = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirect });
  if (!token) return null;
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: { "Client-Id": CLIENT_ID, Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  }).catch(() => null);
  const user = res?.ok ? ((await res.json()) as { data: { id: string; login: string; display_name: string }[] }).data[0] : null;
  if (!user) return null;
  return {
    userId: user.id, login: user.login, displayName: user.display_name,
    accessToken: token.access_token, refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
}

/** Abgelaufenes Token erneuern (null = Login ungültig, z.B. Zugriff bei Twitch widerrufen). */
export async function refreshSession(s: ViewerSession): Promise<ViewerSession | null> {
  const token = await tokenRequest({ grant_type: "refresh_token", refresh_token: s.refreshToken });
  if (!token) return null;
  return { ...s, accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + token.expires_in * 1000 };
}

export function authorizeUrl(redirect: string, state: string): string {
  const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: redirect, response_type: "code", scope: VIEWER_SCOPES.join(" "), state });
  return `https://id.twitch.tv/oauth2/authorize?${q}`;
}

export type SendResult = { ok: true } | { ok: false; status: number; error: string };

/** Nachricht im Namen des Zuschauers senden (Twitch Helix "Send Chat Message"). */
export async function sendChatMessage(s: ViewerSession, broadcasterId: string, message: string): Promise<SendResult> {
  const res = await fetch("https://api.twitch.tv/helix/chat/messages", {
    method: "POST",
    headers: { "Client-Id": CLIENT_ID, Authorization: `Bearer ${s.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ broadcaster_id: broadcasterId, sender_id: s.userId, message }),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false, status: 502, error: "Twitch nicht erreichbar" };
  if (res.status === 401) return { ok: false, status: 401, error: "Twitch-Login abgelaufen" };
  const body = (await res.json().catch(() => null)) as
    { data?: { is_sent: boolean; drop_reason?: { message?: string } | null }[]; message?: string } | null;
  const result = body?.data?.[0];
  if (res.ok && result?.is_sent) return { ok: true };
  // Twitch lehnt ab (z.B. "Nur Follower", Slow-Mode, AutoMod) — Begründung an den Zuschauer weitergeben.
  return { ok: false, status: 400, error: result?.drop_reason?.message || body?.message || "Nachricht wurde nicht gesendet" };
}
