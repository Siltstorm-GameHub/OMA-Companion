import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import SyncMembersButton from "./SyncMembersButton";
import SyncDiscordRolesButton from "./SyncDiscordRolesButton";
import AdminUsersClient from "./AdminUsersClient";
import type { AdminUserRow } from "@/lib/admin-users";

export default async function AdminUsersPage() {
  const me = await requireRole("admin");

  const rawUsers = await prisma.user.findMany({
    // Auf eigenen Wunsch gelöschte (anonymisierte) Konten gehören nicht mehr in die Verwaltung
    where: { deletedAt: null },
    select: {
      id: true, name: true, username: true, email: true,
      image: true, role: true, points: true, rankPoints: true,
      discordId: true, createdAt: true, lastLoginAt: true, leftServerAt: true,
      _count: { select: { eventRegistrations: true } },
      // Nur prüfen ob irgendein Account existiert (kein access_token laden)
      accounts: { select: { id: true }, take: 1 },
    },
  });

  // Serialisierbar für den Client; Suche, Filter und Sortierung passieren dort
  const users: AdminUserRow[] = rawUsers.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    image: u.image,
    role: u.role,
    points: u.points,
    rankPoints: u.rankPoints,
    discordId: u.discordId,
    hasLogin: u.accounts.length > 0,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    leftServerAt: u.leftServerAt ? u.leftServerAt.toISOString() : null,
    eventCount: u._count.eventRegistrations,
  }));

  return (
    <AdminUsersClient
      users={users}
      meId={me.id}
      syncTools={<>
        <p className="text-xs text-gray-500">Mitglieder und Ansehens-Rollen mit dem Discord-Server abgleichen.</p>
        <SyncMembersButton />
        <SyncDiscordRolesButton />
      </>}
    />
  );
}
