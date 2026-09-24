import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getJobBadges } from "@/lib/community-job-service";

export const dynamic = "force-dynamic";

/**
 * GET ?ids=a,b,c&token=…&event=<eventId> | &user=<userId> — Job-Badges für Overlays.
 * Overlays laufen als OBS-Browser-Source ohne Login; der Zugriff wird stattdessen wie bei den
 * Overlay-Streams über den Overlay-Token des Events bzw. des Users geprüft.
 * Antwort: { [userId]: JobBadgeData } — Nutzer ohne Job fehlen.
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const token = q.get("token");
  const eventId = q.get("event");
  const userId = q.get("user");
  if (!token || (!eventId && !userId)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });

  const owner = eventId
    ? await prisma.event.findUnique({ where: { id: eventId }, select: { overlayToken: true } })
    : await prisma.user.findUnique({ where: { id: userId! }, select: { overlayToken: true } });
  if (!owner || owner.overlayToken !== token) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });

  const ids = (q.get("ids") ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 100);
  return NextResponse.json(await getJobBadges(ids), { headers: { "Cache-Control": "private, max-age=60" } });
}
