"use client";
import ScheduleEditor from "@/components/ScheduleEditor";
import { FORMATS } from "../shared";
import { supportsCommunityGoal } from "@/lib/community-goal";
import type { EventWizard } from "../useEventWizard";

// ── Step 2 (Series): Ablaufart und Termine ────────────────────────────────────
// Eventreihe (feste Termine) oder Challenge-Reihe (lückenlose Runden) — siehe lib/series-schedule.ts.
// Beim Anlegen entsteht der erste Termin, die weiteren legt die Terminplanung im Vorlauf an.
export default function StepSchedule({ w }: { w: EventWizard }) {
  const { eventType, variousGames, seriesFormat, setSeriesFormat, schedule, setSchedule, createFirstEvent, setCreateFirstEvent, seasonPrefill } = w;
  return (
    <div className="space-y-5">
      <ScheduleEditor value={schedule} onChange={setSchedule} />

      {!schedule.rhythm && (
        <label className="flex items-start gap-2 text-sm text-fg/90 cursor-pointer select-none">
          <input type="checkbox" checked={createFirstEvent} onChange={e => setCreateFirstEvent(e.target.checked)} className="rounded mt-0.5" />
          <span>
            Ersten Termin gleich anlegen
            <span className="block text-xs text-subtle">Sonst entsteht nur die Reihe — Termine legst du danach einzeln an.</span>
          </span>
        </label>
      )}

      {seasonPrefill && (
        <p className="text-xs text-subtle">
          Regel und Einstellungen stammen aus „{seasonPrefill.oldSeriesName}“. Der erste Termin ist der nächste reguläre Platz — passe ihn bei Bedarf an.
          Die Ablaufart lässt sich nur hier, beim Start einer neuen Saison, wechseln.
        </p>
      )}

      {eventType === "tournament" && !variousGames && (
        <div>
          <h2 className="text-base font-semibold text-fg mb-1">Format</h2>
          <p className="text-xs text-subtle mb-3">Standard-Format für alle Termine dieser Reihe</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMATS.map(f => (
              <button key={f.value} type="button" onClick={() => setSeriesFormat(f.value)}
                className={`flex flex-col items-start gap-1 rounded-control p-3 border-2 transition-all text-left ${
                  seriesFormat === f.value ? "border-warning/30 bg-amber-500/10" : "border-line bg-surface-2 hover:border-line-strong"
                }`}>
                <span className={`text-sm font-semibold ${seriesFormat === f.value ? "text-amber-300" : "text-fg/90"}`}>{f.label}</span>
                <span className="text-xs text-subtle">{f.desc}</span>
                {supportsCommunityGoal(f.value) && <span className="text-xs font-medium text-primary-fg">🎯 Ziel möglich</span>}
              </button>
            ))}
          </div>
          {schedule.mode === "runden" && (
            <p className="text-xs text-subtle mt-2">
              Challenge-Reihe: Jede Runde hat genau ein Match. Teilnehmer tragen ihre Werte selbst ein — eine neue Meldung ersetzt die vorige.
              Bei „Freie Wertung“, „Punktewertung“ und „Durchschnittswerte“ startet das Match automatisch mit der Runde.
            </p>
          )}
        </div>
      )}
      {eventType === "tournament" && variousGames && (
        <div className="rounded-control px-4 py-3 border border-warning/30 bg-amber-500/5">
          <p className="text-xs text-amber-400">⚠️ Format wird pro Termin einzeln festgelegt, da verschiedene Spiele ausgewählt sind.</p>
        </div>
      )}
    </div>
  );
}
