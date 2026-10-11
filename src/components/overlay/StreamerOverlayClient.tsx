"use client";

import EventOverlayView from "./EventOverlayView";
import ProfileOverlayView from "./ProfileOverlayView";
import PauseView from "./PauseView";
import { useOverlayStream } from "./useOverlayStream";
import type { OverlayScene, StreamerOverlayPayload } from "./types";

/**
 * Fester Streamer-Link (/overlay/streamer/[userId]?token=…[&scene=pause]): einmal in OBS
 * eingerichtet, zeigt er automatisch das Event, das der Streamer gerade streamt, und dazwischen
 * sein Profil-Overlay. Layout, Inhalte und Leicht-Modus kommen live vom Server; die Szene legt
 * die URL fest (je OBS-Szene eine eigene Browser-Quelle).
 */
export default function StreamerOverlayClient({
  userId, token, scene, initial,
}: { userId: string; token: string; scene: OverlayScene; initial: StreamerOverlayPayload }) {
  const payload = useOverlayStream(`/api/overlay/streamer/${userId}/stream?token=${encodeURIComponent(token)}`, initial);

  // Pausen-Szene als eigene OBS-Quelle, oder per Live-Steuerung über das Spiel-Overlay gelegt.
  if (scene === "pause" || payload.pause) return <PauseView payload={payload} />;

  // key: beim Moduswechsel (oder Wechsel auf ein anderes Event) frisch mounten — Rotation und
  // Zoom-Zustand des vorherigen Inhalts sollen nicht in den neuen hineinlaufen.
  return payload.mode === "event"
    ? <EventOverlayView key={`event:${payload.eventId}`} eventId={payload.eventId} state={payload.event} layout={payload.layout} lite={payload.lite} />
    : <ProfileOverlayView key="profile" state={payload.profile} layout={payload.layout} lite={payload.lite} control={payload.profileControl} />;
}
