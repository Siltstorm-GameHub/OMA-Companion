import { requireRole, ROLE_LABELS, ROLE_STYLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import UserRoleManager from "./UserRoleManager";
import PointsManager from "./PointsManager";
import SyncMembersButton from "./SyncMembersButton";
import { LogIn, UserX } from "lucide-react";

export default async function AdminUsersPage() {
  await requireRole("admin");

  const rawUsers = await prisma.user.findMany({
    select: {
      id: true, name: true, username: true, email: true,
      image: true, role: true, points: true,
      discordId: true, createdAt: true,
      _count: { select: { eventRegistrations: true } },
      // Accounts mitladen um echte Logins (mit access_token) zu erkennen
      accounts: { select: { access_token: true } },
    },
  });

  // Sortierung: Eingeloggte User zuerst (Account mit echtem access_token),
  // innerhalb jeder Gruppe alphabetisch nach Anzeigename
  const displayName = (u: typeof rawUsers[number]) =>
    (u.username ?? u.name ?? "").toLowerCase();

  const hasLogin = (u: typeof rawUsers[number]) =>
    u.accounts.some(a => a.access_token !== null);

  const users = [...rawUsers].sort((a, b) => {
    const aLogin = hasLogin(a) ? 0 : 1;
    const bLogin = hasLogin(b) ? 0 : 1;
    if (aLogin !== bLogin) return aLogin - bLogin;          // Login zuerst
    return displayName(a).localeCompare(displayName(b), "de"); // dann A–Z
  });

  const loginCount   = users.filter(hasLogin).length;
  const noLoginCount = users.length - loginCount;

  // Index des ersten Nicht-Login-Users für Trennlinie
  const firstNoLoginIdx = users.findIndex(u => !hasLogin(u));

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
        <SyncMembersButton />
      </div>

      <div className="glass card-shine rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05] text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Nutzer</th>
              <th className="text-left px-4 py-3 font-medium">Discord ID</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Rolle</th>
              <th className="text-center px-4 py-3 font-medium">Punkte</th>
              <th className="text-center px-4 py-3 font-medium">Events</th>
              <th className="text-left px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map((user, idx) => {
              const loggedIn = hasLogin(user);
              const isFirstNoLogin = idx === firstNoLoginIdx;
              return (
                <>
                  {/* Trennlinie zwischen eingeloggten und nicht-eingeloggten Usern */}
                  {isFirstNoLogin && (
                    <tr key="divider">
                      <td colSpan={7} className="px-4 py-2 bg-white/[0.02]">
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
                          <UserX className="w-3 h-3" />
                          Noch nicht eingeloggt — {noLoginCount} Mitglieder
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors ${!loggedIn ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-8 h-8 rounded-full ring-1 ring-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-600/40 flex items-center justify-center text-xs font-semibold text-rose-300">
                            {(user.username ?? user.name ?? "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{user.username ?? user.name ?? "–"}</p>
                          <p className="text-xs text-gray-500">{user.email ?? <span className="text-gray-700 italic">Kein Login</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 font-mono">{user.discordId ?? "–"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {loggedIn ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <LogIn className="w-3 h-3" /> Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-600 border border-white/[0.06]">
                          <UserX className="w-3 h-3" /> Ausstehend
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[user.role as keyof typeof ROLE_STYLES] ?? ROLE_STYLES.user}`}>
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-medium tabular-nums">{user.points.toLocaleString("de-DE")}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 tabular-nums">
                      {user._count.eventRegistrations}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserRoleManager userId={user.id} currentRole={user.role} />
                        <PointsManager userId={user.id} userName={user.username ?? user.name ?? "?"} />
                      </div>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
