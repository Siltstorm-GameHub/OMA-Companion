"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Play, Loader2, RotateCcw } from "@/components/icons";
import type { SeasonConfig } from "@/lib/season/season-config";
import { formatBerlinDateTime, getBerlinDateParts, fromDatetimeLocalBerlin } from "@/lib/time";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return formatBerlinDateTime(iso);
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const { year, month, day } = getBerlinDateParts(iso);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function SeasonConfigPanel({ initial }: { initial: SeasonConfig }) {
  const [config, setConfig] = useState(initial);
  const [dateInput, setDateInput] = useState(toDateInputValue(initial.season1StartAt));
  const [eloResetDateInput, setEloResetDateInput] = useState(toDateInputValue(initial.eloHardResetAt));
  const [saving, setSaving] = useState(false);
  const [savingEloReset, setSavingEloReset] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  async function saveDate() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/battle-cards/season", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season1StartAt: dateInput ? fromDatetimeLocalBerlin(dateInput + "T00:00").toISOString() : null }),
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

  async function saveEloHardReset() {
    if (
      eloResetDateInput &&
      !confirm(
        "Elo-Hard-Reset für dieses Datum planen? Sobald der Cron das Datum erreicht, werden ALLE Elo-Ratings (OMA Duels + OMA Gems) und Platzierungs-Zähler auf den Startwert zurückgesetzt — im Gegensatz zum sanften Saison-Reset."
      )
    ) {
      return;
    }
    setSavingEloReset(true);
    try {
      const res = await fetch("/api/admin/battle-cards/season", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eloHardResetAt: eloResetDateInput ? fromDatetimeLocalBerlin(eloResetDateInput + "T00:00").toISOString() : null }),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data: SeasonConfig = await res.json();
      setConfig(data);
      toast.success(eloResetDateInput ? "Hard-Reset-Datum gespeichert" : "Hard-Reset-Datum entfernt");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSavingEloReset(false);
    }
  }

  async function runPreSeason() {
    if (
      !confirm(
        "PreSeason jetzt starten? Das legt fehlende Helden-Karten an und setzt für ALLE Community-Mitglieder die Aktivitäts-Stufe anhand ihrer bisherigen Aktivität neu. Klasse, Werte und Aussehen der Helden bleiben unverändert — die wählen und würfeln die Mitglieder selbst."
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
        `${data.totalMembers} Mitglieder, ${data.cardsBackfilled} neue Helden-Karten angelegt, ${data.updatedCount} Aktivitäts-Stufen aktualisiert.`
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
          Ab diesem Datum werden die Aktivitäts-Stufen neu gesetzt UND alle Karten in Besitz sowie der
          Kampagnen-Fortschritt komplett zurückgesetzt — jeder startet wieder bei 0 (Start-Pack aus Held + 4
          Karten erneut wählen, Kampagne wieder ab Kapitel 1). Der Held selbst (Aussehen, Klasse, Werte,
          Untertitel) bleibt erhalten. Nicht zurückgesetzt werden Elo, Kampfhistorie und Taktik-Karten.
          Dieser Zeitpunkt ist zugleich
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
          Einmaliger Sofort-Lauf: setzt die Aktivitäts-Stufe aller Mitglieder jetzt schon anhand der bisherigen
          Aktivität (Events + Quests), statt bis zum Saison-1-Start zu warten, und legt fehlende Helden-Karten
          für neue Mitglieder nach. Die Klasse kommt nicht mehr aus der Aktivität: jedes Mitglied wählt sie in
          der Helden-Einrichtung selbst und würfelt seine Werte — die PreSeason ändert daran nichts.
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

      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Elo Hard-Reset</p>
        <p className="text-xs text-gray-500">
          Am regulären Saisonende wird jedes Elo-Rating (OMA Duels + OMA Gems, getrennt) automatisch nur sanft
          zur Basis hin zurückgezogen — Konstanz bleibt spürbar. Für Sonderfälle (z.B. großer Balance-Patch)
          lässt sich hier zusätzlich ein einmaliger KOMPLETTER Reset auf ein festes Datum legen: sobald der
          tägliche Cron dieses Datum erreicht, gehen alle Ratings + Platzierungs-Zähler auf den Startwert zurück.
          Aktuell: <span className="text-gray-300">{formatDate(config.eloHardResetAt)}</span>
        </p>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={eloResetDateInput}
            onChange={(e) => setEloResetDateInput(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={saveEloHardReset}
            disabled={savingEloReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {savingEloReset ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {savingEloReset ? "Speichert…" : "Hard-Reset planen"}
          </button>
        </div>
        {config.eloHardResetRanAt && (
          <p className="text-[11px] text-gray-600">Zuletzt ausgeführt am {formatDate(config.eloHardResetRanAt)}</p>
        )}
      </div>
    </div>
  );
}
