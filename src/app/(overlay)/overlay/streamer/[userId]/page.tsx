import { notFound } from "next/navigation";
import StreamerOverlayClient from "@/components/overlay/StreamerOverlayClient";
import { getStreamerConfig, getStreamerOverlayPayload } from "@/lib/overlay-state";
import { withTogether } from "@/lib/overlay-together";
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
  searchParams: Promise<{ token?: string; scene?: string; preview?: string; demo?: string }>;
}) {
  const { userId } = await params;
  const { token, scene, preview, demo } = await searchParams;

  const stored = await getStreamerConfig(userId);
  if (!stored?.token || !token || stored.token !== token) notFound();

  // ?preview=event|profile: Layout-Vorschau in der App (Beispieldaten, ohne Live-Steuerung).
  const previewOpt = preview
    ? { mode: preview === "event" ? "event" as const : "profile" as const, demo: demo === "ko" ? "ko" as const : "liga" as const }
    : undefined;
  const payload = await getStreamerOverlayPayload(userId, stored.config, stored.control, previewOpt);
  if (!payload) notFound();
  const initial = await withTogether(payload, userId, !!previewOpt);

  // Ohne (gültiges) `&scene=` folgt der Link der Szene aus der Live-Steuerung.
  const validScene: OverlayScene | null = OVERLAY_SCENES.includes(scene as OverlayScene) ? scene as OverlayScene : null;
  return <StreamerOverlayClient userId={userId} token={token} scene={validScene} initial={initial} preview={previewOpt} />;
}
