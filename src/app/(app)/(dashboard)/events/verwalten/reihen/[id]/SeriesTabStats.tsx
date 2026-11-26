"use client";
import SeriesTabLegacy from "./SeriesTabLegacy";
import { Coins, Vote, Flame } from "@/components/icons";
import RankPointsIcon from "@/components/RankPointsIcon";
import StatRowsEditor from "@/components/admin/StatRowsEditor";
import { deriveEventStatFields } from "@/lib/series-stat-fields";
import { EVENTPUNKTE_LABEL, TURNIERPUNKTE_STAT } from "@/lib/series-event-points";
import { NumberInput } from "@/components/ui/NumberInput";
import { inputCls, Section } from "./series-shared";
import { LimitHint } from "../../neu/wizard/shared";
import type { SeriesDetail } from "./useSeriesDetail";

/** Reiter "Stats & Bonus": Statistiken, Sieger-Ermittlung, Dominion Bonus. */
export default function SeriesTabStats({ ctx }: { ctx: SeriesDetail }) {
  const { isModerator, rewardLimits, isArchived, statRows, setStatRows, eventStatFields, winnerStatField, setWinnerStatField, dominionEnabled, setDominionEnabled, dominionTriggerStats, setDominionTriggerStats, dominionThreshold, setDominionThreshold, dominionCoins, setDominionCoins, dominionSeriesPoints, setDominionSeriesPoints, polls, lockedNotice, aliasSection } = ctx;
  return (
    <>
          {lockedNotice}
          <fieldset disabled={isArchived} className="space-y-4 min-w-0 border-0 p-0 m-0">
          {/* Statistiken — EINE Liste: wird in jedem Event erfasst, Punkte gelten für den Skill-Index im
              Event und (gleich oder mit ⇄ abweichend) für die Reihentabelle */}
          <Section title="Statistiken">
            <p className="text-xs text-subtle mb-2">
              Werden in jedem Event der Reihe erfasst. Die Punkte gelten im Event (Eventpunkte) und in der
              Reihentabelle — mit ⇄ legst du für die Reihentabelle eigene Punkte fest. Zusatz-Stats nur für ein
              einzelnes Event ergänzt du dort im Reiter „Spielplan“.
            </p>
            <StatRowsEditor
              rows={statRows}
              onChange={rows => {
                setStatRows(rows);
                if (winnerStatField && winnerStatField !== TURNIERPUNKTE_STAT && !deriveEventStatFields(rows).includes(winnerStatField)) setWinnerStatField("");
              }}
              showLeagueOverride
              showLatestToggle
            />
          </Section>

          {eventStatFields.length > 0 && (
            <Section title="Sieger-Ermittlung">
              <p className="text-xs text-subtle mb-2">
                Welcher Stat bestimmt den Sieger eines Events? Der Spieler mit dem höchsten Wert gewinnt.
              </p>
              <select value={winnerStatField} onChange={e => setWinnerStatField(e.target.value)} className={inputCls}>
                <option value="">– Kein / manuell festlegen –</option>
                {eventStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                <option value={TURNIERPUNKTE_STAT}>{EVENTPUNKTE_LABEL} (Summe der Stat-Punkte im Event)</option>
              </select>
            </Section>
          )}

          {/* Dominion Bonus */}
          <Section title="Dominion Bonus">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={dominionEnabled} onChange={e => setDominionEnabled(e.target.checked)}
                  className="rounded accent-amber-500" />
                <span className="text-sm text-fg/90 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-amber-400" /> Dominion Bonus aktivieren</span>
              </label>
              {dominionEnabled && (
                <div className="space-y-3 pl-1">
                  <div>
                    <p className="text-xs text-subtle mb-1.5">Trigger-Stats (mind. eine muss erfüllt sein)</p>
                    <div className="flex flex-wrap gap-2">
                      {statRows.filter(r => r.field.trim()).map(r => (
                        <button key={r.field} type="button"
                          onClick={() => setDominionTriggerStats(prev =>
                            prev.includes(r.field) ? prev.filter(s => s !== r.field) : [...prev, r.field]
                          )}
                          className={`text-xs px-2 py-1 rounded-control border transition-colors ${
                            dominionTriggerStats.includes(r.field)
                              ? "text-amber-300 bg-amber-500/10 border-warning/30"
                              : "text-subtle border-line hover:border-line-strong"
                          }`}
                        >{r.field}</button>
                      ))}
                      {polls.filter(p => p.label.trim()).map(p => (
                        <button key={`poll:${p.label}`} type="button"
                          onClick={() => setDominionTriggerStats(prev =>
                            prev.includes(p.label) ? prev.filter(s => s !== p.label) : [...prev, p.label]
                          )}
                          title="Umfragesieg"
                          className={`text-xs px-2 py-1 rounded-control border transition-colors flex items-center gap-1 ${
                            dominionTriggerStats.includes(p.label)
                              ? "text-amber-300 bg-amber-500/10 border-warning/30"
                              : "text-subtle border-line hover:border-line-strong"
                          } max-lg:min-h-10`}
                        ><Vote className="w-3 h-3" />{p.label}</button>
                      ))}
                      {statRows.filter(r => r.field.trim()).length === 0 && polls.filter(p => p.label.trim()).length === 0 && (
                        <p className="text-xs text-subtle">Erst Stats oder Umfragen hinzufügen</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-subtle mb-1 block">Streak-Schwelle</label>
                      <NumberInput min={1} value={dominionThreshold}
                        onChange={e => setDominionThreshold(Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-subtle mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Münzen</label>
                      <NumberInput min={0} value={dominionCoins}
                        onChange={e => setDominionCoins(Number(e.target.value))} className={inputCls} />
                      <LimitHint value={dominionCoins} max={rewardLimits?.dominionCoins} />
                    </div>
                    <div>
                      <label className="text-xs text-subtle mb-1 flex items-center gap-1"><RankPointsIcon size={12} /> Tabellenpkt.</label>
                      <NumberInput min={0} value={dominionSeriesPoints}
                        onChange={e => setDominionSeriesPoints(Number(e.target.value))} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          </fieldset>
          {aliasSection}

          {/* Selten gebraucht: Altstand aus der Zeit vor der App (nur Mods) — eingeklappt */}
          {isModerator && (
            <details className="rounded-control border border-line bg-surface-2/50">
              <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">
                Erweitert: Altstand (Legacy)
              </summary>
              <div className="p-3"><SeriesTabLegacy ctx={ctx} /></div>
            </details>
          )}
          </>
  );
}
