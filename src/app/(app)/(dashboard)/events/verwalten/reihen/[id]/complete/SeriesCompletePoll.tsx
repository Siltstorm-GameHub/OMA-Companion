"use client";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { Vote } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { inputCls, numCls } from "./series-complete-shared";
import type { SeriesComplete } from "./useSeriesComplete";

/** Saison-Abstimmung einrichten (erster Abschluss). */
export default function SeriesCompletePoll({ ctx }: { ctx: SeriesComplete }) {
  const { pollEnabled, setPollEnabled, pollQuestion, setPollQuestion, pollCoins, setPollCoins, pollRankPts, setPollRankPts } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pollEnabled} onChange={e => setPollEnabled(e.target.checked)}
                  className="rounded accent-violet-500" />
                <Vote className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Abstimmung zum Abschluss</span>
              </label>

              {pollEnabled && (
                <div className="space-y-3 mt-1">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Abstimmungsthema</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                      placeholder="z.B. MVP der Saison, Trostpreis, …" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={11} /> Punkte Gewinner</label>
                      <NumberInput min={0} value={pollRankPts} onChange={e => setPollRankPts(Number(e.target.value))} className={numCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><CoinIcon size={11} /> Münzen Gewinner</label>
                      <NumberInput min={0} value={pollCoins} onChange={e => setPollCoins(Number(e.target.value))} className={numCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>
  );
}
