import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserOverlayToken, buildStreamerOverlayUrl, STREAMER_OVERLAY_SETTINGS_PATH } from "@/lib/overlay";
import { sanitizeLayout, sanitizePauseText, parseStreamerConfig, sanitizeClipConfig } from "@/components/overlay/layout";
import { isPauseBackground } from "@/components/overlay/pauseBackgrounds";
import { ELEMENT_KEYS, PROFILE_ELEMENT_KEYS } from "@/components/overlay/types";
import { PAUSE_ELEMENT_KEYS, CLIP_ELEMENT_KEYS } from "@/components/overlay/sceneLayouts";
import { invalidateStreamerConfig } from "@/lib/overlay-state";

async function requireStreamer() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, twitchLogin: true } });
  if (!user) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  if (!user.twitchLogin) {
    return { error: NextResponse.json({ error: "Kein Twitch-Konto hinterlegt", code: "NO_TWITCH" }, { status: 400 }) };
  }
  return { userId: user.id };
}

/** Fester Streamer-Link + Pfad der Einstellungsseite. */
export async function GET() {
  const r = await requireStreamer();
  if ("error" in r) return r.error;
  const token = await ensureUserOverlayToken(r.userId);
  return NextResponse.json({ overlayUrl: buildStreamerOverlayUrl(r.userId, token), settingsUrl: STREAMER_OVERLAY_SETTINGS_PATH });
}

/**
 * PUT { event?, profile?, pauseLayout?, clipLayout?, pauseText?, lite?, pauseBackground?, clips?, togetherHint? } — speichert die Einstellungen des festen
 * Streamer-Links. Nur mitgeschickte Felder ändern sich; event/profile = null setzt den Modus aufs
 * Standard-Layout zurück. Offene OBS-Quellen übernehmen die Änderung binnen ~2s.
 */
export async function PUT(req: NextRequest) {
  const r = await requireStreamer();
  if ("error" in r) return r.error;
  const body = await req.json().catch(() => null) as { event?: unknown; profile?: unknown; pauseText?: unknown; lite?: unknown; pauseBackground?: unknown; clips?: unknown; pauseLayout?: unknown; clipLayout?: unknown; togetherHint?: unknown } | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

  const event = body.event == null ? null : sanitizeLayout(body.event, ELEMENT_KEYS);
  const profile = body.profile == null ? null : sanitizeLayout(body.profile, PROFILE_ELEMENT_KEYS);
  const pauseLayout = body.pauseLayout == null ? null : sanitizeLayout(body.pauseLayout, PAUSE_ELEMENT_KEYS);
  const clipLayout = body.clipLayout == null ? null : sanitizeLayout(body.clipLayout, CLIP_ELEMENT_KEYS);
  if ((body.event != null && !event) || (body.profile != null && !profile)
    || (body.pauseLayout != null && !pauseLayout) || (body.clipLayout != null && !clipLayout)) {
    return NextResponse.json({ error: "Layout ungültig – mindestens ein Element muss aktiv sein" }, { status: 400 });
  }

  const current = await prisma.user.findUnique({ where: { id: r.userId }, select: { overlayLayoutJson: true } });
  const config = parseStreamerConfig(current?.overlayLayoutJson);
  if ("event" in body) config.event = event;
  if ("profile" in body) config.profile = profile;
  if ("pauseLayout" in body) config.pauseLayout = pauseLayout;
  if ("clipLayout" in body) config.clipLayout = clipLayout;
  if ("pauseText" in body) config.pauseText = sanitizePauseText(body.pauseText);
  if ("lite" in body) config.lite = body.lite === true;
  if ("togetherHint" in body) config.togetherHint = body.togetherHint !== false;
  if ("pauseBackground" in body && isPauseBackground(body.pauseBackground)) config.pauseBackground = body.pauseBackground;
  // Teil-Update: nicht mitgeschickte Clip-Felder behalten ihren Wert.
  if ("clips" in body) config.clips = sanitizeClipConfig(body.clips, config.clips);

  await prisma.user.update({ where: { id: r.userId }, data: { overlayLayoutJson: JSON.stringify(config) } });
  invalidateStreamerConfig(r.userId);
  return NextResponse.json({ ok: true, ...config });
}
