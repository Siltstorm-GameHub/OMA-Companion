import { prisma } from "@/lib/prisma";
import { getInstanceSummaries } from "@/lib/amp";
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
export async function promoteNextWaitlisted(serverId: string): Promise<void> {
  const next = await prisma.serverApplication.findFirst({
    where: { serverId, status: "waitlisted" },
    orderBy: { appliedAt: "asc" },
    include: { server: true },
  });
  if (!next) return;

  await prisma.serverApplication.update({ where: { id: next.id }, data: { status: "pending" } });
  await dispatchNotification("server_waitlist_promoted", {
    users: [next.userId],
    placeholders: { "{serverName}": next.server.name },
  }).catch(() => {});
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

export type AmpSyncSuggestion = { ampInstanceId: string; name: string; game: string; port: string | null };
export type AmpSyncResult = {
  deactivated: { id: string; name: string }[];
  suggestions: AmpSyncSuggestion[];
};

// Gleicht die verknüpften Server mit dem AMP-Controller ab:
// - Server, deren AMP-Instanz nicht mehr existiert, werden automatisch deaktiviert
//   (nicht gelöscht, damit Bewerbungshistorie erhalten bleibt).
// - AMP-Instanzen ohne verknüpften Server werden als Vorschlag zurückgegeben; da AMP
//   Host/IP und Passwort nicht zuverlässig liefert, legt der Sync sie nicht selbst an —
//   ein Admin übernimmt Name/Spiel/Port per Klick und ergänzt den Rest manuell.
export async function syncGameServersWithAmp(): Promise<AmpSyncResult> {
  const instances = await getInstanceSummaries();
  const instanceIds = new Set(instances.map((i) => i.instanceId));

  const linkedServers = await prisma.gameServer.findMany({
    where: { ampInstanceId: { not: null }, isActive: true },
  });
  const toDeactivate = linkedServers.filter((s) => s.ampInstanceId && !instanceIds.has(s.ampInstanceId));

  if (toDeactivate.length > 0) {
    await prisma.gameServer.updateMany({
      where: { id: { in: toDeactivate.map((s) => s.id) } },
      data: { isActive: false },
    });
  }

  const knownInstanceIds = new Set(
    (await prisma.gameServer.findMany({ where: { ampInstanceId: { not: null } }, select: { ampInstanceId: true } })).map(
      (s) => s.ampInstanceId
    )
  );
  const suggestions = instances
    .filter((i) => !knownInstanceIds.has(i.instanceId))
    .map((i) => ({ ampInstanceId: i.instanceId, name: i.name, game: i.game, port: i.port }));

  return { deactivated: toDeactivate.map((s) => ({ id: s.id, name: s.name })), suggestions };
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
  myStatus: "none" | "pending" | "approved" | "denied" | "revoked" | "waitlisted";
  waitlistPosition?: number;
  openAccess: boolean;
  host?: string;
  port?: string | null;
  password?: string | null;
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
        maxSlots: server.maxSlots,
        occupied,
        available,
        light: trafficLight(available, server.maxSlots),
        myStatus: hasApproved ? "approved" : ((application?.status as VisibleServer["myStatus"]) ?? "none"),
        ...(waitlistPosition !== undefined ? { waitlistPosition } : {}),
        openAccess: server.openAccess,
        ...(hasApproved
          ? { host: server.host, port: server.port, password: server.password }
          : {}),
      };
    })
  );
}
