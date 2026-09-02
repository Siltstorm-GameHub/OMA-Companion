"use client";

// ============================================
// OMA Gems Turnier-Banner — Countdown + Score-Attack-Start + Mini-Rangliste
// ============================================
// Erscheint automatisch, sobald ein Admin im Event-Admin-Bereich ein Event mit
// Spiel "OMA Gems" angelegt hat (siehe EventSetupWizard.tsx / gems-tournament.ts).
// Vor Turnierstart: Countdown. Während des Fensters: Kampf-Button + Rangliste.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Gem, Loader2, Trophy } from "lucide-react";
import CountdownBadge from "@/components/CountdownBadge";
import RankedAvatar from "@/components/RankedAvatar";
import LiveBattleView from "./LiveBattleView";

interface TournamentData {
  id: string;
  eventId: string;
  title: string;
  startAt: string;
  endAt: string;
  maxAttemptsPerUser: number;
  attemptsUsed: number;
  bestScore: number;
  topRows: { userId: string; name: string; image: string | null; bestScore: number }[];
}

export default function GemsTournamentBanner() {
  const { data: session } = useSession();
  const [tournament, setTournament] = useState<TournamentData | null | undefined>(undefined);
  const [starting, setStarting] = useState(false);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/battle-cards/gems-tournament/current");
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  async function start() {
    if (!tournament || starting) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/battle-cards/gems-tournament/${tournament.id}/battle`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Kampf konnte nicht gestartet werden.");
        return;
      }
      setLiveBattleId(data.id);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setStarting(false);
    }
  }

  if (liveBattleId && session?.user?.id) {
    return (
      <LiveBattleView
        liveBattleId={liveBattleId}
        viewerId={session.user.id}
        onExit={() => { setLiveBattleId(null); load(); }}
      />
    );
  }

  if (!tournament) return null; // kein Turnier aktiv, oder noch am Laden

  const now = Date.now();
  const hasStarted = now >= new Date(tournament.startAt).getTime();
  const attemptsLeft = tournament.maxAttemptsPerUser - tournament.attemptsUsed;

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "linear-gradient(180deg, #1e1b2e 0%, #14101f 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1.5px rgba(167,139,250,0.35), 0 3px 0 #4c1d95",
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{tournament.title}</p>
            <p className="text-[10px] text-gray-500">OMA Gems Turnier — Score-Attack gegen dasselbe Gegner-Team</p>
          </div>
        </div>
        <CountdownBadge endsAt={hasStarted ? tournament.endAt : tournament.startAt} label={hasStarted ? "Endet in" : "Startet in"} />
      </div>

      {hasStarted && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">
              Bester Score: <span className="text-white font-semibold">{tournament.bestScore}</span>
              {" · "}
              {attemptsLeft > 0
                ? `${attemptsLeft}/${tournament.maxAttemptsPerUser} Versuche übrig`
                : "Keine Versuche mehr übrig"}
            </p>
          </div>
          <button
            type="button"
            onClick={start}
            disabled={starting || attemptsLeft <= 0}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-black uppercase tracking-wide active:translate-y-0.5 transition-transform disabled:opacity-40"
            style={{
              background: "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 55%, #4c1d95 100%)",
              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 #3b0764",
            }}
          >
            {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gem className="w-3.5 h-3.5" />}
            {starting ? "Startet…" : "Jetzt kämpfen"}
          </button>

          {tournament.topRows.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Bestenliste</p>
              {tournament.topRows.map((row, i) => (
                <div key={row.userId} className="flex items-center gap-2.5 text-xs">
                  <span className="w-4 text-center text-gray-500 font-bold shrink-0">{i + 1}</span>
                  <RankedAvatar rankPoints={0} src={row.image} alt={row.name} size={20} className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-gray-300 truncate">{row.name}</span>
                  <span className="text-white font-semibold shrink-0">{row.bestScore}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
