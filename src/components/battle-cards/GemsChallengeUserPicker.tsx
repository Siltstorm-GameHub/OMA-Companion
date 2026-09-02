"use client";

// ============================================
// OMA Gems — Ghost-Angriff auf einen anderen Nutzer
// ============================================
// Wie ChallengeUserPicker.tsx (Nutzer suchen), aber OHNE Annahme-Schritt: der
// Kampf startet sofort gegen einen KI-gesteuerten Nachbau der AKTUELLEN
// Aufstellung des Ziels — der Angegriffene muss nicht online sein oder
// reagieren. Sieg öffnet eine Sieges-Kiste (siehe gems-pvp.ts).

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Search, Gem, X } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import LiveBattleView from "./LiveBattleView";
import MatchupBadge from "./MatchupBadge";
import type { MatchupStrength } from "@/lib/battle-cards/matchup-strength";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number };

const uname = (u: UserLite) => u.username ?? u.name ?? "?";

export default function GemsChallengeUserPicker() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [selected, setSelected] = useState<UserLite | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [matchup, setMatchup] = useState<MatchupStrength | null>(null);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!selected) { setMatchup(null); return; }
    let cancelled = false;
    fetch(`/api/battle-cards/matchup?opponentId=${selected.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setMatchup(data?.strength ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected]);

  async function attack() {
    if (submitting || !selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/battle-cards/gems-pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
        return;
      }
      setLiveBattleId(data.id);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  if (liveBattleId && session?.user?.id) {
    return (
      <LiveBattleView
        liveBattleId={liveBattleId}
        viewerId={session.user.id}
        onExit={() => { setLiveBattleId(null); setSelected(null); setQuery(""); }}
      />
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "linear-gradient(180deg, #0f2418 0%, #0a1a10 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1.5px rgba(52,211,153,0.35), 0 3px 0 #065f46",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Gem className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">OMA Gems: Ghost-Angriff</p>
          <p className="text-[10px] text-gray-500">Sofortiger Kampf gegen die aktuelle Aufstellung — kein Warten nötig</p>
        </div>
      </div>

      {selected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <RankedAvatar rankPoints={selected.rankPoints} src={selected.image} alt={uname(selected)} size={24} className="w-6 h-6" />
            <span className="flex-1 text-sm text-white truncate">{uname(selected)}</span>
            <MatchupBadge strength={matchup} />
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={attack}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-black text-sm font-black uppercase tracking-wide active:translate-y-0.5 transition-transform disabled:opacity-40"
            style={{
              background: "linear-gradient(180deg, #6ee7b7 0%, #10b981 55%, #047857 100%)",
              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), 0 3px 0 #065f46",
            }}
          >
            <Gem className="w-3.5 h-3.5" /> {submitting ? "Startet…" : "Angreifen"}
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nutzer suchen…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full glass-heavy rounded-xl overflow-hidden border border-white/10">
              {results.map(u => (
                <button key={u.id} onClick={() => { setSelected(u); setResults([]); setQuery(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.06] text-left">
                  <RankedAvatar rankPoints={u.rankPoints} src={u.image} alt={uname(u)} size={24} className="w-6 h-6" />
                  <span className="text-sm text-white truncate">{uname(u)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
