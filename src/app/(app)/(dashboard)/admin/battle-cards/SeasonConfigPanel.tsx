"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Loader2 } from "@/components/icons";
import type { SeasonConfig } from "@/lib/season/season-config";
import { formatBerlinDateTime } from "@/lib/time";

// Seit der Reduktion auf OMA Gems gibt es keine Saison-1-Rücksetzung, Ranglisten-Saisons oder Elo mehr.
// Übrig bleibt der manuelle Lauf, der die Aktivitäts-Stufen der Community-Karten neu berechnet und
// fehlende Community-Karten für neue Mitglieder anlegt (siehe lib/season/run-season.ts).
export function SeasonConfigPanel({ initial }: { initial: SeasonConfig }) {
  const [ranAt, setRanAt] = useState(initial.preSeasonRanAt);
  const [running, setRunning] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  async function runUpdate() {
    if (!confirm("Aktivitäts-Stufen aller Community-Karten jetzt neu berechnen?")) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/battle-cards/run-preseason", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler beim Ausführen"); return; }
      setLastRunSummary(
        `${data.totalMembers} Mitglieder, ${data.cardsBackfilled} neue Community-Karten angelegt, ${data.updatedCount} Aktivitäts-Stufen aktualisiert.`
      );
      toast.success("Aktivitäts-Stufen aktualisiert");
      setRanAt(new Date().toISOString());
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Aktivitäts-Stufen</p>
      <p className="text-xs text-gray-500">
        Setzt die Aktivitäts-Stufe (Geist bis Old Master) aller Community-Karten anhand der bisherigen
        Aktivität (Events + Quests) neu und legt fehlende Community-Karten für neue Mitglieder an. Klasse
        und Werte der Karten bleiben unverändert.
      </p>
      {ranAt && <p className="text-[11px] text-emerald-400">Zuletzt ausgeführt: {formatBerlinDateTime(ranAt)}</p>}
      {lastRunSummary && <p className="text-[11px] text-gray-400">{lastRunSummary}</p>}
      <button
        onClick={runUpdate}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? "Läuft…" : "Jetzt neu berechnen"}
      </button>
    </div>
  );
}
