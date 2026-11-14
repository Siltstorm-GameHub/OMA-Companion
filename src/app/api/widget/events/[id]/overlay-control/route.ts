import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { ensureOverlayToken, buildOverlayUrl } from "@/lib/overlay";
import { activeAnnouncement, applyEventControlPatch, parseEventOverlayControl } from "@/lib/event-overlay-control";
import type { EventControl } from "@/components/overlay/types";

/**
 * Live-Steuerungszustand des Overlays (Event.overlayControlJson) — siehe Kommentar am Feld in
 * prisma/schema.prisma. Wird vom bestehenden Overlay-SSE-Stream (/api/overlay/[id]/stream)
 * mitgeliefert und gilt für ALLE Overlays dieses Events (Event-Link und Streamer-Links im
 * Turniermodus): `hidden` blendet Elemente unabhängig vom URL-Standardlayout aus, `zoom` zeigt
 * genau ein Element als Vollbild-Kachel, `scene: "pause"` schaltet alle in die Pausen-Szene,
 * `announcement` blendet eine Durchsage ein. Lesen/Ändern siehe lib/event-overlay-control.ts.
 */

/** Antwort fürs Widget — eine abgelaufene Durchsage gilt als keine. */
function forWidget(control: EventControl) {
  return { ...control, announcement: activeAnnouncement(control) };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayControlJson: true, format: true, seriesId: true } });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // ensureOverlayToken legt bei Bedarf einen neuen Token an (gleiche Funktion, die auch die
  // Overlay-Einstellungsseite nutzt) — die Overlay-URL ist damit ab dem ersten Oeffnen dieses
  // Tabs verfuegbar, auch wenn sich noch nie ein Streamer fuer das Event registriert hat.
  const token = await ensureOverlayToken(eventId);

  return NextResponse.json({
    ...forWidget(parseEventOverlayControl(event.overlayControlJson)),
    overlayUrl: buildOverlayUrl(eventId, token, event.format, !!event.seriesId),
  });
}

/**
 * PATCH /api/widget/events/[id]/overlay-control
 * Body (alles optional, nur angegebene Felder werden geaendert):
 *   { hidden?: string[], zoom?: string | null, scene?: "pause" | null,
 *     announcement?: { text: string, durationSec?: number | null, countdown?: boolean } | null }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayControlJson: true } });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const next = applyEventControlPatch(parseEventOverlayControl(event.overlayControlJson), body as Record<string, unknown>);
  await prisma.event.update({ where: { id: eventId }, data: { overlayControlJson: JSON.stringify(next) } });
  return NextResponse.json(forWidget(next));
}
