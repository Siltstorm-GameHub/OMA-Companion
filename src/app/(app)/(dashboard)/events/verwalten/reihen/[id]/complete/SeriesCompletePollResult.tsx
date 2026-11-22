"use client";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { Vote } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { inputCls, numCls, userName, Avatar } from "./series-complete-shared";
import type { SeriesComplete } from "./useSeriesComplete";

/** Saison-Abstimmung: Kandidaten ausschließen und Ergebnis eintragen. */
export default function SeriesCompletePollResult({ ctx }: { ctx: SeriesComplete }) {
  const { participants, isPollOnly, pollQuestion, setPollQuestion, pollCoins, setPollCoins, pollRankPts, setPollRankPts, pollExcluded, setPollExcluded, pollVotes, setPollVotes, pollEligible, pollWinners } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
              {isPollOnly && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Vote className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-300">Abstimmungsergebnis nachtragen</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Thema</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                      placeholder="Abstimmungsthema" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={11} /> Punkte Gewinner</label>
                      <NumberInput min={0} value={pollRankPts} onChange={e => setPollRankPts(Number(e.target.value))} className={numCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CoinIcon size={11} /> Münzen Gewinner</label>
                      <NumberInput min={0} value={pollCoins} onChange={e => setPollCoins(Number(e.target.value))} className={numCls} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Kandidaten ({pollEligible.length}/{participants.length}) — klicken zum Ausschließen
                </p>
                <div className="flex flex-wrap gap-2">
                  {participants.map(u => {
                    const excluded = pollExcluded.has(u.id);
                    return (
                      <button key={u.id} type="button"
                        onClick={() => setPollExcluded(prev => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s; })}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                          excluded
                            ? "bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50"
                            : "bg-violet-500/10 border-violet-500/15 text-violet-300 hover:border-red-500/30 hover:text-red-400"
                        }`}
                      >
                        <Avatar u={u} size={4} /> {userName(u)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ergebnis eintragen (Stimmen)</p>
                {pollEligible.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar u={u} size={5} />
                    <span className="flex-1 text-sm text-white">{userName(u)}</span>
                    <NumberInput
                      min={0}
                      value={pollVotes[u.id] ?? 0}
                      onChange={e => setPollVotes(prev => ({ ...prev, [u.id]: Number(e.target.value) }))}
                      className="w-20 rounded-lg px-3 py-1.5 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-violet-500/50 transition-colors tabular-nums"
                    />
                  </div>
                ))}
              </div>

              {pollWinners.length > 0 && (
                <div className="rounded-lg px-3 py-2 bg-violet-500/10 border border-violet-500/20">
                  <p className="text-xs text-violet-400 font-medium">
                    Gewinner: {pollWinners.map(id => {
                      const u = participants.find(p => p.id === id);
                      return u ? userName(u) : id;
                    }).join(", ")}
                  </p>
                </div>
              )}
            </div>
  );
}
