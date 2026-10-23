"use client";
import StatFieldEditor from "@/components/StatFieldEditor";
import StatPointsTable from "@/components/StatPointsTable";
import { FORMATS, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 2 (Event): Turnier ───────────────────────────────────────────────────
export default function StepTournament({ w }: { w: EventWizard }) {
  const { format, setFormat, statFields, setStatFields, statPointsByField, setStatPointsByField, selectedSeries, seriesFixedFormat, formatObj, hasStat, playHomeAway, setPlayHomeAway, pointsMode, setPointsMode, coinsWin, setCoinsWin, coinsDraw, setCoinsDraw, checkInEnabled, setCheckInEnabled, checkInMinutes, setCheckInMinutes } = w;
  return (
    <div className="space-y-6">
      {seriesFixedFormat ? (
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Format</h2>
        <p className="text-sm text-amber-300">{formatObj?.label ?? seriesFixedFormat}</p>
        <p className="text-xs text-gray-500 mt-1">
          Festgelegt durch die Eventreihe „{selectedSeries?.name}“ — alle Turniere dieser Reihe nutzen dieses Format.
        </p>
      </div>
      ) : (
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Format</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMATS.map(f => (
            <button key={f.value} type="button" onClick={() => setFormat(f.value)}
              className={`flex flex-col items-start gap-1 rounded-xl p-3 border-2 transition-all text-left ${
                format === f.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
              }`}>
              <span className={`text-sm font-semibold ${format === f.value ? "text-amber-300" : "text-gray-300"}`}>{f.label}</span>
              <span className="text-xs text-gray-500">{f.desc}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {hasStat && !seriesFixedFormat && (
        <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm font-medium text-amber-300 mb-3">Stat-Felder</p>
          <StatFieldEditor fields={statFields} onChange={setStatFields} />
          {statFields.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-amber-300">Punkte pro Statistik</p>
              <p className="text-[11px] text-gray-500">
                Wie viele Punkte gibt jede Einheit einer Statistik? Lässt sich später im Reiter „Turnier“ des Events ändern.
              </p>
              <StatPointsTable
                fields={statFields}
                values={statPointsByField}
                onChange={(f, v) => setStatPointsByField(prev => ({ ...prev, [f]: v }))}
              />
            </div>
          )}
        </div>
      )}

      {(seriesFixedFormat ?? format) === "group_knockout" && (
        <p className="text-xs text-gray-500">
          Gruppenanzahl und Weiterkommende pro Gruppe legst du nach dem Erstellen im Reiter „Turnier“ des
          Events fest — dort werden die angemeldeten Spieler auch ausgelost.
        </p>
      )}

      {!seriesFixedFormat && format === "round_robin" && (
        <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={playHomeAway} onChange={e => setPlayHomeAway(e.target.checked)} className="rounded shrink-0" />
            <span className="text-sm text-white">Hin- und Rückrunde spielen</span>
          </label>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Zusätzliche Münzen pro Match-Ergebnis</p>
            <div className="flex gap-2">
              {([["placement", "Nein — nur Platzierungen"], ["matchResult", "Ja — Sieg/Unentschieden-Münzen"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setPointsMode(value)}
                  className={`flex-1 text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                    pointsMode === value ? "border-amber-500 bg-amber-900/25 text-white" : "border-white/10 text-gray-400 hover:border-white/20"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {pointsMode === "matchResult" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>🏆 Münzen pro Sieg</span>
                <input type="number" min={0} value={coinsWin} onChange={e => setCoinsWin(Math.max(0, Number(e.target.value) || 0))} className={inputCls} style={inputStyle} />
              </label>
              <label className="block">
                <span className={labelCls}>🤝 Münzen pro Unentschieden</span>
                <input type="number" min={0} value={coinsDraw} onChange={e => setCoinsDraw(Math.max(0, Number(e.target.value) || 0))} className={inputCls} style={inputStyle} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Check-in vor Turnierstart — nur Eingecheckte werden ausgelost */}
      <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={checkInEnabled} onChange={e => setCheckInEnabled(e.target.checked)} className="w-4 h-4 mt-0.5 rounded shrink-0" />
          <div>
            <p className="text-sm text-white">Check-in vor Turnierstart</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Angemeldete Spieler bestätigen kurz vor dem Start ihre Teilnahme. Ausgelost werden dann nur
              Eingecheckte — wer nicht erscheint, landet nicht im Turnierbaum.
            </p>
          </div>
        </label>
        {checkInEnabled && (
          <div className="flex items-center gap-2 pl-7">
            <span className="text-xs text-gray-400">Öffnet</span>
            <input type="number" min={5} max={1440} value={checkInMinutes}
              onChange={e => setCheckInMinutes(Number(e.target.value) || 0)}
              className="w-20 rounded-lg px-2 py-1 text-sm text-white text-center outline-none" style={inputStyle} />
            <span className="text-xs text-gray-400">Minuten vor dem Start</span>
          </div>
        )}
      </div>
    </div>
  );
}
