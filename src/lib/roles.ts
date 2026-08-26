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
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

/** Zugriff auf ein bestehendes Event: Moderator/Admin immer, sonst nur Captain des Squads, dem das
 *  Event (direkt oder über seine Reihe) zugeordnet ist. Events ohne Squad-Zuordnung sind für Captains
 *  tabu — "voller Event-Admin, nur aufs eigene Team beschränkt" gilt nur für Team-Events. */
export async function requireModeratorOrEventSquadCaptain(eventId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (hasMinRole(user.role, "moderator")) return user;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { squadId: true, series: { select: { squadId: true } } },
  });
  const squadId = event?.squadId ?? event?.series?.squadId ?? null;
  if (!squadId) redirect("/dashboard?error=unauthorized");
  return requireModeratorOrSquadCaptain(squadId);
}

/** Analog zu requireModeratorOrEventSquadCaptain, aber für eine ganze Eventreihe. */
export async function requireModeratorOrSeriesSquadCaptain(seriesId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (hasMinRole(user.role, "moderator")) return user;
  const series = await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { squadId: true } });
  if (!series?.squadId) redirect("/dashboard?error=unauthorized");
  return requireModeratorOrSquadCaptain(series.squadId);
}

/** Für Einstiegspunkte ohne bereits feststehendes Event/Reihe (z.B. "Neues Event erstellen"):
 *  Moderator/Admin immer, sonst jeder, der mindestens ein Squad captained. */
export async function requireModeratorOrAnySquadCaptain() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (hasMinRole(user.role, "moderator")) return { user, captainedSquadIds: null as string[] | null };
  const captainedSquadIds = await getCaptainedSquadIds(user.id);
  if (captainedSquadIds.length === 0) redirect("/dashboard?error=unauthorized");
  return { user, captainedSquadIds };
}
