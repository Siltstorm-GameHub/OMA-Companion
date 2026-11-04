"use client";
import { Check } from "@/components/icons";
import StatRowsEditor from "@/components/admin/StatRowsEditor";
import TournamentTemplateEditor from "@/components/TournamentTemplateEditor";
import { EVENTPUNKTE_LABEL, TURNIERPUNKTE_STAT } from "@/lib/series-event-points";
import { inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 3 (Series): Statistiken & Events ────────────────────────────────────
// EINE Statistik-Liste für die ganze Reihe: Was hier steht, wird in jedem Event erfasst, zählt mit
// den Punkten für den Skill-Index im Event und — gleich oder mit ⇄ abweichend — für die
// Reihentabelle. Einzelne Events können im Reiter "Turnier" eigene Zusatz-Stats ergänzen.
export default function StepSeriesEventSettings({ w }: { w: EventWizard }) {
  const { eventType, seriesFormat, tournamentTemplate, setTournamentTemplate, spectatorMode, variousGames, statRows, setStatRows, polls, eventStatFields, winnerStatField, setWinnerStatField, dominionEnabled, setDominionEnabled, dominionTriggerStats, setDominionTriggerStats, dominionThreshold, setDominionThreshold, dominionCoins, setDominionCoins, dominionSeriesPoints, setDominionSeriesPoints } = w;
  const winnerStatKeys = statRows.filter(r => r.isWinnerStat).map(r => r.field);
  const matchWinStatKeys = statRows.filter(r => r.isMatchWinStat).map(r => r.field);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📋</span>
          <h2 className="text-base font-semibold text-white">Statistiken &amp; Events</h2>
        </div>
        <p className="text-xs text-gray-500">
          Vorlage für alle Events dieser Reihe. Wird beim Anlegen neuer Events und beim Abschluss automatisch übernommen.
        </p>
      </div>

      <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-2">
        <p className="text-sm font-medium text-amber-300">Statistiken</p>
        <p className="text-[11px] text-gray-500">
          Diese Werte trägst du <strong className="text-gray-400">in jedem Event</strong> ein. Die Punkte pro Einheit
          gelten für die Eventpunkte im Event <em>und</em> für die Reihentabelle — mit ⇄ kannst du für die
          Reihentabelle einen eigenen Wert festlegen. „Teilnahme“ wird automatisch gezählt.
        </p>
        {variousGames && (
          <p className="text-[11px] text-blue-300/90 rounded-lg px-3 py-2 border border-blue-500/20 bg-blue-500/5">
            Bei wechselnden Spielen: Lege hier nur Stats an, die es in jedem Spiel gibt. Spielspezifische Stats ergänzt
            du im jeweiligen Event (Reiter „Turnier“) — die zählen dann nur im Event, nicht für die Reihentabelle.
          </p>
        )}
        <StatRowsEditor
          rows={statRows}
          onChange={rows => {
            setStatRows(rows);
            if (winnerStatField && winnerStatField !== TURNIERPUNKTE_STAT && !rows.some(r => r.field === winnerStatField && !r.isWinnerStat && !r.isMatchWinStat)) setWinnerStatField("");
          }}
          showWinnerToggle={eventType === "tournament"}
          showMatchWinToggle={eventType === "tournament"}
          showLeagueOverride
          accentClassName="text-amber-400 hover:text-amber-300"
          inputClassName={inputCls}
          inputStyle={inputStyle}
        />
      </div>

      {eventStatFields.length > 0 && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-3">
          <p className="text-sm font-medium text-teal-300">🏆 Sieger-Ermittlung</p>
          <p className="text-[11px] text-gray-500">
            Welcher Stat bestimmt den Sieger eines Events? Der Spieler mit dem höchsten Wert gewinnt.
          </p>
          <div>
            <label className={labelCls}>Sieger-Stat</label>
            <select value={winnerStatField} onChange={e => setWinnerStatField(e.target.value)}
              className={inputCls} style={inputStyle}>
              <option value="">– Kein / manuell festlegen –</option>
              {eventStatFields.map(f => <option key={f} value={f}>{f}</option>)}
              <option value={TURNIERPUNKTE_STAT}>{EVENTPUNKTE_LABEL} (Summe der Stat-Punkte im Event)</option>
            </select>
          </div>
          {winnerStatKeys.length > 0 && (
            <p className="text-[10px] text-teal-600">
              🏆 +1 für den Event-Sieger auf: {winnerStatKeys.join(", ")}
            </p>
          )}
          {matchWinStatKeys.length > 0 && (
            <p className="text-[10px] text-teal-600">
              ⚔️ +1 pro Match Win (aus einzelnen Runden) auf: {matchWinStatKeys.join(", ")}
            </p>
          )}
        </div>
      )}

      {eventType === "tournament" && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/[0.04] space-y-3">
          <div>
            <p className="text-sm font-semibold text-teal-200">Turniervorlage</p>
            <p className="text-xs text-gray-500">
              Jeder Termin der Reihe übernimmt diese Turnier-Einstellungen. Im einzelnen Turnier bleiben sie änderbar.
            </p>
          </div>
          <TournamentTemplateEditor format={variousGames ? null : seriesFormat} value={tournamentTemplate} onChange={setTournamentTemplate} />
        </div>
      )}

      {/* Dominion Bonus */}
      <div className="rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-300">⚡ Dominion Bonus</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Bonus für Spieler, die eine Stat X-mal in Folge erreichen (z.B. 3× MVP hintereinander).
            </p>
          </div>
          <button type="button" onClick={() => setDominionEnabled(p => !p)}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${dominionEnabled ? "bg-yellow-500" : "bg-gray-700"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${dominionEnabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        {dominionEnabled && (
          <div className="space-y-3 pt-1">
            <div>
              <label className={labelCls}>Trigger-Stats <span className="text-gray-600 font-normal">(mind. eine muss X-mal in Folge eintreten)</span></label>
              {(() => {
                const allTracked = [
                  "Teilnahmen",
                  ...(spectatorMode ? ["Zuschauer-Teilnahmen"] : []),
                  ...winnerStatKeys,
                  ...eventStatFields,
                  ...polls.filter(p => p.label).map(p => p.label),
                ].filter((v, i, a) => a.indexOf(v) === i);
                return allTracked.length > 0 ? (
                  <div className="space-y-1.5">
                    {allTracked.map(f => {
                      const checked = dominionTriggerStats.includes(f);
                      return (
                        <button key={f} type="button"
                          onClick={() => setDominionTriggerStats(prev =>
                            checked ? prev.filter(s => s !== f) : [...prev, f]
                          )}
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 border text-xs text-left transition-all ${
                            checked ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-300" : "border-white/10 bg-white/5 text-gray-400"
                          }`}>
                          <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${checked ? "border-yellow-400 bg-yellow-500" : "border-gray-600"}`}>
                            {checked && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          {f}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-500/80 rounded-lg px-3 py-2 border border-amber-500/20 bg-amber-500/5">
                    Noch keine summierten Stats konfiguriert. Lege oben Statistiken an oder im nächsten Schritt Umfragen.
                  </p>
                );
              })()}
            </div>
            <div>
              <label className={labelCls}>Schwellenwert (wie viele Male in Folge?)</label>
              <input type="number" min="2" max="20" value={dominionThreshold}
                onChange={e => setDominionThreshold(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Bonus — Münzen</label>
                <input type="number" min="0" value={dominionCoins}
                  onChange={e => setDominionCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Bonus — Tabellenpunkte</label>
                <input type="number" min="0" value={dominionSeriesPoints}
                  onChange={e => setDominionSeriesPoints(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            {dominionTriggerStats.length > 0 && (
              <p className="text-[10px] text-yellow-600">
                Bei {dominionThreshold}× mind. eine von [{dominionTriggerStats.join(", ")}] in Folge: +{dominionSeriesPoints} Tabellenpunkte{dominionCoins > 0 ? ` + ${dominionCoins} Münzen` : ""}. Wird in der Reihentabelle als „Dominion Bonus" gezählt.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
