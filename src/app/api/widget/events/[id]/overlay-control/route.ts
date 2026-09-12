import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * Live-Steuerungszustand des Overlays (Event.overlayControlJson) — siehe Kommentar am Feld in
 * prisma/schema.prisma. Wird vom bestehenden Overlay-SSE-Stream (/api/overlay/[id]/stream)
 * mitgeliefert und dort in OverlayClient.tsx angewendet: `hidden` blendet Elemente unabhängig
 * vom URL-Standardlayout aus, `zoom` zeigt genau ein Element kurzzeitig als Vollbild-Kachel.
 */
const VALID_ELEMENTS = ["brand", "liveinfo", "ticker", "bracket", "table", "participants", "favorites", "badges"];

type OverlayControl = { hidden: string[]; zoom: string | null };

function parseControl(raw: string | null): OverlayControl {
  if (!raw) return { hidden: [], zoom: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((k: unknown) => typeof k === "string" && VALID_ELEMENTS.includes(k)) : [],
      zoom: typeof parsed.zoom === "string" && VALID_ELEMENTS.includes(parsed.zoom) ? parsed.zoom : null,
    };
  } catch {
    return { hidden: [], zoom: null };
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayControlJson: true } });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  return NextResponse.json(parseControl(event.overlayControlJson));
}

/**
 * PATCH /api/widget/events/[id]/overlay-control
 * Body: { hidden?: string[], zoom?: string | null } — beides optional, nur angegebene Felder
 * werden geaendert (Merge auf den bestehenden Zustand, kein Full-Replace noetig vom Client).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const body = await req.json().catch(() => ({}));

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayControlJson: true } });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const current = parseControl(event.overlayControlJson);
  const next: OverlayControl = {
    hidden: Array.isArray(body.hidden)
      ? body.hidden.filter((k: unknown) => typeof k === "string" && VALID_ELEMENTS.includes(k))
      : current.hidden,
    zoom: body.zoom === undefined
      ? current.zoom
      : (typeof body.zoom === "string" && VALID_ELEMENTS.includes(body.zoom) ? body.zoom : null),
  };

  await prisma.event.update({ where: { id: eventId }, data: { overlayControlJson: JSON.stringify(next) } });
  return NextResponse.json(next);
}
