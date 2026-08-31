"use client";

// ============================================
// Battle-Cards-Herausforderungen — Liste + Annehmen/Ablehnen
// ============================================

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, Eye, Swords, Clock } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";

interface ChallengeUser {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  rankPoints: number;
}

export interface ChallengeItem {
  id: string;
  status: string;
  challengerId: string;
  opponentId: string;
  battleId: string | null;
  winnerId: string | null;
  createdAt: string;
  challenger?: ChallengeUser;
  opponent?: ChallengeUser;
}

function displayName(u?: ChallengeUser) {
  return u?.username ?? u?.name ?? "Unbekannt";
}

function PlayerBadge({ user }: { user?: ChallengeUser }) {
  return (
    <Link
      href={user?.id ? `/profile/${user.id}` : "#"}
      className="flex flex-col items-center gap-1.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
    >
      <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={displayName(user)} size={40} className="w-10 h-10" />
      <span className="text-xs text-white font-semibold truncate max-w-[92px]">{displayName(user)}</span>
    </Link>
  );
}

/** Einheitliche "Herausforderer vs. Herausgeforderter"-Darstellung für offene Herausforderungen. */
function VsCard({
  challenger,
  opponent,
  footer,
}: {
  challenger?: ChallengeUser;
  opponent?: ChallengeUser;
  footer: ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-center gap-3">
        <PlayerBadge user={challenger} />
        <span className="text-xs font-black text-gray-600 shrink-0">vs.</span>
        <PlayerBadge user={opponent} />
      </div>
      {footer}
    </div>
  );
}

export default function ChallengesList({
  viewerId,
  incoming,
  outgoing,
  history,
}: {
  viewerId: string;
  incoming: ChallengeItem[];
  outgoing: ChallengeItem[];
  history: ChallengeItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function respond(id: string, action: "accept" | "decline") {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/battle-cards/challenges/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
        return;
      }
      if (action === "decline") toast.success("Herausforderung abgelehnt.");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          Eingehende Herausforderungen
        </h2>
        {incoming.length === 0 ? (
          <p className="text-xs text-gray-600">Keine offenen Herausforderungen.</p>
        ) : (
          <div className="space-y-2">
            {incoming.map((c) => (
              <VsCard
                key={c.id}
                challenger={c.challenger}
                opponent={c.opponent}
                footer={
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 text-center">Muss noch angenommen werden</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => respond(c.id, "accept")}
                        disabled={busyId === c.id}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Annehmen
                      </button>
                      <button
                        onClick={() => respond(c.id, "decline")}
                        disabled={busyId === c.id}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Ablehnen
                      </button>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          Gesendete Herausforderungen
        </h2>
        {outgoing.length === 0 ? (
          <p className="text-xs text-gray-600">Keine offenen Herausforderungen gesendet.</p>
        ) : (
          <div className="space-y-2">
            {outgoing.map((c) => (
              <VsCard
                key={c.id}
                challenger={c.challenger}
                opponent={c.opponent}
                footer={
                  <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> Wartet auf Antwort von {displayName(c.opponent)}
                  </p>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Verlauf</h2>
        {history.length === 0 ? (
          <p className="text-xs text-gray-600">Noch keine vergangenen Herausforderungen.</p>
        ) : (
          <div className="space-y-2">
            {history.map((c) => {
              const opponent = c.challengerId === viewerId ? c.opponent : c.challenger;
              const won = c.winnerId === viewerId;
              const lost = c.status === "resolved" && c.winnerId && c.winnerId !== viewerId;
              return (
                <div key={c.id} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Swords className="w-4 h-4 text-gray-600 shrink-0" />
                    <p className="text-sm text-gray-300 truncate">
                      vs. <span className="font-semibold text-white">{displayName(opponent)}</span>
                      {c.status === "declined" && <span className="text-gray-500"> — abgelehnt</span>}
                      {won && <span className="text-emerald-400"> — gewonnen</span>}
                      {lost && <span className="text-rose-400"> — verloren</span>}
                      {c.status === "resolved" && !c.winnerId && <span className="text-gray-500"> — unentschieden</span>}
                    </p>
                  </div>
                  {c.battleId && (
                    <Link
                      href={`/battle-cards/battles/${c.battleId}`}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ansehen
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
