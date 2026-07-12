"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserX, History } from "lucide-react";
import { ROLE_LABELS, ROLE_STYLES } from "@/lib/roles";
import UserPointsHistoryModal from "@/components/UserPointsHistoryModal";

type Role = "user" | "moderator" | "admin";

interface UserRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  role: string;
  points: number;
  discordId: string | null;
  hasLogin: boolean;
  eventCount: number;
}

interface Props {
  users: UserRow[];
  loginCount: number;
  noLoginCount: number;
  firstNoLoginIdx: number;
}

export default function AdminUsersClient({ users, loginCount, noLoginCount, firstNoLoginIdx }: Props) {
  const router = useRouter();

  // Single modal state — only one open at a time
  const [modalUser, setModalUser] = useState<{ id: string; name: string; image: string | null } | null>(null);

  // Role change — per-row but lightweight (no component per row, just a handler)
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>(
    () => Object.fromEntries(users.map(u => [u.id, u.role]))
  );

  const handleRoleChange = useCallback(async (userId: string, newRole: Role) => {
    setRoleLoading(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    setRoles(r => ({ ...r, [userId]: newRole }));
    setRoleLoading(null);
    router.refresh();
  }, [router]);

  return (
    <>
      <div className="glass card-shine rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05] text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Nutzer</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Discord ID</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Rolle</th>
              <th className="text-center px-4 py-3 font-medium">Münzen</th>
              <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Events</th>
              <th className="text-left px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map((user, idx) => {
              const isFirstNoLogin = idx === firstNoLoginIdx;
              const currentRole = roles[user.id] ?? user.role;
              return (
                <>
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
                  <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors ${!user.hasLogin ? "opacity-60" : ""}`}>
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt=""
                            loading="lazy"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-600/40 flex items-center justify-center text-xs font-semibold text-rose-300 shrink-0">
                            {(user.username ?? user.name ?? "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{user.username ?? user.name ?? "–"}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email ?? <span className="text-gray-700 italic">Kein Login</span>}</p>
                        </div>
                      </div>
                    </td>

                    {/* Discord ID */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600 font-mono">{user.discordId ?? "–"}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {user.hasLogin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <LogIn className="w-3 h-3" /> Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-600 border border-white/[0.06]">
                          <UserX className="w-3 h-3" /> Ausstehend
                        </span>
                      )}
                    </td>

                    {/* Rolle */}
                    <td className="px-4 py-3">
                      <select
                        value={currentRole}
                        onChange={e => handleRoleChange(user.id, e.target.value as Role)}
                        disabled={roleLoading === user.id}
                        className="text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="user">Mitglied</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/* Münzen */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-medium tabular-nums">{user.points.toLocaleString("de-DE")}</span>
                    </td>

                    {/* Events */}
                    <td className="px-4 py-3 text-center text-gray-400 tabular-nums hidden sm:table-cell">
                      {user.eventCount}
                    </td>

                    {/* Aktionen */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModalUser({ id: user.id, name: user.username ?? user.name ?? "?", image: user.image })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/15 transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        Verlauf
                      </button>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Single modal instance — only rendered once */}
      {modalUser && (
        <UserPointsHistoryModal
          key={modalUser.id}
          userId={modalUser.id}
          userName={modalUser.name}
          userImage={modalUser.image}
          defaultOpen
          onClose={() => setModalUser(null)}
        />
      )}
    </>
  );
}
