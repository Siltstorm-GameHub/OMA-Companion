"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, UserMinus, Crown, Shield } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Membership = { id: string; userId: string; role: string; user: User };

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const userName = (u: User) => u.username ?? u.name ?? "?";

function Avatar({ u }: { u: User }) {
  if (u.image) return <img src={u.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
      {userName(u)[0]?.toUpperCase()}
    </div>
  );
}

/** Roster-Verwaltung eines Squads — wiederverwendet im Admin-Bereich (Moderator/Admin) und auf der
 *  öffentlichen Squad-Seite (Captain des jeweiligen Squads). Beide Aufrufer haben die Berechtigung
 *  bereits serverseitig geprüft (requireRole bzw. requireModeratorOrSquadCaptain) — hier keine
 *  weitere Rechteprüfung nötig, nur Rendering + API-Calls. */
export default function SquadRosterManager({
  squadId, memberships, allUsers,
}: {
  squadId: string;
  memberships: Membership[];
  allUsers: User[];
}) {
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole]     = useState<"member" | "captain">("member");

  const memberUserIds = new Set(memberships.map(m => m.userId));
  const addableUsers = allUsers.filter(u => !memberUserIds.has(u.id));

  async function addMember() {
    if (!addUserId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/squads/${squadId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addUserId, role: addRole }),
    });
    setLoading(false);
    if (res.ok) { setAddUserId(""); setAddRole("member"); toast.success("Mitglied hinzugefügt"); router.refresh(); }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler beim Hinzufügen"); }
  }

  async function toggleCaptain(m: Membership) {
    const nextRole = m.role === "captain" ? "member" : "captain";
    setLoading(true);
    const res = await fetch(`/api/admin/squads/${squadId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.userId, role: nextRole }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(nextRole === "captain" ? `${userName(m.user)} ist jetzt Captain` : `${userName(m.user)} ist kein Captain mehr`);
      router.refresh();
    } else toast.error("Fehler");
  }

  async function removeMember(m: Membership) {
    if (!(await confirm({ title: "Mitglied entfernen", description: `"${userName(m.user)}" wirklich aus dem Squad entfernen?`, variant: "danger" }))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/squads/${squadId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.userId }),
    });
    setLoading(false);
    if (res.ok) { toast.success(`${userName(m.user)} entfernt`); router.refresh(); }
    else toast.error("Fehler beim Entfernen");
  }

  return (
    <div className="space-y-3">
      {ConfirmDialogElement}
      <div className="space-y-1.5">
        {memberships.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <Avatar u={m.user} />
            <span className="text-sm text-white flex-1 truncate">{userName(m.user)}</span>
            {m.role === "captain" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 shrink-0">
                <Crown className="w-3 h-3" /> Captain
              </span>
            )}
            <button onClick={() => toggleCaptain(m)} disabled={loading}
              title={m.role === "captain" ? "Captain-Status entfernen" : "Zum Captain machen"}
              className={`p-1.5 rounded transition-colors shrink-0 ${
                m.role === "captain" ? "text-amber-400 hover:text-amber-300" : "text-gray-600 hover:text-amber-400"
              }`}>
              <Shield className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => removeMember(m)} disabled={loading}
              title="Aus Squad entfernen"
              className="p-1.5 rounded text-gray-600 hover:text-red-400 transition-colors shrink-0">
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {memberships.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-4">Noch keine Mitglieder.</p>
        )}
      </div>

      {/* Mitglied hinzufügen */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
        <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
          className={`${inputCls} flex-1 min-w-[180px]`}>
          <option value="">– User auswählen –</option>
          {addableUsers.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
        </select>
        <select value={addRole} onChange={e => setAddRole(e.target.value as "member" | "captain")}
          className="rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors">
          <option value="member">Mitglied</option>
          <option value="captain">Captain</option>
        </select>
        <button onClick={addMember} disabled={loading || !addUserId}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-teal-300 border border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50 hover:bg-teal-500/10 transition-colors disabled:opacity-50">
          <UserPlus className="w-4 h-4" /> Hinzufügen
        </button>
      </div>
    </div>
  );
}
