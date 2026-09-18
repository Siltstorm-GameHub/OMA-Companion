import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstances, toInstanceStatus } from "@/lib/amp";
import { queryGameServer } from "@/lib/gamedig-query";

type StatusEntry = { online: boolean; currentPlayers: number | null; maxPlayers: number | null; players: string[] | null };

// Öffentlicher Live-Status: online/offline + Spielerzahl (+ ggf. Spielernamen) pro Server,
// keyed by gameserver.id. Keine sensiblen Daten (Host/Passwort) — die bleiben weiterhin
// hinter der Bewerbungs-Freigabe.
export async function GET() {
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true, OR: [{ ampInstanceId: { not: null } }, { queryType: "gamedig" }] },
    select: {
      id: true, ampInstanceId: true, queryType: true, gamedigType: true,
      host: true, port: true, queryPort: true, queryTelnetPort: true, queryTelnetPassword: true,
    },
  });

  if (servers.length === 0) return NextResponse.json({});

  const result: Record<string, StatusEntry> = {};

  const ampServers = servers.filter((s) => s.ampInstanceId);
  if (ampServers.length > 0) {
    try {
      const instances = await getInstances();
      const statusByInstanceId = new Map(instances.map((instance) => [instance.InstanceID, toInstanceStatus(instance)]));
      for (const server of ampServers) {
        const status = server.ampInstanceId ? statusByInstanceId.get(server.ampInstanceId) : undefined;
        if (status) {
          result[server.id] = { online: status.online, currentPlayers: status.currentPlayers, maxPlayers: status.maxPlayers, players: null };
        }
      }
    } catch {
      // AMP nicht erreichbar o.ä. — Seite bleibt nutzbar, nur ohne Live-Status für diese Server.
    }
  }

  const gamedigServers = servers.filter((s) => s.queryType === "gamedig" && s.gamedigType);
  await Promise.all(
    gamedigServers.map(async (server) => {
      result[server.id] = await queryGameServer(
        server.host, server.queryPort ?? server.port, server.gamedigType!,
        server.queryTelnetPort, server.queryTelnetPassword
      );
    })
  );

  return NextResponse.json(result);
}
