import { auth } from "@/auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export type Role = "user" | "moderator" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  user:      "Mitglied",
  moderator: "Moderator",
  admin:     "Admin",
};

export const ROLE_STYLES: Record<Role, string> = {
  user:      "bg-gray-800 text-gray-400",
  moderator: "bg-blue-900/50 text-blue-300",
  admin:     "bg-purple-900/50 text-purple-300",
};

// Server-side helper: holt Session + User mit Rolle
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  // deletedAt: gelöschte Konten (src/lib/account-deletion.ts) gelten als nicht eingeloggt
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: { id: true, name: true, username: true, email: true, image: true, role: true, points: true, rankPoints: true },
  });
  return user;
}

const ROLE_HIERARCHY: Role[] = ["user", "moderator", "admin"];

export function hasMinRole(role: string, minRole: Role) {
  return ROLE_HIERARCHY.indexOf(role as Role) >= ROLE_HIERARCHY.indexOf(minRole);
}

// Server-side guard: leitet weiter wenn Rolle nicht ausreicht
export async function requireRole(minRole: Role) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user.role, minRole)) {
    redirect("/dashboard?error=unauthorized");
  }
  return user;
}

/** Moderator/Admin dürfen immer, sonst nur Captains des jeweiligen Squads (z.B. für Roster-Pflege). */
export async function requireModeratorOrSquadCaptain(squadId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (hasMinRole(user.role, "moderator")) return user;
  const membership = await prisma.squadMembership.findUnique({
    where: { squadId_userId: { squadId, userId: user.id } },
  });
  if (membership?.role !== "captain") redirect("/dashboard?error=unauthorized");
  return user;
}

/** IDs aller Squads, deren Captain dieser User ist. */
export async function getCaptainedSquadIds(userId: string) {
  const rows = await prisma.squadMembership.findMany({
    where: { userId, role: "captain" },
    select: { squadId: true },
  });
  return rows.map(r => r.squadId);
}

// ── Event-Verwaltung ─────────────────────────────────────────────────────────
// Ein Event (bzw. eine Reihe) verwalten dürfen:
//   - Moderatoren/Admins: immer
//   - der Ersteller (Event.createdById, bzw. Ersteller der Reihe, zu der das Event gehört)
//   - Captains des Squads, dem das Event (direkt oder über seine Reihe) zugeordnet ist
// Belohnungen von Nicht-Moderatoren sind gekappt (lib/captain-reward-limits.ts).

async function isSquadCaptain(userId: string, squadId: string | null) {
  if (!squadId) return false;
  const membership = await prisma.squadMembership.findUnique({
    where: { squadId_userId: { squadId, userId } },
    select: { role: true },
  });
  return membership?.role === "captain";
}

/** Darf `user` dieses Event verwalten? (ohne Redirect, z.B. für Anzeige-Entscheidungen) */
export async function canManageEvent(user: { id: string; role: string } | null, eventId: string) {
  if (!user) return false;
  if (hasMinRole(user.role, "moderator")) return true;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true, squadId: true, series: { select: { createdById: true, squadId: true } } },
  });
  if (!event) return false;
  if (event.createdById === user.id || event.series?.createdById === user.id) return true;
  return isSquadCaptain(user.id, event.squadId ?? event.series?.squadId ?? null);
}

/** Darf `user` diese Eventreihe verwalten? */
export async function canManageSeries(user: { id: string; role: string } | null, seriesId: string) {
  if (!user) return false;
  if (hasMinRole(user.role, "moderator")) return true;
  const series = await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { createdById: true, squadId: true } });
  if (!series) return false;
  if (series.createdById === user.id) return true;
  return isSquadCaptain(user.id, series.squadId);
}

/** Zugriff auf ein bestehendes Event (siehe oben), sonst Redirect. */
export async function requireEventManager(eventId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await canManageEvent(user, eventId))) redirect("/dashboard?error=unauthorized");
  return user;
}

/** Analog zu requireEventManager, aber für eine ganze Eventreihe. */
export async function requireSeriesManager(seriesId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await canManageSeries(user, seriesId))) redirect("/dashboard?error=unauthorized");
  return user;
}

/** Was ein Nicht-Moderator in der Event-Verwaltung sieht: eigene Events/Reihen + die seiner Squads.
 *  null = Moderator/Admin (alles). */
export type EventScope = { userId: string; captainedSquadIds: string[] } | null;

/** Einstieg in die Event-Verwaltung ("Neues Event", Event-Liste): jeder eingeloggte User. */
export async function requireEventArea() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (hasMinRole(user.role, "moderator")) return { user, scope: null as EventScope, captainedSquadIds: null as string[] | null };
  const captainedSquadIds = await getCaptainedSquadIds(user.id);
  const scope: EventScope = { userId: user.id, captainedSquadIds };
  return { user, scope, captainedSquadIds };
}

/** Prisma-Filter: Events, die im Scope liegen (eigene, eigene Reihe, Squad direkt oder über die Reihe). */
export function eventScopeWhere(scope: EventScope) {
  if (!scope) return {};
  const squads = { in: scope.captainedSquadIds };
  return {
    OR: [
      { createdById: scope.userId },
      { series: { createdById: scope.userId } },
      ...(scope.captainedSquadIds.length ? [{ squadId: squads }, { series: { squadId: squads } }] : []),
    ],
  };
}

/** Prisma-Filter: Reihen, die im Scope liegen. */
export function seriesScopeWhere(scope: EventScope) {
  if (!scope) return {};
  return {
    OR: [
      { createdById: scope.userId },
      ...(scope.captainedSquadIds.length ? [{ squadId: { in: scope.captainedSquadIds } }] : []),
    ],
  };
}
