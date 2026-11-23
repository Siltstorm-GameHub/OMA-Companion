"use client";
import { useState } from "react";
import CommunityGoalEditor from "@/components/CommunityGoalEditor";
import StatFieldEditor from "@/components/StatFieldEditor";
import { GOAL_FORMATS, goalFieldsFor } from "@/lib/community-goal";
import { TOURNAMENT_FORMATS } from "@/lib/tournament-formats";
import { goalSummary } from "./EventGoalPanel";
import type { EventEdit } from "./useEventEdit";

const formatLabel = (f: string) => TOURNAMENT_FORMATS.find(x => x.value === f)?.label ?? f;
const GOAL_FORMAT_NAMES = [...new Set(GOAL_FORMATS.filter(f => f !== "liga").map(formatLabel))].join(", ");

/**
 * Reiter "🎯 Ziel": die eine Stelle für das Community-Ziel eines Events — Stand, Belohnte und
 * Einstellungen. Einstellungen laufen über die Speicherleiste; "Ziel anlegen" (Event ohne Spielplan)
 * und "Neu auswerten" wirken sofort.
 */
export default function TabGoal({ ctx }: { ctx: EventEdit }) {
  const {
    event, rewardLimits, goalStatus, goalMode, setGoalMode, goalForm, setGoalForm, goalCapable, goalSetupLoading,
    createGoalTracking, reevaluating, reevaluateGoal, resolvedGoal, tmtStatFields, hasTournament, eventKind, endAt, setActiveTab,
  } = ctx;
  // Ziel einrichten ohne Spielplan: Stat-Felder für die neue Werte-Erfassung
  const [setupFields, setSetupFields] = useState<string[]>(["Tore"]);
  const editorProps = {
    rewardLimit: rewardLimits?.goalRewardCoins ?? null,
    seriesPointsLimit: rewardLimits?.goalSeriesPoints ?? null,
    hasEnd: !!endAt,
  };

  return (
    <div className="space-y-4">
      {/* ── Stand ── */}
      {goalStatus && (
        <section aria-label="Stand des Ziels" className="rounded-control border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-primary-fg">Stand: {goalStatus.current} von {goalStatus.target}</p>
            <span className="text-xs text-muted">
              {goalStatus.awaitingApproval ? "Belohnungen erst nach der Freigabe"
                : goalStatus.settled ? (goalStatus.reached ? "Abgerechnet: geschafft 🎉" : "Abgerechnet: verfehlt")
                : goalStatus.reached ? "Geschafft 🎉" : "läuft"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={Math.floor(goalStatus.percent)} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${goalStatus.reached ? "bg-emerald-400" : "bg-primary"}`} style={{ width: `${goalStatus.percent}%` }} />
          </div>
          {goalStatus.rewarded.length > 0 ? (
            <div>
              <p className="text-xs text-subtle mb-1">Belohnt ({goalStatus.rewarded.length})</p>
              <ul className="flex flex-wrap gap-1.5">
                {goalStatus.rewarded.map(r => (
                  <li key={r.id} className="rounded-full bg-line px-2 py-0.5 text-xs text-fg">
                    {r.name}
                    <span className="text-subtle">
                      {r.coins != null && r.coins > 0 ? ` · ${r.coins} Münzen` : ""}{r.seriesPoints > 0 ? ` · ${r.seriesPoints} Tabellenpunkte` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-subtle">Noch niemand belohnt.</p>
          )}
          <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-line">
            <p className="flex-1 min-w-[200px] text-xs text-subtle">
              Einen Wert korrigiert? „Neu auswerten“ bucht die Ziel-Münzen zurück und vergibt sie mit den aktuellen Werten neu.
            </p>
            <button type="button" onClick={reevaluateGoal} disabled={reevaluating}
              className="text-xs font-semibold px-3 py-1.5 rounded-control bg-line hover:bg-line border border-line-strong text-fg disabled:opacity-50">
              {reevaluating ? "Wertet aus…" : "Neu auswerten"}
            </button>
          </div>
        </section>
      )}

      {/* ── Einstellungen ── */}
      {goalCapable ? (
        <section aria-label="Ziel einstellen" className="rounded-control border border-line bg-surface-2/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-fg">Ziel einstellen</h2>
          {event.series ? (
            <div className="flex gap-2 flex-wrap">
              {([
                ["inherit", "Ziel der Reihe", resolvedGoal.seriesGoal ? goalSummary(resolvedGoal.seriesGoal) : "Die Reihe hat (noch) kein Ziel"],
                ["override", "Eigenes Ziel", "Nur für diesen Termin"],
                ["off", "Kein Ziel", "Dieser Termin ohne Ziel"],
              ] as const).map(([value, label, hint]) => (
                <button key={value} type="button" onClick={() => setGoalMode(value)} aria-pressed={goalMode === value}
                  className={`flex-1 min-w-[150px] text-left rounded-control p-2.5 border transition-colors ${
                    goalMode === value ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"
                  }`}>
                  <span className={`block text-sm font-semibold ${goalMode === value ? "text-primary-fg" : "text-fg/90"}`}>{label}</span>
                  <span className="block text-xs text-subtle">{hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <label className="flex items-center gap-2 text-sm text-fg/90 cursor-pointer select-none">
              <input type="checkbox" checked={goalMode === "override"} onChange={e => setGoalMode(e.target.checked ? "override" : "inherit")} className="rounded" />
              Community-Ziel für dieses Event
            </label>
          )}
          {goalMode === "override" && (
            <CommunityGoalEditor value={{ ...goalForm, enabled: true }} onChange={f => setGoalForm({ ...f, enabled: true })}
              statFields={goalFieldsFor(event.format, tmtStatFields)} inSeries={!!event.series} hideToggle {...editorProps} />
          )}
          <p className="text-xs text-subtle">Gespeichert wird über die Leiste unten, zusammen mit den anderen Änderungen.</p>
        </section>
      ) : !hasTournament && eventKind === "community" ? (
        // "Ohne Platzierung" ohne Spielplan: Ziel direkt einrichten (legt eine Werte-Erfassung an)
        <section aria-label="Ziel einrichten" className="rounded-control border border-line bg-surface-2/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-fg">Gemeinsames Ziel einrichten</h2>
          <p className="text-xs text-muted">
            Für ein Ziel werden Werte gezählt, z. B. Tore oder Schritte. Lege fest, welche Werte erfasst werden. Eingetragen
            werden sie danach im Reiter „Spielplan“ (von dir oder per Screenshot-Meldung). Eine Platzierung gibt es weiterhin nicht.
          </p>
          <div>
            <p className="text-xs text-subtle uppercase tracking-wide mb-1.5">Erfasste Werte</p>
            <StatFieldEditor fields={setupFields} onChange={setSetupFields} isAvg={false} />
          </div>
          <CommunityGoalEditor value={{ ...goalForm, enabled: true }} onChange={f => setGoalForm({ ...f, enabled: true })}
            statFields={setupFields} inSeries={!!event.series} hideToggle {...editorProps} />
          <button type="button" onClick={() => createGoalTracking(setupFields)} disabled={goalSetupLoading || setupFields.length === 0}
            className="w-full rounded-control py-2.5 text-sm font-semibold text-primary-ink bg-primary hover:bg-primary-hover disabled:opacity-50">
            {goalSetupLoading ? "Legt an…" : "Ziel anlegen"}
          </button>
          <p className="text-xs text-subtle">„Ziel anlegen“ gilt sofort.</p>
        </section>
      ) : (
        <section aria-label="Kein Ziel möglich" className="rounded-control border border-line bg-surface-2/50 p-4 space-y-2">
          <p className="text-sm text-fg/90">
            {hasTournament
              ? `Das Format „${formatLabel(event.format)}“ kennt kein Community-Ziel.`
              : "Ein Ziel braucht einen Spielplan, in dem Werte oder Ergebnisse eingetragen werden."}
          </p>
          <p className="text-xs text-subtle">Ziele gibt es bei: {GOAL_FORMAT_NAMES}.</p>
          {!hasTournament && (
            <button type="button" onClick={() => setActiveTab("tournament")}
              className="text-xs font-semibold text-primary-fg hover:text-primary-fg">Zum Spielplan und Format wählen →</button>
          )}
        </section>
      )}
    </div>
  );
}
