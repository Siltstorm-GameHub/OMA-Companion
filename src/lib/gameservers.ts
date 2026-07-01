import { prisma } from "@/lib/prisma";

export type TrafficLight = "green" | "yellow" | "red";

export const SERVER_ACCESS_DAYS = 30;

export function trafficLight(available: number, max: number): TrafficLight {
  if (available <= 0) return "red";
  if (available <= Math.max(1, Math.ceil(max * 0.2))) return "yellow";
  return "green";
}

// Belegte Slots = genehmigte Bewerbungen, deren Zugriff noch nicht abgelaufen ist.
// Die expiresAt-Prüfung läuft hier zusätzlich zum status-Feld, damit die Zahl auch
// stimmt, falls der tägliche Expiry-Cron noch nicht gelaufen ist.
export function occupiedWhere(serverId: string) {
  return {
    serverId,
    status: "approved",
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

export async function countOccupiedSlots(serverId: string): Promise<number> {
  return prisma.serverApplication.count({ where: occupiedWhere(serverId) });
}

export type VisibleServer = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  icon: string | null;
  maxSlots: number;
  occupied: number;
  available: number;
  light: TrafficLight;
  myStatus: "none" | "pending" | "approved" | "denied" | "revoked" | "expired";
  myExpiresAt: Date | null;
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
      const hasApproved =
        !!application &&
        application.status === "approved" &&
        (!application.expiresAt || application.expiresAt > new Date());

      return {
        id: server.id,
        name: server.name,
        game: server.game,
        description: server.description,
        icon: server.icon,
        maxSlots: server.maxSlots,
        occupied,
        available,
        light: trafficLight(available, server.maxSlots),
        myStatus: (application?.status as VisibleServer["myStatus"]) ?? "none",
        myExpiresAt: application?.expiresAt ?? null,
        ...(hasApproved
          ? { host: server.host, port: server.port, password: server.password, connectInfo: server.connectInfo }
          : {}),
      };
    })
  );
}
