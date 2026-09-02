"use client";

// ============================================
// Battle-Cards-Herausforderungen — direkt einen Nutzer suchen & herausfordern
// ============================================
// Ergänzt den Herausforderungs-Button auf Profilen: hier auf der Übersichtsseite
// kann man ohne Umweg über ein Profil direkt einen beliebigen Nutzer suchen und
// herausfordern (nutzt dieselbe /api/battle-cards/challenges-Route).

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Swords, X } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import MatchupBadge from "./MatchupBadge";
import type { MatchupStrength } from "@/lib/battle-cards/matchup-strength";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number };

const uname = (u: UserLite) => u.username ?? u.name ?? "?";

export default function ChallengeUserPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [selected, setSelected] = useState<UserLite | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [matchup, setMatchup] = useState<MatchupStrength | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&challengeable=1`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!selected) {
      setMatchup(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/battle-cards/matchup?opponentId=${selected.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setMatchup(data?.strength ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected]);

  async function challenge() {
    if (submitting || !selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/battle-cards/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
        return;
      }
      toast.success(`Herausforderung an ${uname(selected)} gesendet!`);
      setSelected(null);
      setQuery("");
      setResults([]);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "linear-gradient(180deg, #1c1826 0%, #14121b 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1.5px rgba(167,139,250,0.35), 0 3px 0 #4c1d95",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Swords className="w-4 h-4 text-violet-400" />
        </div>
        <p className="text-sm font-semibold text-white">Nutzer direkt herausfordern</p>
      </div>

      {selected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
            <RankedAvatar rankPoints={selected.rankPoints} src={selected.image} alt={uname(selected)} size={24} className="w-6 h-6" />
            <span className="flex-1 text-sm text-white truncate">{uname(selected)}</span>
            <MatchupBadge strength={matchup} />
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={challenge}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-black uppercase tracking-wide active:translate-y-0.5 transition-transform disabled:opacity-40"
            style={{
              background: "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 55%, #4c1d95 100%)",
              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #3b0764",
            }}
          >
            <Swords className="w-3.5 h-3.5" /> {submitting ? "Sendet…" : "Herausfordern"}
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nutzer suchen…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
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
