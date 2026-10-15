import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Gilt als verbunden, wenn das letzte Lebenszeichen jünger ist (Quellen melden sich alle ~30s). */
const ONLINE_MS = 75_000;

/**
 * Verbindungsstatus des eigenen Overlays für Einstellungen, Assistent und Live-Steuerung:
 * Welche Quellen (Link ohne feste Szene = "auto", sonst die feste Szene) sind gerade offen,
 * und laufen sie in OBS oder nur in einem Browser-Tab?
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const rows = await prisma.overlayPresence.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: "desc" },
  });
  const now = Date.now();
  const sources = rows.map(r => ({
    scene: r.scene,
    isObs: r.isObs,
    lastSeenAt: r.lastSeenAt.toISOString(),
    online: now - r.lastSeenAt.getTime() < ONLINE_MS,
  }));
  return NextResponse.json({
    sources,
    online: sources.some(s => s.online),
    obs: sources.some(s => s.online && s.isObs),
    /** Wurde der Link überhaupt schon einmal geöffnet? (für den Einrichtungs-Assistenten) */
    everConnected: sources.length > 0,
  }, { headers: { "Cache-Control": "no-store" } });
}
