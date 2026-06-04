import { requireRole, ROLE_LABELS, ROLE_STYLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import UserRoleManager from "./UserRoleManager";
import PointsManager from "./PointsManager";
import SyncMembersButton from "./SyncMembersButton";

export default async function AdminUsersPage() {
  await requireRole("admin");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { points: "desc" }],
    select: {
      id: true, name: true, username: true, email: true,
      image: true, role: true, points: true, level: true,
      discordId: true, createdAt: true,
      _count: { select: { eventRegistrations: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{users.length} User in der Datenbank</p>
        <SyncMembersButton />
      </div>

      <div className="glass card-shine rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05] text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Nutzer</th>
              <th className="text-left px-4 py-3 font-medium">Discord ID</th>
              <th className="text-left px-4 py-3 font-medium">Rolle</th>
              <th className="text-center px-4 py-3 font-medium">Punkte</th>
              <th className="text-center px-4 py-3 font-medium">Events</th>
              <th className="text-left px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rose-600/40 flex items-center justify-center text-xs font-semibold text-rose-300">
                        {(user.username ?? user.name ?? "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{user.username ?? user.name ?? "–"}</p>
                      <p className="text-xs text-gray-500">{user.email ?? "Kein Login"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600 font-mono">{user.discordId ?? "–"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[user.role as keyof typeof ROLE_STYLES] ?? ROLE_STYLES.user}`}>
                    {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-white font-medium">{user.points.toLocaleString("de-DE")}</span>
                  <span className="text-gray-500 text-xs ml-1">Lvl {user.level}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-400">
                  {user._count.eventRegistrations}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserRoleManager userId={user.id} currentRole={user.role} />
                    <PointsManager userId={user.id} userName={user.username ?? user.name ?? "?"} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
