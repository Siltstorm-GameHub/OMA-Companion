import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, readSession, refreshSession, sendChatMessage, setSessionCookie, type ViewerSession } from "@/lib/twitch-viewer";
import { resolveWatchChannels } from "@/lib/watch-together";
import { getTwitchUsers } from "@/lib/twitch";

const MAX_LENGTH = 500;
/** Eigene Bremse gegen Doppelklicks/Spam — Twitchs Kanal-Regeln (Slow-Mode etc.) gelten zusätzlich. */
const MIN_INTERVAL_MS = 1200;
const lastSent = new Map<string, number>();
const broadcasterIds = new Map<string, string>();

/**
 * POST { channel, message } — schreibt im Namen des angemeldeten Zuschauers in den Chat eines
 * Kanals. Nur Kanäle von Community-Mitgliedern (keine offene Weiterleitung in beliebige Chats).
 */
export async function POST(req: NextRequest) {
  let session = readSession(req);
  if (!session) return NextResponse.json({ error: "Bitte zuerst mit Twitch anmelden", code: "LOGIN" }, { status: 401 });

  const body = await req.json().catch(() => null) as { channel?: unknown; message?: unknown } | null;
  const channel = typeof body?.channel === "string" ? body.channel.toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!channel || !message) return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  if (message.length > MAX_LENGTH) return NextResponse.json({ error: `Höchstens ${MAX_LENGTH} Zeichen` }, { status: 400 });

  const now = Date.now();
  if (now - (lastSent.get(session.userId) ?? 0) < MIN_INTERVAL_MS) {
    return NextResponse.json({ error: "Kurz warten, dann nochmal senden" }, { status: 429 });
  }

  const [member] = await resolveWatchChannels([channel]);
  if (!member) return NextResponse.json({ error: "Kanal nicht gefunden" }, { status: 404 });
  let broadcasterId = broadcasterIds.get(member.twitchLogin);
  if (!broadcasterId) {
    broadcasterId = (await getTwitchUsers([member.twitchLogin]).catch(() => []))[0]?.id;
    if (!broadcasterId) return NextResponse.json({ error: "Kanal bei Twitch nicht gefunden" }, { status: 404 });
    broadcasterIds.set(member.twitchLogin, broadcasterId);
  }

  // Token kurz vor/nach Ablauf erneuern; das erneuerte landet unten wieder im Cookie.
  let refreshed: ViewerSession | null = null;
  if (session.expiresAt - now < 60_000) {
    refreshed = await refreshSession(session);
    if (!refreshed) return loggedOut();
    session = refreshed;
  }

  lastSent.set(session.userId, now);
  let result = await sendChatMessage(session, broadcasterId, message);
  if (!result.ok && result.status === 401 && !refreshed) {
    refreshed = await refreshSession(session);
    if (!refreshed) return loggedOut();
    session = refreshed;
    result = await sendChatMessage(session, broadcasterId, message);
  }

  const res = result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: result.status === 401 ? 401 : 400 });
  if (refreshed) setSessionCookie(res, refreshed);
  return res;
}

function loggedOut() {
  const res = NextResponse.json({ error: "Twitch-Login abgelaufen – bitte neu anmelden", code: "LOGIN" }, { status: 401 });
  clearSessionCookie(res);
  return res;
}
