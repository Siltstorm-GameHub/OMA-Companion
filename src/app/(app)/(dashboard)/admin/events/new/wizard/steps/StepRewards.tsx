"use client";
import PlaceMedal from "@/components/PlaceMedal";
import Image from "next/image";
import { Plus, Trash2 } from "@/components/icons";
import StatRowsEditor from "@/components/admin/StatRowsEditor";
import InfoTooltip from "@/components/InfoTooltip";
import { PollConfig, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 3: Belohnungen (shared, with stat config for series tournament) ──────
export default function StepRewards({ w }: { w: EventWizard }) {
  const { eventType, spectatorMode, seriesMode, gemsParticipationPack, setGemsParticipationPack, gemsPlacementPacks, setGemsPlacementPacks, isGemsTournament, statParticipationPts, setStatParticipationPts, statSpectatorParticipationPts, setStatSpectatorParticipationPts, statPtsToGlobalRanking, setStatPtsToGlobalRanking, statRows, setStatRows, participationCoins, setParticipationCoins, participationRankPts, setParticipationRankPts, placements, setPlacements, spectatorCoins, setSpectatorCoins, spectatorRankPts, setSpectatorRankPts, polls, isEventMode, isSeriesMode, belongsToSeries, addPoll, updatePoll, removePoll } = w;
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 border border-white/8 bg-white/2">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/Muenze Icon.png" alt="Münzen" width={20} height={20} />
          <p className="text-sm font-medium text-gray-200">Teilnahme-Belohnung</p>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">Wird erst nach Event-Abschluss vergeben</p>
        <div className={(belongsToSeries || eventType === "community") ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
          {!belongsToSeries && (
            <div>
              <label className={labelCls}>Münzen</label>
              <input type="number" min="0" value={participationCoins}
                onChange={e => setParticipationCoins(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          )}
          {eventType !== "community" && (
            <div>
              <label className={labelCls}>Rang-Punkte <span className="text-gray-500 font-normal">(→ Gesamtrangliste)</span></label>
              <input type="number" min="0" value={participationRankPts}
                onChange={e => setParticipationRankPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          )}
        </div>
        {isSeriesMode && (
          <p className="text-[11px] text-gray-500 mt-2">Münzen pro Teilnahme: siehe „📊 Gesamttabelle" weiter unten.</p>
        )}
        {isEventMode && seriesMode !== "none" && (
          <p className="text-[11px] text-gray-500 mt-2">Münzen pro Teilnahme sind seriesweit in der Gesamttabellen-Konfiguration der Eventreihe eingestellt.</p>
        )}
        {isGemsTournament && (
          <div className="mt-3">
            <label className={labelCls}>Karten-Pack <span className="text-gray-500 font-normal">(optional, zusätzlich zu den Münzen)</span></label>
            <select value={gemsParticipationPack}
              onChange={e => setGemsParticipationPack(e.target.value as typeof gemsParticipationPack)}
              className={inputCls} style={inputStyle}>
              <option value="">Kein Pack</option>
              <option value="STANDARD">Standard-Pack</option>
              <option value="PREMIUM">Premium-Pack</option>
              <option value="COMMUNITY">Community-Pack</option>
            </select>
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 border border-white/8 bg-white/2">
        <p className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-1.5">
          Platzierungs-Belohnungen
          <InfoTooltip text="Münzen und Rang-Punkte, die je nach Endplatzierung im Turnier vergeben werden (🥇 1. Platz, 🥈 2. Platz, 🥉 3. Platz). Wird erst vergeben, wenn das Event/Turnier abgeschlossen und die finale Platzierung eingetragen ist." />
        </p>
        <div className="space-y-2">
          {placements.map((p, i) => (
            <div key={p.place} className="flex items-center gap-3">
              <span className="text-sm w-5 shrink-0"><PlaceMedal place={i + 1} /></span>
              <div className={eventType === "community" ? "flex-1 grid grid-cols-1 gap-2" : "flex-1 grid grid-cols-2 gap-2"}>
                <div>
                  <label className={labelCls}>Münzen</label>
                  <input type="number" min="0" value={p.coins}
                    onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, coins: Number(e.target.value) } : pp))}
                    className={inputCls} style={inputStyle} />
                </div>
                {eventType !== "community" && (
                  <div>
                    <label className={labelCls}>Rang-Punkte</label>
                    <input type="number" min="0" value={p.rankPoints}
                      onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, rankPoints: Number(e.target.value) } : pp))}
                      className={inputCls} style={inputStyle} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isGemsTournament && (
            <div className="grid grid-cols-3 gap-3 pt-1">
              {gemsPlacementPacks.map((pack, i) => (
                <div key={i}>
                  <label className={labelCls}><PlaceMedal place={i + 1} /> Karten-Pack <span className="text-gray-500 font-normal">(optional)</span></label>
                  <select value={pack}
                    onChange={e => setGemsPlacementPacks(prev => prev.map((pp, ii) => ii === i ? e.target.value as typeof pp : pp))}
                    className={inputCls} style={inputStyle}>
                    <option value="">Kein Pack</option>
                    <option value="STANDARD">Standard-Pack</option>
                    <option value="PREMIUM">Premium-Pack</option>
                    <option value="COMMUNITY">Community-Pack</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {spectatorMode && (
        <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5">
          <p className="text-sm font-medium text-teal-300 mb-3">👁️ Zuschauer-Basis-Belohnung</p>
          <div className={belongsToSeries ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
            {!belongsToSeries && (
              <div>
                <label className={labelCls}>Münzen</label>
                <input type="number" min="0" value={spectatorCoins}
                  onChange={e => setSpectatorCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            )}
            <div>
              <label className={labelCls}>Rang-Punkte <span className="text-gray-500 font-normal">(→ Gesamtrangliste)</span></label>
              <input type="number" min="0" value={spectatorRankPts}
                onChange={e => setSpectatorRankPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          {isSeriesMode && (
            <p className="text-[11px] text-gray-500 mt-2">Münzen pro Zuschauer-Teilnahme: siehe „📊 Gesamttabelle" weiter unten.</p>
          )}
          {isEventMode && seriesMode !== "none" && (
            <p className="text-[11px] text-gray-500 mt-2">Münzen pro Zuschauer-Teilnahme sind seriesweit in der Gesamttabellen-Konfiguration der Eventreihe eingestellt.</p>
          )}
        </div>
      )}

      {isSeriesMode && (
        <div className="rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5 space-y-3">
          <p className="text-sm font-medium text-indigo-300">📊 Gesamttabelle</p>
          <p className="text-[11px] text-gray-500 -mt-1">
            Die Saison-Rangliste der ganzen Reihe (Ligapunkte, über alle Events aufsummiert). Die
            Stat-Felder hier sind die <strong className="text-gray-400">Punkte-Formel</strong> — sie
            zählen nur, wenn ein Event in Schritt 5 („Event-Einstellungen") einen{" "}
            <em>gleichnamigen</em> Stat tatsächlich erfasst.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Punkte pro Mitspieler-Teilnahme <span className="text-gray-500 font-normal">(Ligatabelle)</span></label>
              <input type="number" min="0" value={statParticipationPts}
                onChange={e => setStatParticipationPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Münzen pro Mitspieler-Teilnahme</label>
              <input type="number" min="0" value={participationCoins}
                onChange={e => setParticipationCoins(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          {spectatorMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Punkte pro Zuschauer-Teilnahme <span className="text-gray-500 font-normal">(Ligatabelle)</span></label>
                <input type="number" min="0" value={statSpectatorParticipationPts}
                  onChange={e => setStatSpectatorParticipationPts(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Münzen pro Zuschauer-Teilnahme</label>
                <input type="number" min="0" value={spectatorCoins}
                  onChange={e => setSpectatorCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={statPtsToGlobalRanking}
              onChange={e => setStatPtsToGlobalRanking(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-xs text-gray-300">Tabellenpunkte bei Event-Abschluss auf Gesamtrangliste übertragen</span>
          </label>
          {eventType === "tournament" && (
            <StatRowsEditor
              rows={statRows}
              onChange={setStatRows}
              accentClassName="text-indigo-400 hover:text-indigo-300"
              inputClassName={`${inputCls}`}
              inputStyle={inputStyle}
            />
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Start (Std. nach Event-Start)</label>
                  <input type="number" min="0" value={poll.startOffsetHours}
                    onChange={e => updatePoll(i, { startOffsetHours: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Ende (Std. nach Event-Start)</label>
                  <input type="number" min="1" value={poll.endOffsetHours}
                    onChange={e => updatePoll(i, { endOffsetHours: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Belohnung Abstimmung — Münzen</label>
                  <input type="number" min="0" value={poll.participationCoins}
                    onChange={e => updatePoll(i, { participationCoins: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Belohnung Abstimmung — Ligapunkte</label>
                  <input type="number" min="0" value={poll.participationSeriesPoints}
                    onChange={e => updatePoll(i, { participationSeriesPoints: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Sieger-Belohnung — Münzen</label>
                  <input type="number" min="0" value={poll.winnerCoins}
                    onChange={e => updatePoll(i, { winnerCoins: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Sieger-Belohnung — Ligapunkte</label>
                  <input type="number" min="0" value={poll.winnerRankPoints}
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
