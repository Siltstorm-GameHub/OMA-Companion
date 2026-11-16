import { NextRequest } from "next/server";
import { getStreamerConfig, getStreamerOverlayPayload, type OverlayPreview } from "@/lib/overlay-state";
import { prisma } from "@/lib/prisma";
import { OVERLAY_SCENES, type OverlayScene } from "@/components/overlay/types";
import { overlayStreamResponse, CLOSE_STREAM, type StreamPacing } from "@/lib/overlay-sse";
import type { StreamerOverlayPayload } from "@/components/overlay/types";
import { withTogether } from "@/lib/overlay-together";

export const dynamic = "force-dynamic";

/** Schnell, solange sich etwas tut (Live-Steuerung, Turnier). Ruhig: im Turnier 3s, sonst 6s —
 *  der erste Klick in der Live-Steuerung nach längerer Ruhe braucht also bis zu 6s. */
const PACING: StreamPacing = {
  fast: 1500,
  idle: (last) => ((last as StreamerOverlayPayload | null)?.mode === "event" ? 3000 : 6000),
};
/** Wie oft eine offene Quelle ihr Lebenszeichen schreibt ("In OBS verbunden ✓"). */
const PRESENCE_MS = 30_000;

/**
 * Live-Daten des festen Streamer-Links (/overlay/streamer/[userId]?token=…): wechselt von selbst
 * zwischen Event-Modus (gerade gestreamtes Event) und Profil-Modus und liefert das am User
 * gespeicherte Layout mit — Änderungen in den Einstellungen erscheinen ohne neuen Link.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  const initial = await getStreamerConfig(userId);
  if (!initial?.token || initial.token !== token) return new Response("Invalid token", { status: 403 });

  const query = req.nextUrl.searchParams;
  const preview: OverlayPreview | undefined = query.get("preview")
    ? { mode: query.get("preview") === "event" ? "event" : "profile", demo: query.get("demo") === "ko" ? "ko" : "liga" }
    : undefined;
  // Lebenszeichen nur für echte Quellen (OBS oder geöffneter Link), nicht für Vorschauen in der App.
  // "chat" = eigene OBS-Quelle für den gemeinsamen Chat (/overlay/streamer/[userId]/chat).
  const requested = query.get("scene");
  const scene = OVERLAY_SCENES.includes(requested as OverlayScene) || requested === "chat" ? requested! : "auto";
  const isObs = /\bOBS\//.test(req.headers.get("user-agent") ?? "");
  let lastPresence = 0;

  return overlayStreamResponse(req, PACING, async () => {
    const current = await getStreamerConfig(userId);
    // Link wurde neu erzeugt (oder User gelöscht) → alte OBS-Quelle sofort abhängen.
    if (!current?.token || current.token !== token) return CLOSE_STREAM;
    if (!preview && Date.now() - lastPresence > PRESENCE_MS) {
      lastPresence = Date.now();
      await prisma.overlayPresence.upsert({
        where: { userId_scene: { userId, scene } },
        create: { userId, scene, isObs, lastSeenAt: new Date() },
        update: { isObs, lastSeenAt: new Date() },
      }).catch(() => {});
    }
    const payload = await getStreamerOverlayPayload(userId, current.config, current.control, preview);
    return payload && withTogether(payload, userId, !!preview);
  });
}
