"use client";

import EventOverlayView from "./EventOverlayView";
import ProfileOverlayView from "./ProfileOverlayView";
import PauseView from "./PauseView";
import ClipLoopView from "./ClipLoopView";
import { useOverlayStream } from "./useOverlayStream";
import type { OverlayScene, StreamerOverlayPayload } from "./types";

/**
 * Fester Streamer-Link (/overlay/streamer/[userId]?token=…[&scene=pause|intro|clips|outro]): einmal in OBS
 * eingerichtet, zeigt er automatisch das Event, das der Streamer gerade streamt, und dazwischen
 * sein Profil-Overlay. Layout, Inhalte und Leicht-Modus kommen live vom Server; die Szene legt
 * die URL fest (je OBS-Szene eine eigene Browser-Quelle).
 */
export default function StreamerOverlayClient({
  userId, token, scene, initial,
}: { userId: string; token: string; scene: OverlayScene | null; initial: StreamerOverlayPayload }) {
  const payload = useOverlayStream(`/api/overlay/streamer/${userId}/stream?token=${encodeURIComponent(token)}`, initial);

  // Feste Szene aus der URL (eigene OBS-Quelle je Szene), sonst die per Live-Steuerung gewählte —
  // so reicht EINE Browser-Quelle in OBS, und die Szene wechselt vom Handy aus.
  const active = scene ?? payload.scene;

  // Clip-Szenen (Community-Clip-Loop).
  if (active === "intro" || active === "clips" || active === "outro") {
    return <ClipLoopView key={active} variant={active} userId={userId} token={token} payload={payload} />;
  }
  if (active === "pause") return <PauseView payload={payload} />;

  // key: beim Moduswechsel (oder Wechsel auf ein anderes Event) frisch mounten — Rotation und
  // Zoom-Zustand des vorherigen Inhalts sollen nicht in den neuen hineinlaufen.
  return payload.mode === "event"
    ? <EventOverlayView key={`event:${payload.eventId}`} eventId={payload.eventId} state={payload.event} layout={payload.layout} lite={payload.lite} />
    : <ProfileOverlayView key="profile" state={payload.profile} layout={payload.layout} lite={payload.lite} control={payload.profileControl} />;
}
