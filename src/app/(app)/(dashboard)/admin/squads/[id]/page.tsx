import { notFound } from "next/navigation";
import { requireRole, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import SquadDetailClient from "./SquadDetailClient";

// Nur Moderatoren/Admins (blanket-gated über admin/layout.tsx) — Captains landen für ihr Roster
// auf der öffentlichen Squad-Seite (/squads/[id]), nicht hier.
export default async function AdminSquadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("moderator");

  const [squad, allUsers] = await Promise.all([
    prisma.squad.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!squad) notFound();

  return (
    <SquadDetailClient
      squad={squad}
      allUsers={allUsers}
      isAdmin={hasMinRole(user.role, "admin")}
    />
  );
}
