"use client";
import StatFieldEditor from "@/components/StatFieldEditor";
import StatPointsTable from "@/components/StatPointsTable";
import AvgDirectionToggle from "@/components/AvgDirectionToggle";
import CommunityGoalEditor from "@/components/CommunityGoalEditor";
import { RESULT_SCORE_FIELD, isResultGoalFormat, supportsCommunityGoal } from "@/lib/community-goal";
import { FORMATS, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";
import { NumberInput } from "@/components/ui/NumberInput";

// ── Step 2 (Event): Turnier ───────────────────────────────────────────────────
export default function StepTournament({ w }: { w: EventWizard }) {
  const { format, setFormat, statFields, setStatFields, statPointsByField, setStatPointsByField, avgDirection, setAvgDirection, communityGoal, setCommunityGoal, selectedSeries, seriesFixedFormat, formatObj, hasStat, playHomeAway, setPlayHomeAway, pointsMode, setPointsMode, coinsWin, setCoinsWin, coinsDraw, setCoinsDraw, checkInEnabled, setCheckInEnabled } = w;
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
        <p className="text-xs text-gray-500 mb-3">
          Ein gemeinsames Community-Ziel (z. B. „1.000 Tore zusammen“) gibt es bei Formaten mit „🎯 Ziel möglich“. Ganz ohne
          Sieger geht es auch: wähle in Schritt 1 „Ohne Platzierung“.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMATS.map(f => (
            <button key={f.value} type="button" onClick={() => setFormat(f.value)}
              className={`flex flex-col items-start gap-1 rounded-xl p-3 border-2 transition-all text-left ${
                format === f.value ? "border-amber-500/60 bg-amber-500/10" : "border-line bg-surface-2 hover:border-line-strong"
              }`}>
              <span className={`text-sm font-semibold ${format === f.value ? "text-amber-300" : "text-gray-300"}`}>{f.label}</span>
              <span className="text-xs text-gray-500">{f.desc}</span>
              {supportsCommunityGoal(f.value) && <span className="text-xs font-medium text-primary-fg">🎯 Ziel möglich</span>}
            </button>
          ))}
        </div>
      </div>
      )}

      {hasStat && !seriesFixedFormat && (
        <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm font-medium text-amber-300 mb-3">Stat-Felder</p>
          <StatFieldEditor fields={statFields} onChange={setStatFields} isAvg={format === "avg_stats"} />
          {format === "avg_stats" && (
            <div className="mt-3">
              <AvgDirectionToggle value={avgDirection} onChange={setAvgDirection} />
            </div>
          )}
          {statFields.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-amber-300">Punkte pro Statistik</p>
              <p className="text-xs text-gray-500">
                Wie viele Punkte gibt jede Einheit einer Statistik? Lässt sich später im Reiter „Spielplan“ des Events ändern.
              </p>
              <StatPointsTable
                fields={statFields}
                values={statPointsByField}
                onChange={(f, v) => setStatPointsByField(prev => ({ ...prev, [f]: v }))}
              />
            </div>
          )}
          {supportsCommunityGoal(format) && (
            <div className="mt-4 pt-4 border-t border-line">
              <CommunityGoalEditor value={communityGoal} onChange={setCommunityGoal} statFields={statFields} inSeries={!!selectedSeries}
                rewardLimit={w.rewardLimits?.goalRewardCoins ?? null} seriesPointsLimit={w.rewardLimits?.goalSeriesPoints ?? null} hasEnd={!!w.endAt} />
            </div>
          )}
        </div>
      )}

      {/* Liga, K.O. & Co.: Community-Ziel auf die Tore laut Spielergebnis (lib/community-goal.ts) */}
      {!hasStat && !seriesFixedFormat && isResultGoalFormat(format) && (
        <div className="rounded-xl p-4 border border-primary/20 bg-primary/5">
          <CommunityGoalEditor value={communityGoal} onChange={setCommunityGoal} statFields={[RESULT_SCORE_FIELD]} inSeries={!!selectedSeries}
            rewardLimit={w.rewardLimits?.goalRewardCoins ?? null} seriesPointsLimit={w.rewardLimits?.goalSeriesPoints ?? null} hasEnd={!!w.endAt} />
        </div>
      )}

      {(seriesFixedFormat ?? format) === "group_knockout" && (
        <p className="text-xs text-gray-500">
          Gruppenanzahl und Weiterkommende pro Gruppe legst du nach dem Erstellen im Reiter „Spielplan“ des
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
                    pointsMode === value ? "border-amber-500 bg-amber-900/25 text-white" : "border-line-strong text-gray-400 hover:border-line-strong"
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
                <NumberInput min={0} value={coinsWin} onChange={e => setCoinsWin(Math.max(0, Number(e.target.value) || 0))} className={inputCls} style={inputStyle} />
              </label>
              <label className="block">
                <span className={labelCls}>🤝 Münzen pro Unentschieden</span>
                <NumberInput min={0} value={coinsDraw} onChange={e => setCoinsDraw(Math.max(0, Number(e.target.value) || 0))} className={inputCls} style={inputStyle} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Check-in vor Turnierstart — nur Eingecheckte werden ausgelost */}
      <div className="rounded-xl p-4 border border-primary/20 bg-primary/5 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={checkInEnabled} onChange={e => setCheckInEnabled(e.target.checked)} className="w-4 h-4 mt-0.5 rounded shrink-0" />
          <div>
            <p className="text-sm text-white">Check-in vor Turnierstart</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Angemeldete Spieler bestätigen ab 30 Minuten vor dem Start ihre Teilnahme („Bin bereit“). Ausgelost
              werden dann nur Eingecheckte — wer nicht erscheint, landet nicht im Turnierbaum.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
