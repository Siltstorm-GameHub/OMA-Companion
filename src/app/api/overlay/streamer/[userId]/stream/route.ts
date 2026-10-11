import { NextRequest } from "next/server";
import { getStreamerConfig, getStreamerOverlayPayload } from "@/lib/overlay-state";
import { overlayStreamResponse, CLOSE_STREAM } from "@/lib/overlay-sse";

export const dynamic = "force-dynamic";

const POLL_MS = 1500;

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

  return overlayStreamResponse(req, POLL_MS, async () => {
    const current = await getStreamerConfig(userId);
    // Link wurde neu erzeugt (oder User gelöscht) → alte OBS-Quelle sofort abhängen.
    if (!current?.token || current.token !== token) return CLOSE_STREAM;
    return getStreamerOverlayPayload(userId, current.config, current.control);
  });
}
