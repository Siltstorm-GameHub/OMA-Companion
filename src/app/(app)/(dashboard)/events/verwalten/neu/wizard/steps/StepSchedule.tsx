"use client";
import { CalendarDays } from "@/components/icons";
import type { RecurrenceType } from "@/lib/recurrence";
import { formatBerlinDateTime } from "@/lib/time";
import { FORMATS, RECURRENCE_OPTS, inputCls, inputStyle, labelCls } from "../shared";
import { supportsCommunityGoal } from "@/lib/community-goal";
import type { EventWizard } from "../useEventWizard";

// ── Step 2 (Series): Termine & Wiederholung ───────────────────────────────────
export default function StepSchedule({ w }: { w: EventWizard }) {
  const { eventType, variousGames, seriesFormat, setSeriesFormat, seriesStartDate, setSeriesStartDate, seriesEndDate, setSeriesEndDate, seriesFirstEventEndAt, setSeriesFirstEventEndAt, recurrenceType, setRecurrenceType, recurrenceMonthlyMode, setRecurrenceMonthlyMode, monthlyDescriptions, previewDates } = w;
  return (
    <div className="space-y-5">
      {eventType === "tournament" && !variousGames && (
        <div>
          <h2 className="text-base font-semibold text-fg mb-1">Format</h2>
          <p className="text-xs text-subtle mb-3">Standard-Format für alle Events dieser Reihe</p>
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
        </div>
      )}
      {eventType === "tournament" && variousGames && (
        <div className="rounded-control px-4 py-3 border border-warning/30 bg-amber-500/5">
          <p className="text-xs text-amber-400">⚠️ Format wird pro Event einzeln festgelegt, da verschiedene Spiele ausgewählt sind.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Startdatum (optional)</label>
          <input type="datetime-local" value={seriesStartDate} onChange={e => setSeriesStartDate(e.target.value)}
            className={inputCls} style={inputStyle} />
          <p className="text-xs text-subtle mt-1">Datum des ersten Events</p>
        </div>
        <div>
          <label className={labelCls}>Enddatum (optional)</label>
          <input type="date" value={seriesEndDate} onChange={e => setSeriesEndDate(e.target.value)}
            className={inputCls} style={inputStyle} />
          <p className="text-xs text-subtle mt-1">Alle Termine bis hierhin werden direkt erstellt</p>
        </div>
      </div>

      {seriesStartDate && (
        <div>
          <label className={labelCls}>Ende des ersten Termins (optional)</label>
          <input type="datetime-local" value={seriesFirstEventEndAt} onChange={e => setSeriesFirstEventEndAt(e.target.value)}
            className={inputCls} style={inputStyle} />
          <p className="text-xs text-subtle mt-1">
            Die Spanne (z.B. „Mo 18:00–So 23:59&quot;) wird auf alle automatisch generierten Folgetermine übertragen.
          </p>
        </div>
      )}

      <div>
        <label className={labelCls}>Wiederholung</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RECURRENCE_OPTS.map(r => (
            <button key={r.value} type="button"
              onClick={() => setRecurrenceType(r.value as "none" | RecurrenceType)}
              className={`flex flex-col items-start gap-0.5 rounded-control p-3 border-2 transition-all text-left ${
                recurrenceType === r.value
                  ? "border-primary/60 bg-primary/10"
                  : "border-line bg-surface-2 hover:border-line-strong"
              }`}>
              <span className={`text-sm font-semibold ${recurrenceType === r.value ? "text-primary-fg" : "text-fg/90"}`}>{r.label}</span>
              <span className="text-xs text-subtle">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {recurrenceType === "monthly" && monthlyDescriptions && (
        <div className="rounded-control p-4 border border-primary/20 bg-primary/5 space-y-3">
          <p className="text-sm font-medium text-primary-fg">Monatlicher Rhythmus</p>
          <p className="text-xs text-subtle">Aus dem Startdatum erkannte Optionen:</p>
          <div className="space-y-2">
            {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
              <label key={mode} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="monthlyMode" value={mode}
                  checked={recurrenceMonthlyMode === mode}
                  onChange={() => setRecurrenceMonthlyMode(mode)}
                  className="accent-primary" />
                <span className="text-sm text-fg">{monthlyDescriptions[mode]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {previewDates.length > 0 && (
        <div className="rounded-control p-4 border border-line bg-surface-2">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-fg">
              {seriesEndDate
                ? `${previewDates.length} Termine werden erstellt`
                : `Vorschau (nächste ${previewDates.length})`}
            </p>
            {!seriesEndDate && recurrenceType !== "none" && (
              <span className="text-xs text-subtle ml-auto">ohne Enddatum: nur Reihe, keine Events</span>
            )}
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {previewDates.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted">
                <span className="text-primary text-xs w-5 text-right shrink-0">#{i + 1}</span>
                <span>{formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!seriesStartDate && (
        <p className="text-xs text-subtle italic">
          Ohne Startdatum wird nur die Reihe angelegt. Termine können später einzeln hinzugefügt werden.
        </p>
      )}
    </div>
  );
}
