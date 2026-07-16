import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstances, toInstanceStatus } from "@/lib/amp";

// Öffentlicher Live-Status: online/offline + Spielerzahl pro Server, keyed by gameserver.id.
// Keine sensiblen Daten (Host/Passwort) — die bleiben weiterhin hinter der Bewerbungs-Freigabe.
export async function GET() {
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true, ampInstanceId: { not: null } },
    select: { id: true, ampInstanceId: true },
  });

  if (servers.length === 0) return NextResponse.json({});

  try {
    const instances = await getInstances();
    const statusByInstanceId = new Map(instances.map((instance) => [instance.InstanceID, toInstanceStatus(instance)]));

    const result: Record<string, { online: boolean; currentPlayers: number | null; maxPlayers: number | null }> = {};
    for (const server of servers) {
      const status = server.ampInstanceId ? statusByInstanceId.get(server.ampInstanceId) : undefined;
      if (status) {
        result[server.id] = { online: status.online, currentPlayers: status.currentPlayers, maxPlayers: status.maxPlayers };
      }
    }
    return NextResponse.json(result);
  } catch {
    // AMP nicht erreichbar o.ä. — Seite bleibt nutzbar, nur ohne Live-Status.
    return NextResponse.json({});
  }
}
