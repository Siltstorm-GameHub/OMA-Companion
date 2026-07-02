import { prisma } from "@/lib/prisma";

export type TrafficLight = "green" | "yellow" | "red";

export function trafficLight(available: number, max: number): TrafficLight {
  if (available <= 0) return "red";
  if (available <= Math.max(1, Math.ceil(max * 0.2))) return "yellow";
  return "green";
}

export function occupiedWhere(serverId: string) {
  return { serverId, status: "approved" };
}

export async function countOccupiedSlots(serverId: string): Promise<number> {
  return prisma.serverApplication.count({ where: occupiedWhere(serverId) });
}

export async function countPendingApplications(serverId?: string): Promise<number> {
  return prisma.serverApplication.count({ where: { status: "pending", ...(serverId ? { serverId } : {}) } });
}

// Server-Liste für die Admin-Verwaltung inkl. Ampel und Anzahl offener Bewerbungen.
// Wird sowohl von /api/admin/servers als auch von der /admin/servers-Seite (SSR) verwendet.
export async function getServersWithAdminCounts() {
  const servers = await prisma.gameServer.findMany({ orderBy: { createdAt: "desc" } });
  return Promise.all(
    servers.map(async (server) => {
      const [occupied, pendingCount] = await Promise.all([
        countOccupiedSlots(server.id),
        countPendingApplications(server.id),
      ]);
      return { ...server, occupied, pendingCount, light: trafficLight(server.maxSlots - occupied, server.maxSlots) };
    })
  );
}

export type VisibleServer = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  maxSlots: number;
  occupied: number;
  available: number;
  light: TrafficLight;
  myStatus: "none" | "pending" | "approved" | "denied" | "revoked";
  host?: string;
  port?: string | null;
  password?: string | null;
  connectInfo?: string | null;
};

// Liste aller aktiven Server inkl. Ampel und (falls genehmigt) Zugangsdaten für den jeweiligen User.
// Wird sowohl von /api/servers als auch von der /servers-Seite (SSR) verwendet.
export async function getVisibleServers(userId: string | undefined): Promise<VisibleServer[]> {
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const myApplications = userId
    ? await prisma.serverApplication.findMany({ where: { userId, serverId: { in: servers.map((s) => s.id) } } })
    : [];
  const myApplicationByServer = new Map(myApplications.map((a) => [a.serverId, a]));

  return Promise.all(
    servers.map(async (server) => {
      const occupied = await countOccupiedSlots(server.id);
      const available = server.maxSlots - occupied;
      const application = myApplicationByServer.get(server.id);
      const hasApproved = application?.status === "approved";

      return {
        id: server.id,
        name: server.name,
        game: server.game,
        description: server.description,
        maxSlots: server.maxSlots,
        occupied,
        available,
        light: trafficLight(available, server.maxSlots),
        myStatus: (application?.status as VisibleServer["myStatus"]) ?? "none",
        ...(hasApproved
          ? { host: server.host, port: server.port, password: server.password, connectInfo: server.connectInfo }
          : {}),
      };
    })
  );
}
