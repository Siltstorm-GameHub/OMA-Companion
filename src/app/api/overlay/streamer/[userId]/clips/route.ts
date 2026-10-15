import { NextRequest, NextResponse } from "next/server";
import { getStreamerConfig } from "@/lib/overlay-state";
import { getOverlayClips } from "@/lib/overlay-clips";

export const dynamic = "force-dynamic";

/**
 * Clips für den Community-Clip-Loop des festen Streamer-Links (Szenen intro/clips/outro). Bewusst
 * kein Teil des SSE-Streams: Die Liste ändert sich selten, das Overlay holt sie beim Start und
 * danach alle paar Minuten neu.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const stored = await getStreamerConfig(userId);
  if (!stored?.token || stored.token !== token) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const clips = await getOverlayClips(userId, stored.config.clips.source);
  return NextResponse.json({ clips }, { headers: { "Cache-Control": "no-store" } });
}
