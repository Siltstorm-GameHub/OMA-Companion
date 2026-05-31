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

export function canManageEvents(role: Role) {
  return role === "admin" || role === "moderator";
}

export function canManageTournaments(role: Role) {
  return role === "admin" || role === "moderator";
}

export function canAwardPoints(role: Role) {
  return role === "admin";
}

export function canManageRoles(role: Role) {
  return role === "admin";
}

// Server-side helper: holt Session + User mit Rolle
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, username: true, email: true, image: true, role: true, points: true, level: true },
  });
  return user;
}

// Server-side guard: leitet weiter wenn Rolle nicht ausreicht
export async function requireRole(minRole: Role) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const hierarchy: Role[] = ["user", "moderator", "admin"];
  if (hierarchy.indexOf(user.role as Role) < hierarchy.indexOf(minRole)) {
    redirect("/dashboard?error=unauthorized");
  }
  return user;
}
