"use client";

// ============================================
// Battle-Cards-Herausforderungen — Liste + Annehmen/Ablehnen
// ============================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Check, X, Eye, Swords } from "lucide-react";

interface ChallengeUser {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
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
              <div key={c.id} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {c.challenger?.image && (
                    <Image
                      src={c.challenger.image}
                      alt={displayName(c.challenger)}
                      width={32}
                      height={32}
                      className="rounded-full shrink-0"
                    />
                  )}
                  <p className="text-sm text-white truncate">
                    <span className="font-semibold">{displayName(c.challenger)}</span> fordert dich heraus
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
              <div key={c.id} className="glass rounded-xl p-3 flex items-center gap-2.5">
                {c.opponent?.image && (
                  <Image
                    src={c.opponent.image}
                    alt={displayName(c.opponent)}
                    width={32}
                    height={32}
                    className="rounded-full shrink-0"
                  />
                )}
                <p className="text-sm text-white truncate">
                  Wartet auf Antwort von <span className="font-semibold">{displayName(c.opponent)}</span>
                </p>
              </div>
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
