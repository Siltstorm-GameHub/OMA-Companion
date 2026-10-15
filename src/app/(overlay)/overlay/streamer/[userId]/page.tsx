import { notFound } from "next/navigation";
import StreamerOverlayClient from "@/components/overlay/StreamerOverlayClient";
import { getStreamerConfig, getStreamerOverlayPayload } from "@/lib/overlay-state";
import { OVERLAY_SCENES, type OverlayScene } from "@/components/overlay/types";

export const dynamic = "force-dynamic";

/**
 * Fester Streamer-Link (Szenen über `&scene=`: pause, intro, clips, outro; ohne = Spiel-Szene) — EIN Link pro Streamer, für immer gültig (bis er neu erzeugt wird).
 * Zeigt automatisch das Event, für das er sich als Streamer angemeldet hat und das gerade läuft,
 * sonst sein Profil-Overlay. Das Layout liegt am User (Einstellungsseite /overlay/streamer/settings).
 */
export default async function StreamerOverlayPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string; scene?: string }>;
}) {
  const { userId } = await params;
  const { token, scene } = await searchParams;

  const stored = await getStreamerConfig(userId);
  if (!stored?.token || !token || stored.token !== token) notFound();

  const initial = await getStreamerOverlayPayload(userId, stored.config, stored.control);
  if (!initial) notFound();

  const validScene: OverlayScene = OVERLAY_SCENES.includes(scene as OverlayScene) ? scene as OverlayScene : "gameplay";
  return <StreamerOverlayClient userId={userId} token={token} scene={validScene} initial={initial} />;
}
