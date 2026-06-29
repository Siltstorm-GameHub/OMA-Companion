import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import SyncMembersButton from "./SyncMembersButton";
import SyncDiscordRolesButton from "./SyncDiscordRolesButton";
import AdminUsersClient from "./AdminUsersClient";
import { LogIn, UserX } from "lucide-react";

export default async function AdminUsersPage() {
  await requireRole("admin");

  const rawUsers = await prisma.user.findMany({
    select: {
      id: true, name: true, username: true, email: true,
      image: true, role: true, points: true,
      discordId: true, createdAt: true,
      _count: { select: { eventRegistrations: true } },
      // Nur prüfen ob irgendein Account existiert (kein access_token laden)
      accounts: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const hasLogin = (u: typeof rawUsers[number]) => u.accounts.length > 0;

  const users = [...rawUsers].sort((a, b) => {
    const aLogin = hasLogin(a) ? 0 : 1;
    const bLogin = hasLogin(b) ? 0 : 1;
    if (aLogin !== bLogin) return aLogin - bLogin;
    return (a.username ?? a.name ?? "").localeCompare(b.username ?? b.name ?? "", "de");
  });

  const loginCount    = users.filter(hasLogin).length;
  const noLoginCount  = users.length - loginCount;
  const firstNoLoginIdx = users.findIndex(u => !hasLogin(u));

  // Flatten in serialisierbares Format für den Client
  const clientUsers = users.map(u => ({
    id:         u.id,
    name:       u.name,
    username:   u.username,
    email:      u.email,
    image:      u.image,
    role:       u.role,
    points:     u.points,
    discordId:  u.discordId,
    hasLogin:   hasLogin(u),
    eventCount: u._count.eventRegistrations,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{users.length} Mitglieder gesamt</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <LogIn className="w-3.5 h-3.5" /> {loginCount} eingeloggt
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <UserX className="w-3.5 h-3.5" /> {noLoginCount} noch nicht
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SyncDiscordRolesButton />
          <SyncMembersButton />
        </div>
      </div>

      <AdminUsersClient
        users={clientUsers}
        loginCount={loginCount}
        noLoginCount={noLoginCount}
        firstNoLoginIdx={firstNoLoginIdx}
      />
    </div>
  );
}
