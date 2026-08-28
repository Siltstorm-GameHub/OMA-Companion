"use client";

// Startet einen Übungskampf über /api/battles/demo und zeigt danach den
// Kampf-Screen mit dem zurückgegebenen Log. Sorgt bei Bedarf serverseitig
// für ein Starter-Deck (siehe lib/battle-cards/starter-deck.ts).

import { useState } from "react";
import { Swords, Loader2 } from "lucide-react";
import BattleScreen from "./BattleScreen";
import type { BattleLogEntry, RosterEntry } from "@/lib/battle-engine/types";

interface DemoBattleResponse {
  roster: RosterEntry[];
  log: BattleLogEntry[];
}

export default function DemoBattleLauncher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [battle, setBattle] = useState<DemoBattleResponse | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battles/demo", { method: "POST" });
      if (!res.ok) throw new Error("Kampf konnte nicht gestartet werden.");
      const data: DemoBattleResponse = await res.json();
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
          ← Zurück zum Katalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
        Übungskampf starten
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
