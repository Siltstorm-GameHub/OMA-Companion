"use client";
import PlaceMedal from "@/components/PlaceMedal";
import { Trash2, Plus } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { NumberInput } from "@/components/ui/NumberInput";
import { PollConfig, inputCls, numCls, labelCls } from "./edit-shared";
import { LimitHint } from "../neu/wizard/shared";
import type { EventEdit } from "./useEventEdit";

/** Reiter "Belohnungen": Teilnahme, Platzierungen, Zuschauer, Umfragen. */
export default function TabRewards({ ctx }: { ctx: EventEdit }) {
  const { event, participationCoins, setParticipationCoins, placements, participationRankPts, setParticipationRankPts, hasPlacement, polls, spectatorCoins, setSpectatorCoins, spectatorRankPts, setSpectatorRankPts, updatePlacement, addPoll, updatePoll, removePoll, rewardLimits: lim } = ctx;
  // Mitglieder: Obergrenze je Platz (Platz 1–3 eigene Werte, danach placementCoinsOther / 0 RP)
  const placeLimit = (place: number) => lim ? { coins: lim.placementCoins[place - 1] ?? lim.placementCoinsOther, rankPoints: lim.placementRankPoints[place - 1] ?? 0 } : null;
  const placementsOver = lim ? placements.some(p => { const l = placeLimit(p.place)!; return p.coins > l.coins || p.rankPoints > l.rankPoints; }) : false;
  return (
    <div className="space-y-4">
          {event.series && (
            <p className="text-xs text-gray-500">
              Teilnahme- und Platzierungsbelohnungen legt die Eventreihe „{event.series.name}“ fest. Hier stellst du nur die Umfragen dieses Termins ein.
            </p>
          )}
          {!event.series && (
            <>
              {/* Teilnahme */}
              <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CoinIcon size={16} />
                  <h3 className="text-sm font-semibold text-gray-300">Teilnahme-Belohnung</h3>
                </div>
                <p className="text-[11px] text-gray-600">Wird erst nach Event-Abschluss vergeben</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Münzen</label>
                    <NumberInput min={0} value={participationCoins} onChange={e => setParticipationCoins(Number(e.target.value))} className={inputCls} />
                    <LimitHint value={participationCoins} max={lim?.participationCoins} />
                  </div>
                  <div>
                    <label className={labelCls}>Rang-Punkte</label>
                    <NumberInput min={0} value={participationRankPts} onChange={e => setParticipationRankPts(Number(e.target.value))} className={inputCls} />
                    <LimitHint value={participationRankPts} max={lim?.participationRankPts} />
                  </div>
                </div>
                {!hasPlacement && (
                  <p className="text-[11px] text-gray-500">Ohne Platzierung: kein Sieger, alle Teilnehmer bekommen nur diese Teilnahme-Belohnung.</p>
                )}
              </div>

              {/* Platzierungen (nur Turniere) */}
              {hasPlacement && (
              <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-300">Platzierungs-Belohnungen</h3>
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center text-xs text-gray-500 px-1">
                  <span />
                  <span>Platz</span>
                  <span className="flex items-center gap-1 justify-center"><RankPointsIcon size={12} /> RP</span>
                  <span className="flex items-center gap-1 justify-center"><CoinIcon size={12} /> Münzen</span>
                </div>
                {placements.map((p, i) => (
                  <div key={p.place} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
                    <span className="text-base"><PlaceMedal place={p.place} /></span>
                    <span className="text-sm text-gray-300">{p.place}. Platz</span>
                    <NumberInput min={0} value={p.rankPoints}
                      onChange={e => updatePlacement(p.place, "rankPoints", Number(e.target.value))}
                      className={numCls} />
                    <NumberInput min={0} value={p.coins}
                      onChange={e => updatePlacement(p.place, "coins", Number(e.target.value))}
                      className={numCls} />
                  </div>
                ))}
                {lim && (
                  <p className={`text-[11px] ${placementsOver ? "text-amber-300" : "text-gray-500"}`}>
                    Höchstens: {placements.map(p => { const l = placeLimit(p.place)!; return `${p.place}. ${l.coins} Münzen${l.rankPoints ? `, ${l.rankPoints} RP` : ""}`; }).join(" · ")}
                    {placementsOver && ". Zu hohe Werte werden beim Speichern gekürzt."}
                  </p>
                )}
              </div>
              )}

              {/* Zuschauer-Belohnung */}
              {ctx.spectatorMode && (
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-teal-300">👁️ Zuschauer-Basis-Belohnung</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Münzen</label>
                      <NumberInput min={0} value={spectatorCoins} onChange={e => setSpectatorCoins(Number(e.target.value))} className={inputCls} />
                    <LimitHint value={spectatorCoins} max={lim?.spectatorCoins} />
                    </div>
                    <div>
                      <label className={labelCls}>Rang-Punkte</label>
                      <NumberInput min={0} value={spectatorRankPts} onChange={e => setSpectatorRankPts(Number(e.target.value))} className={inputCls} />
                    <LimitHint value={spectatorRankPts} max={lim?.spectatorRankPoints} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Polls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">Umfragen</h3>
              {polls.length < 3 && (
                <button type="button" onClick={addPoll}
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Hinzufügen
                </button>
              )}
            </div>
            {polls.length === 0 && <p className="text-xs text-gray-600">Keine Umfragen konfiguriert.</p>}
            {polls.map((poll, i) => (
              <div key={i} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-300">Umfrage {i + 1}</p>
                  <button type="button" onClick={() => removePoll(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Label (z.B. MVP)</label>
                    <input type="text" value={poll.label} onChange={e => updatePoll(i, { label: e.target.value })}
                      placeholder="MVP" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Frage</label>
                    <input type="text" value={poll.question} onChange={e => updatePoll(i, { question: e.target.value })}
                      placeholder="Wer war der MVP?" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Wer darf abstimmen?</label>
                    <select value={poll.voterEligibility}
                      onChange={e => updatePoll(i, { voterEligibility: e.target.value as PollConfig["voterEligibility"] })}
                      className={inputCls}>
                      <option value="all">Alle App-Mitglieder</option>
                      <option value="participants">Mitspieler + Zuschauer</option>
                      <option value="players">Nur Mitspieler</option>
                      <option value="spectators">Nur Zuschauer</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Antwortoptionen</label>
                    <select value={poll.answerType}
                      onChange={e => updatePoll(i, { answerType: e.target.value as PollConfig["answerType"], customAnswers: [] })}
                      className={inputCls}>
                      <option value="players">Mitspieler des Events</option>
                      <option value="spectators">Zuschauer des Events</option>
                      <option value="custom">Eigene Antworten</option>
                    </select>
                  </div>
                </div>
                {poll.answerType === "custom" && (
                  <div className="space-y-1.5">
                    {poll.customAnswers.map((ans, ai) => (
                      <div key={ai} className="flex gap-2">
                        <input type="text" value={ans}
                          onChange={e => {
                            const ca = [...poll.customAnswers]; ca[ai] = e.target.value;
                            updatePoll(i, { customAnswers: ca });
                          }}
                          placeholder={`Antwort ${ai + 1}`} className={inputCls} />
                        <button type="button"
                          onClick={() => updatePoll(i, { customAnswers: poll.customAnswers.filter((_, k) => k !== ai) })}
                          className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => updatePoll(i, { customAnswers: [...poll.customAnswers, ""] })}
                      className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300">
                      <Plus className="w-3 h-3" /> Antwort hinzufügen
                    </button>
                  </div>
                )}
                {/* Dauer ab Ende der Spielphase (startOffsetHours bleibt 0, endOffsetHours = Dauer) */}
                <div>
                  <label className={labelCls}>Dauer der Abstimmung (Std.)</label>
                  <NumberInput min={1} value={Math.max(1, poll.endOffsetHours - poll.startOffsetHours)}
                    onChange={e => updatePoll(i, { startOffsetHours: 0, endOffsetHours: Math.max(1, Number(e.target.value)) })} className={inputCls} />
                  <p className="text-[11px] text-gray-500 mt-1">
                  Startet, sobald die Spielphase abgeschlossen ist (oder per Widget-Knopf). Die Teilnahme-Belohnung gibt es
                  einmal pro Event: den höchsten Betrag aller Umfragen, bei denen man abstimmt. Bei Gleichstand bekommen alle
                  Gleichplatzierten die volle Sieger-Belohnung.
                </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Belohnung Abstimmung — Münzen</label>
                    <NumberInput min={0} value={poll.participationCoins}
                      onChange={e => updatePoll(i, { participationCoins: Number(e.target.value) })} className={inputCls} />
                    <LimitHint value={poll.participationCoins} max={lim?.pollParticipationCoins} />
                  </div>
                  <div>
                    <label className={labelCls}>Belohnung Abstimmung — Tabellenpunkte</label>
                    <NumberInput min={0} value={poll.participationSeriesPoints}
                      onChange={e => updatePoll(i, { participationSeriesPoints: Number(e.target.value) })} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Sieger-Belohnung — Münzen</label>
                    <NumberInput min={0} value={poll.winnerCoins}
                      onChange={e => updatePoll(i, { winnerCoins: Number(e.target.value) })} className={inputCls} />
                    <LimitHint value={poll.winnerCoins} max={lim?.pollWinnerCoins} />
                  </div>
                  <div>
                    <label className={labelCls}>Sieger-Belohnung — Tabellenpunkte</label>
                    <NumberInput min={0} value={poll.winnerRankPoints}
                      onChange={e => updatePoll(i, { winnerRankPoints: Number(e.target.value) })} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
  );
}
