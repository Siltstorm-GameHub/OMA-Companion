import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventOverlayState, getOverlayStreamer } from "@/lib/overlay-state";
import { overlayStreamResponse, type StreamPacing } from "@/lib/overlay-sse";

export const dynamic = "force-dynamic";

/** Live-Daten des Event-Overlays (/overlay/[id]?token=…). Die Abfragelast liegt gecacht und
 *  per Fingerprint gedrosselt in lib/overlay-state.ts. Nach einer Minute ohne Änderung reicht 3s. */
const PACING: StreamPacing = { fast: 1500, idle: 3000 };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const streamerId = req.nextUrl.searchParams.get("streamer");
  if (!token) return new Response("Missing token", { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayToken: true } });
  if (!event?.overlayToken || event.overlayToken !== token) {
    return new Response("Invalid token", { status: 403 });
  }

  return overlayStreamResponse(req, PACING, async () => {
    const [state, streamer] = await Promise.all([
      getEventOverlayState(eventId),
      streamerId ? getOverlayStreamer(streamerId).catch(() => null) : Promise.resolve(null),
    ]);
    return state ? { ...state, streamer } : null;
  });
}
