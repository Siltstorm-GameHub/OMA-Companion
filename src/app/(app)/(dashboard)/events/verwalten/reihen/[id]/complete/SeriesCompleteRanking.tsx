"use client";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { GripVertical } from "@/components/icons";
import { ListOrdered, AlertTriangle, RotateCcw, Equal } from "@/components/icons";
import { MEDALS, userName, Avatar } from "./series-complete-shared";
import type { SeriesComplete } from "./useSeriesComplete";

/** Gesamtplatzierung der Saison (Endtabelle, Gleichstand, Belohnungen). */
export default function SeriesCompleteRanking({ ctx }: { ctx: SeriesComplete }) {
  const { statFields, participants, userStats, rewardsConfig, rankingOrder, tiedAbove, rankingManuallyEdited, dragIdx, setDragIdx, placementMap, autoSort, toggleTied, moveUp, moveDown, onDragStart, onDragOver } = ctx;
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <ListOrdered className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-blue-300">Gesamtplatzierung</span>
                <span className="text-xs text-gray-600">— auto-sortiert nach Gesamtpunkten</span>
                {rankingManuallyEdited && (
                  <>
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3" /> manuell geändert
                    </span>
                    <button onClick={autoSort}
                      className="ml-auto flex items-center gap-1 text-xs text-blue-400/60 hover:text-blue-300 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Zurücksetzen
                    </button>
                  </>
                )}
              </div>

              {/* Ties info */}
              {tiedAbove.size > 0 && (
                <p className="text-xs text-blue-400/60 flex items-center gap-1">
                  <Equal className="w-3 h-3" />
                  {tiedAbove.size} Gleichstand – beide erhalten dieselbe Platzierung
                </p>
              )}

              <p className="text-xs text-gray-600">
                Anhand dieser Endplatzierung werden die unter „Belohnungen (Endplatzierung der Eventreihe)" konfigurierten Münzen &amp; Rang-Punkte vergeben.
              </p>

              <div className="space-y-1">
                {rankingOrder.map((uid, idx) => {
                  const u = participants.find(p => p.id === uid);
                  if (!u) return null;
                  const place    = placementMap.get(uid) ?? idx + 1;
                  const isTied   = tiedAbove.has(uid);
                  const pts      = userStats[uid]?.totalPoints ?? 0;
                  const medal    = MEDALS[place - 1] ?? null;
                  const reward   = rewardsConfig.placements.find(p => p.place === place);

                  return (
                    <div
                      key={uid}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={e => onDragOver(e, idx)}
                      onDragEnd={() => setDragIdx(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border transition-colors cursor-grab active:cursor-grabbing ${
                        isTied ? "border-blue-500/30 bg-blue-500/[0.04]" : "border-line"
                      } ${dragIdx === idx ? "opacity-50" : ""}`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      <span className="text-xs font-bold text-gray-500 w-5 text-center shrink-0">
                        {medal ?? `${place}.`}
                      </span>
                      <Avatar u={u} size={6} />
                      <span className="flex-1 text-sm text-white truncate">{userName(u)}</span>
                      {/* Stats */}
                      <span className="text-xs text-teal-400 font-semibold tabular-nums">
                        {pts} Pkt.
                      </span>
                      {statFields.map(f => {
                        const v = userStats[uid]?.[f];
                        if (!v) return null;
                        return <span key={f} className="text-xs text-gray-500 tabular-nums">{f}: {v}</span>;
                      })}
                      {/* Endplatzierungs-Belohnung */}
                      {reward && (reward.coins > 0 || reward.rankPoints > 0) && (
                        <span className="flex items-center gap-1.5 shrink-0">
                          {reward.coins > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-400 tabular-nums">
                              +{reward.coins} <CoinIcon size={11} />
                            </span>
                          )}
                          {reward.rankPoints > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-teal-400 tabular-nums">
                              +{reward.rankPoints} <RankPointsIcon size={11} />
                            </span>
                          )}
                        </span>
                      )}
                      {/* Tied toggle */}
                      {idx > 0 && (
                        <button
                          type="button"
                          title={isTied ? "Gleichstand aufheben" : "Gleichstand mit vorherigem Platz"}
                          onClick={() => toggleTied(uid)}
                          className={`flex items-center shrink-0 p-1 rounded transition-colors ${
                            isTied ? "text-blue-400 hover:text-blue-300" : "text-gray-600 hover:text-gray-400"
                          }`}
                        >
                          <Equal className="w-3 h-3" />
                        </button>
                      )}
                      {/* Move buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                          className="text-[8px] text-gray-600 hover:text-gray-300 disabled:opacity-20 leading-none px-0.5">▲</button>
                        <button type="button" onClick={() => moveDown(idx)} disabled={idx === rankingOrder.length - 1}
                          className="text-[8px] text-gray-600 hover:text-gray-300 disabled:opacity-20 leading-none px-0.5">▼</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
  );
}
