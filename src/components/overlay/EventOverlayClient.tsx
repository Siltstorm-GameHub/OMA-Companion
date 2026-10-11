"use client";

import EventOverlayView from "./EventOverlayView";
import { useOverlayStream } from "./useOverlayStream";
import type { ElementKey, EventOverlayState, OverlayLayout } from "./types";

/** Event-Link (/overlay/[id]?token=…): Layout steht fest in der URL, Daten kommen live. */
export default function EventOverlayClient({
  eventId, token, streamerId, layout, initialState, lite,
}: {
  eventId: string;
  token: string;
  streamerId: string | null;
  layout: OverlayLayout<ElementKey>;
  initialState: EventOverlayState;
  lite: boolean;
}) {
  const streamerParam = streamerId ? `&streamer=${encodeURIComponent(streamerId)}` : "";
  const state = useOverlayStream(`/api/overlay/${eventId}/stream?token=${encodeURIComponent(token)}${streamerParam}`, initialState);
  return <EventOverlayView eventId={eventId} state={state} layout={layout} lite={lite} />;
}
