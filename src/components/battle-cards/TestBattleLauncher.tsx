"use client";

// ============================================
// Testkampf — nur für Admins/Moderatoren sichtbar
// ============================================
// Dient zum Ausprobieren/Debuggen des Kampfsystems während der
// Entwicklungsphase: eigene Startaufstellung gegen 5 zufällige
// Standard-Karten (NPC). Kein Fortschritt/Belohnung für reguläre User.

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import BattleScreen from "./BattleScreen";
import type { BattleLogEntry, RosterEntry } from "@/lib/battle-engine/types";

interface TestBattleResponse {
  roster: RosterEntry[];
  log: BattleLogEntry[];
}

export default function TestBattleLauncher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [battle, setBattle] = useState<TestBattleResponse | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battle-cards/test-battle", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Testkampf konnte nicht gestartet werden.");
      }
      setBattle(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  if (battle) {
    return (
      <div className="space-y-2">
        <BattleScreen roster={battle.roster} log={battle.log} />
        <button
          type="button"
          onClick={() => setBattle(null)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Testkampf schließen
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-3 space-y-2 border border-amber-500/20">
      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
        <FlaskConical className="w-3.5 h-3.5" /> Entwickler-Testkampf
      </p>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
        Testkampf gegen 5 NPC-Karten starten
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
