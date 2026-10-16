import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify-dispatch";

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

export async function countWaitlistedApplications(serverId?: string): Promise<number> {
  return prisma.serverApplication.count({ where: { status: "waitlisted", ...(serverId ? { serverId } : {}) } });
}

// Rückt die älteste Warteliste-Bewerbung eines Servers zu "pending" auf, sobald ein Slot frei
// wird (z.B. nach Entzug einer Freigabe). Kein Auto-Approve — ein Moderator muss weiterhin
// manuell genehmigen, konsistent mit dem übrigen Freigabe-Flow bei Gameservern.
export async function promoteNextWaitlisted(serverId: string): Promise<boolean> {
  const next = await prisma.serverApplication.findFirst({
    where: { serverId, status: "waitlisted" },
    orderBy: { appliedAt: "asc" },
    include: { server: true },
  });
  if (!next) return false;

  await prisma.serverApplication.update({ where: { id: next.id }, data: { status: "pending" } });
  await dispatchNotification("server_waitlist_promoted", {
    users: [next.userId],
    placeholders: { "{serverName}": next.server.name },
  }).catch(() => {});
  return true;
}

// Nach einer Erhöhung von maxSlots: rückt so viele Warteliste-Bewerbungen auf "pending" nach,
// wie Plätze frei sind — abzüglich bereits offener Bewerbungen, die die Plätze schon beanspruchen.
export async function promoteWaitlistedIntoFreeSlots(serverId: string): Promise<void> {
  const server = await prisma.gameServer.findUnique({ where: { id: serverId }, select: { maxSlots: true } });
  if (!server) return;
  const [occupied, pending] = await Promise.all([countOccupiedSlots(serverId), countPendingApplications(serverId)]);
  for (let free = server.maxSlots - occupied - pending; free > 0; free--) {
    if (!(await promoteNextWaitlisted(serverId))) return;
  }
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
  joinInstructions: string | null;
  maxSlots: number;
  occupied: number;
  available: number;
  light: TrafficLight;
  myStatus: "none" | "pending" | "approved" | "denied" | "revoked" | "waitlisted";
  waitlistPosition?: number;
  openAccess: boolean;
  online: boolean;
  host?: string;
  port?: string | null;
  password?: string | null;
};

// Liste aller Server inkl. Ampel, Online-Status und (falls genehmigt) Zugangsdaten für den jeweiligen User.
// Offline geschaltete Server bleiben sichtbar und werden nur als offline angezeigt (online-Server zuerst).
// Wird sowohl von /api/servers als auch von der /servers-Seite (SSR) verwendet.
export async function getVisibleServers(userId: string | undefined): Promise<VisibleServer[]> {
  const servers = await prisma.gameServer.findMany({
    orderBy: [{ isOnline: "desc" }, { createdAt: "desc" }],
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
      // openAccess gewährt Zugangsdaten ohne Bewerbung — aber nur für angemeldete User (userId gesetzt).
      // Nicht angemeldete User (userId undefined) sehen den Server nur, nie die Zugangsdaten.
      const hasApproved = application?.status === "approved" || (server.openAccess && !!userId);
      const waitlistPosition =
        application?.status === "waitlisted"
          ? (await prisma.serverApplication.count({
              where: { serverId: server.id, status: "waitlisted", appliedAt: { lt: application.appliedAt } },
            })) + 1
          : undefined;

      return {
        id: server.id,
        name: server.name,
        game: server.game,
        description: server.description,
        joinInstructions: server.joinInstructions,
        maxSlots: server.maxSlots,
        occupied,
        available,
        light: trafficLight(available, server.maxSlots),
        myStatus: hasApproved ? "approved" : ((application?.status as VisibleServer["myStatus"]) ?? "none"),
        ...(waitlistPosition !== undefined ? { waitlistPosition } : {}),
        openAccess: server.openAccess,
        online: server.isOnline,
        ...(hasApproved
          ? { host: server.host, port: server.port, password: server.password }
          : {}),
      };
    })
  );
}
