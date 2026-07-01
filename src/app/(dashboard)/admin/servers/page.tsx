import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { countOccupiedSlots, trafficLight } from "@/lib/gameservers";
import ServerManager from "./ServerManager";

export default async function AdminServersPage() {
  await requireRole("moderator");

  const servers = await prisma.gameServer.findMany({ orderBy: { createdAt: "desc" } });
  const withCounts = await Promise.all(
    servers.map(async (server) => {
      const occupied = await countOccupiedSlots(server.id);
      return { ...server, occupied, light: trafficLight(server.maxSlots - occupied, server.maxSlots) };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Gameserver</h1>
        <p className="text-sm text-gray-400 mt-1">
          Community-Gameserver verwalten. Zugangsdaten werden nur an genehmigte Bewerber ausgegeben.
        </p>
      </div>
      <ServerManager initialServers={withCounts} />
    </div>
  );
}
