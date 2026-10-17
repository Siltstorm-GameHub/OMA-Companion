import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStreamerConfig, getStreamerOverlayPayload, invalidateStreamerConfig, explainStreamerEventMode, getStreamerEventCandidates } from "@/lib/overlay-state";
import { parseOverlayControl, sanitizeControl, activeZoom, isEliminationFormat } from "@/components/overlay/layout";
import {
  ELEMENT_LABELS, PROFILE_ELEMENT_LABELS, ZOOMABLE_ELEMENTS, ZOOMABLE_PROFILE_ELEMENTS, ELEMENT_KEYS, PROFILE_ELEMENT_KEYS,
  OVERLAY_SCENES, type StreamerOverlayPayload, type OverlayControl, type OverlayScene,
} from "@/components/overlay/types";
import { getOverlayClips } from "@/lib/overlay-clips";

/** Live-Steuerung des eigenen Streamer-Overlays (Seite /profile/overlay/live). Wirkt nur auf das
 *  Overlay des angemeldeten Users — die Event-weite Steuerung des Touchscreen-Widgets bleibt davon
 *  unberührt (siehe getStreamerOverlayPayload). */

const ZOOM_SECONDS_MIN = 3;
const ZOOM_SECONDS_MAX = 600;
const COUNTDOWN_MINUTES_MAX = 120;

/** Was zeigt das Overlay gerade, und welche Elemente haben Inhalt? */
function describe(payload: StreamerOverlayPayload) {
  if (payload.mode === "event") {
    const e = payload.event;
    const hasMatches = e.matches.length > 0;
    const available: Record<string, boolean> = {
      brand: true,
      liveinfo: true,
      ticker: e.matches.some(m => m.playedAt || m.player1Id || m.entries.length > 0),
      bracket: hasMatches && isEliminationFormat(e.format),
      table: !!e.format && !isEliminationFormat(e.format) && (hasMatches || e.participants.length > 0),
      seriesTable: (e.seriesTable?.ranking.length ?? 0) > 0,
      participants: e.participants.length > 0,
    };
    return {
      mode: "event" as const,
      title: e.title,
      // Zoom, den gerade das Touchscreen-Widget fürs ganze Event gesetzt hat (Info für die Seite).
      eventZoom: e.control.zoom,
      elements: ELEMENT_KEYS.map(key => ({
        key, label: ELEMENT_LABELS[key], available: available[key], zoomable: ZOOMABLE_ELEMENTS.includes(key),
      })),
    };
  }
  const p = payload.profile;
  const available: Record<string, boolean> = {
    brand: true, rank: true,
    nextEvent: p.upcomingEvents.length > 0,
    community: p.community.length > 0,
    liveMembers: p.liveMembers.length > 0,
  };
  return {
    mode: "profile" as const,
    title: null,
    eventZoom: null,
    elements: PROFILE_ELEMENT_KEYS.map(key => ({
      key, label: PROFILE_ELEMENT_LABELS[key], available: available[key], zoomable: ZOOMABLE_PROFILE_ELEMENTS.includes(key),
    })),
  };
}

/** Steuerungszustand für die Seite — mit Restzeit statt Zeitstempel, damit der Countdown nicht
 *  von der (evtl. falsch gehenden) Uhr des Handys abhängt. */
function controlResponse(control: OverlayControl) {
  const zoom = activeZoom(control);
  return {
    control: { ...control, zoom, zoomUntil: zoom ? control.zoomUntil : null },
    zoomRemainingMs: zoom && control.zoomUntil ? Math.max(0, control.zoomUntil - Date.now()) : null,
    countdownRemainingMs: control.countdownUntil ? Math.max(0, control.countdownUntil - Date.now()) : null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;

  const stored = await getStreamerConfig(userId);
  if (!stored) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const payload = await getStreamerOverlayPayload(userId, stored.config, stored.control);
  if (!payload) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Wie viele Clips der Loop gerade hat — damit leere Clip-Szenen in der Steuerung erklärbar sind.
  const [clips, eventReason, eventOptions] = await Promise.all([
    getOverlayClips(userId, stored.config.clips.source).catch(() => []),
    // Ohne Turniermodus: erklären, warum (läuft etwas, bei dem der User nicht dabei/nicht live ist?)
    payload.mode === "profile" ? explainStreamerEventMode(userId).catch(() => null) : Promise.resolve(null),
    // Laufende Events, bei denen der User dabei ist — mehrere = Auswahl in der Live-Steuerung.
    getStreamerEventCandidates(userId).catch(() => []),
  ]);
  return NextResponse.json({
    ...describe(payload), ...controlResponse(stored.control), clipCount: clips.length, eventReason,
    eventOptions, activeEventId: payload.mode === "event" ? payload.eventId : null,
  });
}

/**
 * PUT { zoom?: key | null, zoomSeconds?: number | null, hidden?: key[], scene?: OverlayScene, countdownMinutes?: number | null, skipClip?: true, eventChoice?: string | null } — nur
 * mitgeschickte Felder ändern sich. zoomSeconds = automatisch nach so vielen Sekunden beenden
 * (null/fehlt = bis zum Zurücksetzen). Offene OBS-Quellen übernehmen die Änderung binnen ~2s.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null) as { zoom?: unknown; zoomSeconds?: unknown; hidden?: unknown; pause?: unknown; scene?: unknown; countdownMinutes?: unknown; skipClip?: unknown; eventChoice?: unknown } | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { overlayControlJson: true } });
  if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const control = parseOverlayControl(user.overlayControlJson);

  if ("zoom" in body) {
    const seconds = Number(body.zoomSeconds);
    control.zoom = typeof body.zoom === "string" ? body.zoom : null;
    control.zoomUntil = control.zoom && Number.isFinite(seconds) && seconds > 0
      ? Date.now() + Math.min(ZOOM_SECONDS_MAX, Math.max(ZOOM_SECONDS_MIN, seconds)) * 1000
      : null;
  }
  if ("hidden" in body) control.hidden = Array.isArray(body.hidden) ? body.hidden : [];
  if ("pause" in body) control.scene = body.pause === true ? "pause" : "gameplay"; // älteres Format
  if (OVERLAY_SCENES.includes(body.scene as OverlayScene)) control.scene = body.scene as OverlayScene;
  if (body.skipClip === true) control.clipSkip = Date.now(); // Clip-Loop springt zum nächsten Clip
  // Für welches Event streame ich? (Event-ID, "none" = kein Turniermodus, null = automatisch)
  if ("eventChoice" in body) control.eventChoice = typeof body.eventChoice === "string" ? body.eventChoice : null;
  if ("countdownMinutes" in body) {
    // Intro-Countdown: Minuten ab jetzt, null/0 = beenden.
    const minutes = Number(body.countdownMinutes);
    control.countdownUntil = Number.isFinite(minutes) && minutes > 0
      ? Date.now() + Math.min(COUNTDOWN_MINUTES_MAX, minutes) * 60_000
      : null;
  }

  const next = sanitizeControl(control);
  await prisma.user.update({ where: { id: userId }, data: { overlayControlJson: JSON.stringify(next) } });
  invalidateStreamerConfig(userId);
  return NextResponse.json({ ok: true, ...controlResponse(next) });
}
