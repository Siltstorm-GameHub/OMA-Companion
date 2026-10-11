import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventOverlayClient from "@/components/overlay/EventOverlayClient";
import { getEventOverlayState, getOverlayStreamer } from "@/lib/overlay-state";
import { parseLayoutParam, legacyParamsToLayout, clampRotateSeconds } from "@/components/overlay/layout";
import { ELEMENT_KEYS, DEFAULT_ROTATE_SECONDS, type ElementKey, type OverlayLayout } from "@/components/overlay/types";

export const dynamic = "force-dynamic";

/**
 * Event-Link fürs OBS-Overlay. Das Layout steckt in der URL:
 *   - `?layout=…` (per Einstellungsseite erzeugt, siehe parseLayoutParam), oder
 *   - die ganz alten Parameter `panels`/`pos`/`ticker`/`brand`, die hier in ein gleichwertiges
 *     Layout übersetzt werden — es gibt nur noch EIN Render-System.
 * Neue Streamer bekommen stattdessen den festen Streamer-Link (/overlay/streamer/[userId]).
 */
export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; panels?: string; rotate?: string; pos?: string; ticker?: string; brand?: string; layout?: string; streamer?: string; lite?: string }>;
}) {
  const { id: eventId } = await params;
  const query = await searchParams;
  const { token, streamer: streamerId } = query;

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, format: true, overlayToken: true } });
  if (!event || !token || event.overlayToken !== token) notFound();

  const [state, streamer] = await Promise.all([
    getEventOverlayState(event.id),
    streamerId ? getOverlayStreamer(streamerId).catch(() => null) : Promise.resolve(null),
  ]);
  if (!state) notFound();

  const elements = parseLayoutParam<ElementKey>(query.layout, ELEMENT_KEYS);
  const layout: OverlayLayout<ElementKey> = elements
    ? { elements, rotateSeconds: query.rotate ? clampRotateSeconds(query.rotate) : DEFAULT_ROTATE_SECONDS }
    : legacyParamsToLayout(query, event.format);

  return (
    <EventOverlayClient
      eventId={event.id}
      token={token}
      streamerId={streamerId ?? null}
      layout={layout}
      initialState={{ ...state, streamer }}
      lite={query.lite === "1"}
    />
  );
}
