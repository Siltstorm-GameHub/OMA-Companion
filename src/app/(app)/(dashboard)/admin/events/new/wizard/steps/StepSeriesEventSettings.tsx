"use client";
import { Check, Plus } from "@/components/icons";
import StatFieldEditor from "@/components/StatFieldEditor";
import { inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 4 (Series): Event-Einstellungen ─────────────────────────────────────
export default function StepSeriesEventSettings({ w }: { w: EventWizard }) {
  const { spectatorMode, variousGames, statRows, polls, eventStatFields, setEventStatFields, winnerStatField, setWinnerStatField, dominionEnabled, setDominionEnabled, dominionTriggerStats, setDominionTriggerStats, dominionThreshold, setDominionThreshold, dominionCoins, setDominionCoins, dominionSeriesPoints, setDominionSeriesPoints } = w;
  const winnerStatKeys = statRows.filter(r => r.isWinnerStat).map(r => r.field);
  const matchWinStatKeys = statRows.filter(r => r.isMatchWinStat).map(r => r.field);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📋</span>
          <h2 className="text-base font-semibold text-white">Event-Einstellungen</h2>
        </div>
        <p className="text-xs text-gray-500">
          Vorlage für die einzelnen Events dieser Reihe. Diese Einstellungen werden beim Anlegen
          neuer Events und beim Abschluss automatisch vorausgefüllt.
        </p>
      </div>

      {variousGames && (
        <div className="rounded-xl px-4 py-3 border border-blue-500/20 bg-blue-500/5">
          <p className="text-xs text-blue-300">
            Bei verschiedenen Spielen wird die Sieger-Ermittlung pro Event konfiguriert.
            Stat-Tracking und Sieger-Ermittlung entfallen als Vorlage.
          </p>
        </div>
      )}

      {!variousGames && (
        <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-2">
          <p className="text-sm font-medium text-amber-300 mb-1">Trackte Statistiken je Event</p>
          <p className="text-[11px] text-gray-500">
            Die Stat-Spalten, die beim Eintragen der Ergebnisse <strong className="text-gray-400">in jedem
            einzelnen Event</strong> ausgefüllt werden. „Teilnahme" wird für jeden Mitspieler automatisch
            +1 getrackt.
          </p>
          {statRows.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Damit ein Wert hier auch in der Saison-Gesamttabelle (Schritt 4) Punkte gibt, muss der
              Feldname exakt mit einem dortigen Stat übereinstimmen — Felder, die es dort nicht gibt,
              bleiben nur eine event-lokale Statistik ohne Ligapunkte.
            </p>
          )}
          {statRows.length > 0 && (
            <button type="button"
              onClick={() => setEventStatFields(prev => [...new Set([...prev, ...statRows.map(r => r.field).filter(Boolean)])])}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors">
              <Plus className="w-3 h-3" /> Feldnamen aus Gesamttabelle übernehmen
            </button>
          )}
          <StatFieldEditor fields={eventStatFields} onChange={f => {
            setEventStatFields(f);
            if (!f.includes(winnerStatField)) setWinnerStatField("");
          }} />
          {(() => {
            const seriesFields = new Set(statRows.map(r => r.field).filter(Boolean));
            const untracked = statRows.map(r => r.field).filter(f => f && !eventStatFields.includes(f));
            const unlinked = eventStatFields.filter(f => !seriesFields.has(f));
            return (
              <>
                {untracked.length > 0 && (
                  <p className="text-[11px] text-red-400/80 rounded-lg px-3 py-2 border border-red-500/20 bg-red-500/5">
                    ⚠️ Gesamttabellen-Stat(s) „{untracked.join(", ")}" werden hier nicht erfasst — bleiben in
                    der Saison-Rangliste immer 0.
                  </p>
                )}
                {unlinked.length > 0 && (
                  <p className="text-[11px] text-gray-500 rounded-lg px-3 py-2 border border-white/10 bg-white/5">
                    ℹ️ „{unlinked.join(", ")}" {unlinked.length === 1 ? "ist" : "sind"} nur event-lokal — kein
                    gleichnamiger Stat in der Gesamttabelle, also keine Ligapunkte daraus.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {!variousGames && eventStatFields.length > 0 && (
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
            </select>
          </div>
          {winnerStatField && winnerStatKeys.length === 0 && (
            <p className="text-[11px] text-amber-500/80 rounded-lg px-3 py-2 border border-amber-500/20 bg-amber-500/5">
              Markiere in Schritt 3 einen Reihen-Stat mit 🏆, um +1 für den Event-Sieger zu tracken.
            </p>
          )}
          {winnerStatKeys.length > 0 && (
            <p className="text-[10px] text-teal-600 mt-1">
              Reihen-Stats bei Event-Sieg +1: {winnerStatKeys.join(", ")}
            </p>
          )}
        </div>
      )}

      {matchWinStatKeys.length > 0 && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5">
          <p className="text-[10px] text-teal-600">
            ⚔️ Reihen-Stats +1 pro Match Win (aus einzelnen Runden): {matchWinStatKeys.join(", ")}
          </p>
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
                    Noch keine summierten Stats konfiguriert. Füge zuerst Stats oder Umfragen in Schritt 3 hinzu.
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
                <label className={labelCls}>Bonus — Ligapunkte</label>
                <input type="number" min="0" value={dominionSeriesPoints}
                  onChange={e => setDominionSeriesPoints(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            {dominionTriggerStats.length > 0 && (
              <p className="text-[10px] text-yellow-600">
                Bei {dominionThreshold}× mind. eine von [{dominionTriggerStats.join(", ")}] in Folge: +{dominionSeriesPoints} Ligapunkte{dominionCoins > 0 ? ` + ${dominionCoins} Münzen` : ""}. Wird in der Ligatabelle als „Dominion Bonus" gezählt.
              </p>
            )}
          </div>
        )}
      </div>

      {!variousGames && eventStatFields.length === 0 && !dominionEnabled && (
        <p className="text-xs text-gray-600 italic">
          Ohne Stat-Felder werden keine Statistiken je Event getrackt. Du kannst dies auch später
          in den Reihen-Einstellungen konfigurieren.
        </p>
      )}
    </div>
  );
}
