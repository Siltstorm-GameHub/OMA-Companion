"use client";
import PlaceMedal from "@/components/PlaceMedal";
import Image from "next/image";
import { Plus, Trash2 } from "@/components/icons";
import InfoTooltip from "@/components/InfoTooltip";
import { LimitHint, PollConfig, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";
import { NumberInput } from "@/components/ui/NumberInput";
import CommunityGoalEditor from "@/components/CommunityGoalEditor";
import StatFieldEditor from "@/components/StatFieldEditor";

// ── Step 3: Belohnungen (shared, with stat config for series tournament) ──────
export default function StepRewards({ w }: { w: EventWizard }) {
  const { eventType, spectatorMode, seriesMode, statParticipationPts, setStatParticipationPts, statSpectatorParticipationPts, setStatSpectatorParticipationPts, statPtsToGlobalRanking, setStatPtsToGlobalRanking, statRows, participationCoins, setParticipationCoins, participationRankPts, setParticipationRankPts, placements, setPlacements, spectatorCoins, setSpectatorCoins, spectatorRankPts, setSpectatorRankPts, polls, isEventMode, isSeriesMode, belongsToSeries, addPoll, updatePoll, removePoll, rewardLimits: lim } = w;
  if (w.isBlocksChallenge) {
    return (
      <div className="rounded-xl p-4 border border-line bg-surface-2 text-sm text-gray-300">
        Bei einer OMA-Blocks-Challenge gibt es keine Platzierungen — die Belohnung für alle mit Mindestbeitrag
        hast du schon in den Grunddaten festgelegt. Sie wird nach dem Ende automatisch ausgezahlt, wenn das Ziel erreicht ist.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 border border-line bg-surface-2">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/Muenze Icon.png" alt="Münzen" width={20} height={20} />
          <p className="text-sm font-medium text-gray-200">Teilnahme-Belohnung</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">Wird erst nach Event-Abschluss vergeben</p>
        <div className={belongsToSeries ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
          {!belongsToSeries && (
            <div>
              <label className={labelCls}>Münzen</label>
              <NumberInput min="0" value={participationCoins}
                onChange={e => setParticipationCoins(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
              <LimitHint value={participationCoins} max={lim?.participationCoins} />
            </div>
          )}
          {!belongsToSeries && (
            <div>
              <label className={labelCls}>Rang-Punkte <span className="text-gray-500 font-normal">(→ Rangliste)</span></label>
              <NumberInput min="0" value={participationRankPts}
                onChange={e => setParticipationRankPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
              <LimitHint value={participationRankPts} max={lim?.participationRankPts} />
            </div>
          )}
        </div>
        {isSeriesMode && (
          <p className="text-xs text-gray-500 mt-2">Münzen pro Teilnahme: siehe „📊 Reihentabelle" weiter unten.</p>
        )}
        {isEventMode && seriesMode !== "none" && (
          <p className="text-xs text-gray-500 mt-2">Münzen pro Teilnahme sind seriesweit in der Reihentabellen-Konfiguration der Eventreihe eingestellt.</p>
        )}
      </div>

      {eventType === "community" ? (
        <p className="text-xs text-gray-500 -mt-3 px-1">Ohne Platzierung: kein Sieger, es gibt nur die Teilnahme-Belohnung.</p>
      ) : (
      <div className="rounded-xl p-4 border border-line bg-surface-2">
        <p className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-1.5">
          Platzierungs-Belohnungen
          <InfoTooltip text="Münzen und Rang-Punkte, die je nach Endplatzierung im Turnier vergeben werden (🥇 1. Platz, 🥈 2. Platz, 🥉 3. Platz). Wird erst vergeben, wenn das Event/Turnier abgeschlossen und die finale Platzierung eingetragen ist." />
        </p>
        <div className="space-y-2">
          {placements.map((p, i) => (
            <div key={p.place} className="flex items-center gap-3">
              <span className="text-sm w-5 shrink-0"><PlaceMedal place={i + 1} /></span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Münzen</label>
                  <NumberInput min="0" value={p.coins}
                    onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, coins: Number(e.target.value) } : pp))}
                    className={inputCls} style={inputStyle} />
                  {isEventMode && <LimitHint value={p.coins} max={lim ? (lim.placementCoins[i] ?? lim.placementCoinsOther) : null} />}
                </div>
                <div>
                  <label className={labelCls}>Rang-Punkte</label>
                  <NumberInput min="0" value={p.rankPoints}
                    onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, rankPoints: Number(e.target.value) } : pp))}
                    className={inputCls} style={inputStyle} />
                  {isEventMode && <LimitHint value={p.rankPoints} max={lim ? (lim.placementRankPoints[i] ?? 0) : null} />}
                </div>
              </div>
            </div>
          ))}
        </div>
        {isSeriesMode && lim && (
          <p className="mt-2 text-xs text-gray-500">
            Die Grenzen der Endwertung richten sich nach der Zahl der Termine. Zu hohe Werte werden beim Abschluss der Saison gekürzt.
          </p>
        )}
      </div>
      )}

      {/* "Ohne Platzierung": gemeinsames Community-Ziel (legt eine Werte-Erfassung an, keine Platzierung) */}
      {isEventMode && eventType === "community" && !w.isBlocksEvent && seriesMode === "none" && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-3">
          <CommunityGoalEditor value={w.communityGoal} onChange={w.setCommunityGoal} statFields={w.statFields}
            rewardLimit={lim?.goalRewardCoins ?? null} hasEnd={!!w.endAt} />
          {w.communityGoal.enabled && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Erfasste Werte</p>
              <StatFieldEditor fields={w.statFields} onChange={w.setStatFields} isAvg={false} />
              <p className="text-xs text-gray-500 mt-1">
                Diese Werte trägst du (oder tragen die Teilnehmer per Screenshot) im Reiter „Spielplan“ ein. Eine Platzierung gibt es weiterhin nicht.
              </p>
            </div>
          )}
        </div>
      )}
      {isEventMode && eventType === "community" && seriesMode !== "none" && (
        <p className="text-xs text-gray-500 -mt-3 px-1">🎯 Ein Community-Ziel kommt bei Terminen einer Reihe aus der Reihe (Reiter „Ziel“ der Reihe).</p>
      )}

      {spectatorMode && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5">
          <p className="text-sm font-medium text-teal-300 mb-3">👁️ Zuschauer-Basis-Belohnung</p>
          <div className={belongsToSeries ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
            {!belongsToSeries && (
              <div>
                <label className={labelCls}>Münzen</label>
                <NumberInput min="0" value={spectatorCoins}
                  onChange={e => setSpectatorCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
                <LimitHint value={spectatorCoins} max={lim?.spectatorCoins} />
              </div>
            )}
            <div>
              <label className={labelCls}>Rang-Punkte <span className="text-gray-500 font-normal">(→ Rangliste)</span></label>
              <NumberInput min="0" value={spectatorRankPts}
                onChange={e => setSpectatorRankPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
              <LimitHint value={spectatorRankPts} max={lim?.spectatorRankPoints} />
            </div>
          </div>
          {isSeriesMode && (
            <p className="text-xs text-gray-500 mt-2">Münzen pro Zuschauer-Teilnahme: siehe „📊 Reihentabelle" weiter unten.</p>
          )}
          {isEventMode && seriesMode !== "none" && (
            <p className="text-xs text-gray-500 mt-2">Münzen pro Zuschauer-Teilnahme sind seriesweit in der Reihentabellen-Konfiguration der Eventreihe eingestellt.</p>
          )}
        </div>
      )}

      {isSeriesMode && (
        <div className="rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5 space-y-3">
          <p className="text-sm font-medium text-indigo-300">📊 Reihentabelle</p>
          <p className="text-xs text-gray-500 -mt-1">
            Die Reihentabelle der ganzen Reihe (Tabellenpunkte, über alle Events aufsummiert): Teilnahme plus
            die Punkte aus den Statistiken des vorigen Schritts.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Punkte pro Mitspieler-Teilnahme <span className="text-gray-500 font-normal">(Reihentabelle)</span></label>
              <NumberInput min="0" value={statParticipationPts}
                onChange={e => setStatParticipationPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Münzen pro Mitspieler-Teilnahme</label>
              <NumberInput min="0" value={participationCoins}
                onChange={e => setParticipationCoins(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
              <LimitHint value={participationCoins} max={lim?.participationCoins} />
            </div>
          </div>
          {spectatorMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Punkte pro Zuschauer-Teilnahme <span className="text-gray-500 font-normal">(Reihentabelle)</span></label>
                <NumberInput min="0" value={statSpectatorParticipationPts}
                  onChange={e => setStatSpectatorParticipationPts(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Münzen pro Zuschauer-Teilnahme</label>
                <NumberInput min="0" value={spectatorCoins}
                  onChange={e => setSpectatorCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
                <LimitHint value={spectatorCoins} max={lim?.spectatorCoins} />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={statPtsToGlobalRanking}
              onChange={e => setStatPtsToGlobalRanking(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-xs text-gray-300">Tabellenpunkte bei Event-Abschluss auf die Rangliste übertragen</span>
          </label>
          {statRows.some(r => r.field.trim()) && (
            <p className="text-xs text-gray-500">
              Punkte aus Statistiken (aus „Statistiken &amp; Events“):{" "}
              {statRows.filter(r => r.field.trim()).map(r => `${r.field} ×${r.pointsPer}`).join(" · ")}
            </p>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-200">Umfragen</p>
          {polls.length < 5 && (
            <button type="button" onClick={addPoll}
              className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Hinzufügen
            </button>
          )}
        </div>
        {polls.length === 0 && <p className="text-xs text-gray-600">Keine Umfragen konfiguriert.</p>}
        <div className="space-y-3">
          {polls.map((poll, i) => (
            <div key={i} className="rounded-xl p-4 border border-violet-500/20 bg-violet-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-violet-300">Umfrage {i + 1}</p>
                <button type="button" onClick={() => removePoll(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Label (z.B. MVP)</label>
                  <input type="text" value={poll.label} onChange={e => updatePoll(i, { label: e.target.value })}
                    placeholder="MVP" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Frage</label>
                  <input type="text" value={poll.question} onChange={e => updatePoll(i, { question: e.target.value })}
                    placeholder="Wer war der MVP?" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Wer darf abstimmen?</label>
                  <select value={poll.voterEligibility} onChange={e => updatePoll(i, { voterEligibility: e.target.value as PollConfig["voterEligibility"] })}
                    className={inputCls} style={inputStyle}>
                    <option value="all">Alle App-Mitglieder</option>
                    <option value="participants">Mitspieler + Zuschauer</option>
                    <option value="players">Nur Mitspieler</option>
                    <option value="spectators">Nur Zuschauer</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Antwortoptionen</label>
                  <select value={poll.answerType} onChange={e => updatePoll(i, { answerType: e.target.value as PollConfig["answerType"], customAnswers: [] })}
                    className={inputCls} style={inputStyle}>
                    <option value="players">Mitspieler des Events</option>
                    <option value="spectators">Zuschauer des Events</option>
                    <option value="custom">Eigene Antworten</option>
                  </select>
                </div>
              </div>
              {poll.answerType === "custom" && (
                <div>
                  <label className={labelCls}>Antworten (eine pro Zeile)</label>
                  <textarea rows={3}
                    value={poll.customAnswers.join("\n")}
                    onChange={e => updatePoll(i, { customAnswers: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                    placeholder={"Option A\nOption B\nOption C"}
                    className={`${inputCls} resize-none`} style={inputStyle} />
                </div>
              )}
              {/* Dauer ab Ende der Spielphase (startOffsetHours bleibt 0, endOffsetHours = Dauer) */}
              <div>
                <label className={labelCls}>Dauer der Abstimmung (Std.)</label>
                <NumberInput min="1" value={Math.max(1, poll.endOffsetHours - poll.startOffsetHours)}
                  onChange={e => updatePoll(i, { startOffsetHours: 0, endOffsetHours: Math.max(1, Number(e.target.value)) })}
                  className={inputCls} style={inputStyle} />
                <p className="text-xs text-gray-500 mt-1">
                  Startet, sobald die Spielphase abgeschlossen ist (oder per Widget-Knopf). Die Teilnahme-Belohnung gibt es
                  einmal pro Event: den höchsten Betrag aller Umfragen, bei denen man abstimmt. Bei Gleichstand bekommen alle
                  Gleichplatzierten die volle Sieger-Belohnung.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Belohnung Abstimmung — Münzen</label>
                  <NumberInput min="0" value={poll.participationCoins}
                    onChange={e => updatePoll(i, { participationCoins: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                  <LimitHint value={poll.participationCoins} max={lim?.pollParticipationCoins} />
                </div>
                <div>
                  <label className={labelCls}>Belohnung Abstimmung — Tabellenpunkte</label>
                  <NumberInput min="0" value={poll.participationSeriesPoints}
                    onChange={e => updatePoll(i, { participationSeriesPoints: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Sieger-Belohnung — Münzen</label>
                  <NumberInput min="0" value={poll.winnerCoins}
                    onChange={e => updatePoll(i, { winnerCoins: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                  <LimitHint value={poll.winnerCoins} max={lim?.pollWinnerCoins} />
                </div>
                <div>
                  <label className={labelCls}>Sieger-Belohnung — Tabellenpunkte</label>
                  <NumberInput min="0" value={poll.winnerRankPoints}
                    onChange={e => updatePoll(i, { winnerRankPoints: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
