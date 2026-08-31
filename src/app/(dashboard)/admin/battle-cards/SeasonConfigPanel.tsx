"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Play, Loader2 } from "lucide-react";
import type { SeasonConfig } from "@/lib/season/season-config";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE");
}

export function SeasonConfigPanel({ initial }: { initial: SeasonConfig }) {
  const [config, setConfig] = useState(initial);
  const [dateInput, setDateInput] = useState(initial.season1StartAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  async function saveDate() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/battle-cards/season", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season1StartAt: dateInput ? new Date(dateInput).toISOString() : null }),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data: SeasonConfig = await res.json();
      setConfig(data);
      toast.success("Startdatum gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  async function runPreSeason() {
    if (
      !confirm(
        "PreSeason jetzt starten? Das klassifiziert ALLE Community-Mitglieder anhand ihrer bisherigen Aktivität neu (Klasse + Aktivitäts-Stufe). Manuell fixierte Felder (overriddenFields) bleiben unangetastet."
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/admin/battle-cards/run-preseason", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler beim Ausführen"); return; }
      setLastRunSummary(
        `${data.totalMembers} Mitglieder, ${data.cardsBackfilled} neue Karten angelegt, ${data.updatedCount} Karten neu eingestuft.`
      );
      toast.success("PreSeason abgeschlossen");
      setConfig((c) => ({ ...c, preSeasonRanAt: new Date().toISOString() }));
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Saison 1 — Startdatum</p>
        <p className="text-xs text-gray-500">
          Ab diesem Datum läuft die automatische Klassen-/Stats-Anpassung UND ein kompletter Reset aller
          Karten in Besitz — jeder startet wieder bei 0 (Start-Pack erneut wählen). Dieser Zeitpunkt ist zugleich
          der Startschuss der Ranglisten-Saison 1: danach läuft automatisch alle 3 Monate eine neue Saison,
          jeweils mit Platz-1-3-Belohnung (siehe unten) — ohne dass Kämpfe/Karten dabei nochmal zurückgesetzt werden.
          Aktuell: <span className="text-gray-300">{formatDate(config.season1StartAt)}</span>
        </p>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={saveDate}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
        {config.season1RanAt && (
          <p className="text-[11px] text-gray-600">Saison 1 automatisch ausgelöst am {formatDate(config.season1RanAt)}</p>
        )}
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">PreSeason</p>
        <p className="text-xs text-gray-500">
          Einmaliger Sofort-Lauf: klassifiziert alle Mitglieder jetzt schon anhand der bisherigen Aktivität, statt
          bis zum Saison-1-Start zu warten. Legt außerdem fehlende Karten für neue Mitglieder nach.
        </p>
        {config.preSeasonRanAt && (
          <p className="text-[11px] text-emerald-400">Zuletzt ausgeführt: {formatDate(config.preSeasonRanAt)}</p>
        )}
        {lastRunSummary && <p className="text-[11px] text-gray-400">{lastRunSummary}</p>}
        <button
          onClick={runPreSeason}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Läuft…" : "PreSeason jetzt starten"}
        </button>
      </div>
    </div>
  );
}
