"use client";
import { ChevronRight } from "@/components/icons";
import { Plus, X, Coins, MessageSquare } from "@/components/icons";
import RankPointsIcon from "@/components/RankPointsIcon";
import { NumberInput } from "@/components/ui/NumberInput";
import { inputCls, PollConfig, DEFAULT_POLL_ITEM, Section } from "./series-shared";
import { LimitHint } from "../../neu/wizard/shared";
import type { SeriesDetail } from "./useSeriesDetail";

/** Reiter "Umfragen" der Reihe. */
export default function SeriesTabPolls({ ctx }: { ctx: SeriesDetail }) {
  const { rewardLimits, isArchived, polls, setPolls, expandedPoll, setExpandedPoll, lockedNotice } = ctx;
  return (
    <>
          {lockedNotice}
          <fieldset disabled={isArchived} className="space-y-4 min-w-0 border-0 p-0 m-0">
          {/* Poll-Konfiguration */}
          <Section title="Umfragen">
            <div className="space-y-2">
              {polls.map((p, i) => (
                <div key={i} className="rounded-lg border border-line bg-surface-2 overflow-hidden">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedPoll(expandedPoll === i ? null : i)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface-2 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{p.label || `Umfrage ${i + 1}`}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setPolls(prev => prev.filter((_, j) => j !== i)); if (expandedPoll === i) setExpandedPoll(null); }}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      ><X className="w-3.5 h-3.5" /></button>
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expandedPoll === i ? "rotate-90" : ""}`} />
                    </div>
                  </button>
                  {expandedPoll === i && (
                    <div className="px-3 pb-3 space-y-3 border-t border-line pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Label (interner Name)</label>
                          <input type="text" value={p.label}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                            placeholder="z.B. MVP" className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Wer darf abstimmen</label>
                          <select value={p.voterEligibility}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, voterEligibility: e.target.value as PollConfig["voterEligibility"] } : x))}
                            className={inputCls}>
                            <option value="all">Alle App-Mitglieder</option>
                            <option value="participants">Mitspieler + Zuschauer</option>
                            <option value="players">Nur Mitspieler</option>
                            <option value="spectators">Nur Zuschauer</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Frage</label>
                        <input type="text" value={p.question}
                          onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                          placeholder="z.B. Wer war der MVP?" className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Antwort-Typ</label>
                        <select value={p.answerType}
                          onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, answerType: e.target.value as PollConfig["answerType"], customAnswers: [] } : x))}
                          className={inputCls}>
                          <option value="players">Mitspieler des Events</option>
                          <option value="spectators">Zuschauer des Events</option>
                          <option value="custom">Eigene Antworten</option>
                        </select>
                      </div>
                      {p.answerType === "custom" && (
                        <div className="space-y-1.5">
                          {p.customAnswers.map((ans, ai) => (
                            <div key={ai} className="flex gap-2">
                              <input type="text" value={ans}
                                onChange={e => setPolls(prev => prev.map((x, j) => {
                                  if (j !== i) return x;
                                  const ca = [...x.customAnswers]; ca[ai] = e.target.value; return { ...x, customAnswers: ca };
                                }))}
                                placeholder={`Antwort ${ai + 1}`} className={inputCls} />
                              <button type="button"
                                onClick={() => setPolls(prev => prev.map((x, j) => j !== i ? x : { ...x, customAnswers: x.customAnswers.filter((_, k) => k !== ai) }))}
                                className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          <button type="button"
                            onClick={() => setPolls(prev => prev.map((x, j) => j !== i ? x : { ...x, customAnswers: [...x.customAnswers, ""] }))}
                            className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300">
                            <Plus className="w-3 h-3" /> Antwort hinzufügen
                          </button>
                        </div>
                      )}
                      {/* Dauer ab Ende der Spielphase (startOffsetHours bleibt 0, endOffsetHours = Dauer) */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Dauer der Abstimmung (Stunden)</label>
                        <NumberInput min={1} value={Math.max(1, p.endOffsetHours - p.startOffsetHours)}
                          onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, startOffsetHours: 0, endOffsetHours: Math.max(1, Number(e.target.value)) } : x))}
                          className={inputCls} />
                        <p className="text-[11px] text-gray-500 mt-1">
                  Startet, sobald die Spielphase abgeschlossen ist (oder per Widget-Knopf). Die Teilnahme-Belohnung gibt es
                  einmal pro Event: den höchsten Betrag aller Umfragen, bei denen man abstimmt. Bei Gleichstand bekommen alle
                  Gleichplatzierten die volle Sieger-Belohnung.
                </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Teilnahme-Münzen</label>
                          <NumberInput min={0} value={p.participationCoins}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, participationCoins: Number(e.target.value) } : x))}
                            className={inputCls} />
                          <LimitHint value={p.participationCoins} max={rewardLimits?.pollParticipationCoins} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={12} /> Teilnahme-Tabellenpunkte</label>
                          <NumberInput min={0} value={p.participationSeriesPoints}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, participationSeriesPoints: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Sieger-Münzen</label>
                          <NumberInput min={0} value={p.winnerCoins}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, winnerCoins: Number(e.target.value) } : x))}
                            className={inputCls} />
                          <LimitHint value={p.winnerCoins} max={rewardLimits?.pollWinnerCoins} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={12} /> Sieger-Rang-Punkte</label>
                          <NumberInput min={0} value={p.winnerRankPoints}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, winnerRankPoints: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {polls.length < 5 && (
                <button type="button"
                  onClick={() => { setPolls(prev => [...prev, { ...DEFAULT_POLL_ITEM }]); setExpandedPoll(polls.length); }}
                  className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300 transition-colors">
                  <Plus className="w-3 h-3" /> Umfrage hinzufügen
                </button>
              )}
            </div>
          </Section>
          </fieldset>
          </>
  );
}
