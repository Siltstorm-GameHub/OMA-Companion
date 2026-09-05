"use client";

// ============================================
// Battle-Cards-Herausforderungen — Liste + Annehmen/Ablehnen
// ============================================

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, Clock, Swords, Mail } from "lucide-react";
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
  liveBattleId: string | null;
  winnerId: string | null;
  createdAt: string;
  challenger?: ChallengeUser;
  opponent?: ChallengeUser;
}

function displayName(u?: ChallengeUser) {
  return u?.username ?? u?.name ?? "Unbekannt";
}

function PlayerBadge({ user, accent }: { user?: ChallengeUser; accent: string }) {
  return (
    <Link
      href={user?.id ? `/profile/${user.id}` : "#"}
      className="flex flex-col items-center gap-1.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
    >
      <span
        className="rounded-full p-0.5"
        style={{ boxShadow: `0 0 0 1.5px ${accent}88, 0 0 10px ${accent}44` }}
      >
        <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={displayName(user)} size={40} className="w-10 h-10" />
      </span>
      <span className="font-battle text-xs text-white truncate max-w-[92px]">{displayName(user)}</span>
    </Link>
  );
}

/** Battle-Card-artige "Herausforderer vs. Herausgeforderter"-Darstellung — gleicher
 *  Zuschnitt/Glow-Look wie die Sammelkarten (siehe CardTile), damit Herausforderungen
 *  sich optisch in die OMA-Battle-Cards-Optik statt in ein generisches Panel einfügen. */
function VsCard({
  challenger,
  opponent,
  footer,
  accent,
}: {
  challenger?: ChallengeUser;
  opponent?: ChallengeUser;
  footer: ReactNode;
  accent: string;
}) {
  return (
    <div
      className="card-cut-sm relative p-3 space-y-3"
      style={{
        background: `linear-gradient(160deg, ${accent}33, rgba(12,12,16,0.92))`,
        boxShadow: `0 0 0 1.5px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 14px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="flex items-center justify-center gap-3">
        <PlayerBadge user={challenger} accent={accent} />
        <span className="font-battle text-xs font-black shrink-0" style={{ color: accent }}>
          vs.
        </span>
        <PlayerBadge user={opponent} accent={accent} />
      </div>
      {footer}
    </div>
  );
}

export default function ChallengesList({
  incoming,
  outgoing,
  live = [],
}: {
  incoming: ChallengeItem[];
  outgoing: ChallengeItem[];
  live?: ChallengeItem[];
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
      if (action === "decline") {
        toast.success("Herausforderung abgelehnt.");
        router.refresh();
        return;
      }
      if (data.challenge?.liveBattleId) {
        router.push(`/battle-cards/live/${data.challenge.liveBattleId}`);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-battle text-[10px] text-teal-300/80 uppercase tracking-widest">Laufende Kämpfe</h2>
          <div className="space-y-2">
            {live.map((c) => (
              <VsCard
                key={c.id}
                challenger={c.challenger}
                opponent={c.opponent}
                accent="#14b8a6"
                footer={
                  <div className="flex justify-center">
                    <Link
                      href={c.liveBattleId ? `/battle-cards/live/${c.liveBattleId}` : "#"}
                      className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide px-4 py-1.5 rounded-full text-white transition-transform active:scale-95"
                      style={{
                        background: "linear-gradient(180deg, #5eead4 0%, #14b8a6 55%, #0f766e 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.2), 0 2px 0 #115e59",
                      }}
                    >
                      <Swords className="w-3.5 h-3.5" /> Weiterspielen
                    </Link>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-battle text-[10px] text-rose-300/80 uppercase tracking-widest">
            Eingehende Herausforderungen
          </h2>
          <div className="space-y-2">
            {incoming.map((c) => (
              <VsCard
                key={c.id}
                challenger={c.challenger}
                opponent={c.opponent}
                accent="#fb7185"
                footer={
                  <div className="space-y-2">
                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-rose-200/70">
                      <Mail className="w-3 h-3 shrink-0" /> Muss noch angenommen werden
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => respond(c.id, "accept")}
                        disabled={busyId === c.id}
                        className="flex items-center gap-1 text-xs font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full text-white disabled:opacity-40 transition-transform active:scale-95"
                        style={{
                          background: "linear-gradient(180deg, #6ee7b7 0%, #10b981 55%, #047857 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.2), 0 2px 0 #065f46",
                        }}
                      >
                        <Check className="w-3.5 h-3.5" /> Annehmen
                      </button>
                      <button
                        onClick={() => respond(c.id, "decline")}
                        disabled={busyId === c.id}
                        className="flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Ablehnen
                      </button>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-battle text-[10px] text-violet-300/80 uppercase tracking-widest">
            Gesendete Herausforderungen
          </h2>
          <div className="space-y-2">
            {outgoing.map((c) => (
              <VsCard
                key={c.id}
                challenger={c.challenger}
                opponent={c.opponent}
                accent="#8b5cf6"
                footer={
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-violet-200/70">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> Wartet auf Antwort von {displayName(c.opponent)}
                  </p>
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
