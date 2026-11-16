"use client";
import { CalendarDays } from "@/components/icons";
import type { RecurrenceType } from "@/lib/recurrence";
import { formatBerlinDateTime } from "@/lib/time";
import { FORMATS, RECURRENCE_OPTS, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 2 (Series): Termine & Wiederholung ───────────────────────────────────
export default function StepSchedule({ w }: { w: EventWizard }) {
  const { eventType, variousGames, seriesFormat, setSeriesFormat, seriesStartDate, setSeriesStartDate, seriesEndDate, setSeriesEndDate, seriesFirstEventEndAt, setSeriesFirstEventEndAt, recurrenceType, setRecurrenceType, recurrenceMonthlyMode, setRecurrenceMonthlyMode, monthlyDescriptions, previewDates } = w;
  return (
    <div className="space-y-5">
      {eventType === "tournament" && !variousGames && (
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Format</h2>
          <p className="text-xs text-gray-500 mb-3">Standard-Format für alle Events dieser Reihe</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMATS.map(f => (
              <button key={f.value} type="button" onClick={() => setSeriesFormat(f.value)}
                className={`flex flex-col items-start gap-1 rounded-xl p-3 border-2 transition-all text-left ${
                  seriesFormat === f.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <span className={`text-sm font-semibold ${seriesFormat === f.value ? "text-amber-300" : "text-gray-300"}`}>{f.label}</span>
                <span className="text-xs text-gray-500">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {eventType === "tournament" && variousGames && (
        <div className="rounded-xl px-4 py-3 border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-400">⚠️ Format wird pro Event einzeln festgelegt, da verschiedene Spiele ausgewählt sind.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Startdatum (optional)</label>
          <input type="datetime-local" value={seriesStartDate} onChange={e => setSeriesStartDate(e.target.value)}
            className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-gray-600 mt-1">Datum des ersten Events</p>
        </div>
        <div>
          <label className={labelCls}>Enddatum (optional)</label>
          <input type="date" value={seriesEndDate} onChange={e => setSeriesEndDate(e.target.value)}
            className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-gray-600 mt-1">Alle Termine bis hierhin werden direkt erstellt</p>
        </div>
      </div>

      {seriesStartDate && (
        <div>
          <label className={labelCls}>Ende des ersten Termins (optional)</label>
          <input type="datetime-local" value={seriesFirstEventEndAt} onChange={e => setSeriesFirstEventEndAt(e.target.value)}
            className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-gray-600 mt-1">
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
              className={`flex flex-col items-start gap-0.5 rounded-xl p-3 border-2 transition-all text-left ${
                recurrenceType === r.value
                  ? "border-teal-500/60 bg-teal-500/10"
                  : "border-white/8 bg-white/3 hover:border-white/15"
              }`}>
              <span className={`text-sm font-semibold ${recurrenceType === r.value ? "text-teal-300" : "text-gray-300"}`}>{r.label}</span>
              <span className="text-[10px] text-gray-500">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {recurrenceType === "monthly" && monthlyDescriptions && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-3">
          <p className="text-sm font-medium text-teal-300">Monatlicher Rhythmus</p>
          <p className="text-xs text-gray-500">Aus dem Startdatum erkannte Optionen:</p>
          <div className="space-y-2">
            {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
              <label key={mode} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="monthlyMode" value={mode}
                  checked={recurrenceMonthlyMode === mode}
                  onChange={() => setRecurrenceMonthlyMode(mode)}
                  className="accent-teal-500" />
                <span className="text-sm text-gray-200">{monthlyDescriptions[mode]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {previewDates.length > 0 && (
        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            <p className="text-sm font-medium text-gray-200">
              {seriesEndDate
                ? `${previewDates.length} Termine werden erstellt`
                : `Vorschau (nächste ${previewDates.length})`}
            </p>
            {!seriesEndDate && recurrenceType !== "none" && (
              <span className="text-[10px] text-gray-600 ml-auto">ohne Enddatum: nur Reihe, keine Events</span>
            )}
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {previewDates.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-teal-500 text-xs w-5 text-right shrink-0">#{i + 1}</span>
                <span>{formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!seriesStartDate && (
        <p className="text-xs text-gray-600 italic">
          Ohne Startdatum wird nur die Reihe angelegt. Termine können später einzeln hinzugefügt werden.
        </p>
      )}
    </div>
  );
}
