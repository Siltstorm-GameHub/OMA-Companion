import { notFound } from "next/navigation";
import StreamerOverlayClient from "@/components/overlay/StreamerOverlayClient";
import { getStreamerConfig, getStreamerOverlayPayload } from "@/lib/overlay-state";

export const dynamic = "force-dynamic";

/**
 * Fester Streamer-Link — EIN Link pro Streamer, für immer gültig (bis er neu erzeugt wird).
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

  return <StreamerOverlayClient userId={userId} token={token} scene={scene === "pause" ? "pause" : "gameplay"} initial={initial} />;
}
