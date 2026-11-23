"use client";
import { useState } from "react";
import { formatDecimal, formatFixed } from "@/lib/format-number";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import AvgDirectionToggle from "@/components/AvgDirectionToggle";
import { GripVertical } from "@/components/icons";
import { Ban } from "@/components/icons";
import { Trophy, AlertTriangle, AlertCircle, RotateCcw, Equal, Lock, Flame } from "@/components/icons";
import { statDisplayName } from "@/lib/series-event-points";
import { inputCls, MEDALS, userName, Avatar } from "./complete-shared";
import type { EventComplete } from "./useEventComplete";

/** Abschnitt "Platzierung": Gewinner-Stat, Finale Platzierung, Disqualifikation, Notiz. */
export default function CompletePlacement({ ctx }: { ctx: EventComplete }) {
  // (10) Platz tauschen per Antippen (Ziehen per Maus geht nur am Desktop)
  const [pickIdx, setPickIdx] = useState<number | null>(null);
  function tapSwap(idx: number) {
    if (pickIdx === null) { setPickIdx(idx); return; }
    if (pickIdx === idx) { setPickIdx(null); return; }
    const a = pickIdx, b = idx;
    const ua = ctx.rankingOrder[a], ub = ctx.rankingOrder[b];
    ctx.setRankingManuallyEdited(true);
    ctx.setRankingDirty(true);
    ctx.setRankingOrder(prev => { const next = [...prev]; [next[a], next[b]] = [next[b], next[a]]; return next; });
    ctx.setTiedAbove(t => { const s = new Set(t); s.delete(ua); s.delete(ub); return s; });
    setPickIdx(null);
  }
  const { absentPlayers, toggleAbsent, seriesId, registeredUsers, tournamentStatFields, winnerStatFieldOptions, userStats, userAvgScore, currentDominionStreaks, isAvgFormat, isPollOnly, isFinishedSummary, winnerLocked, winnerStatField, setWinnerStatField, avgDirection, setAvgDirection, seriesWinnerTargetField, setSeriesWinnerTargetField, rankingOrder, setRankingOrder, tiedAbove, setTiedAbove, rankingNote, setRankingNote, rankingManuallyEdited, setRankingManuallyEdited, dragIdx, setDragIdx, setRankingDirty, excludedUsers, toggleExcluded, seriesStatFields, dominionCfg, dominionTriggerLabel, placementMap, previewWinners, effectiveParticipationCoins, getPlacementReward, winnerCheck, autoSort, toggleTied, moveUp, moveDown, stepNo, winnerSourceText, nameOf } = ctx;
  return (
    <section id="schritt-platzierung" aria-label="Platzierung" className="space-y-3 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span className="w-5 h-5 rounded-full bg-primary/15 text-primary-fg text-xs flex items-center justify-center">{stepNo("Platzierung")}</span>
          Platzierung festlegen
        </h2>

        {/* Gewinner-Stat: bewusst prominent — ein falscher Stat hat schon zu falschen Platzierungen geführt */}
        {(tournamentStatFields.length > 0 || isAvgFormat) && (
          <div className={`rounded-control border p-4 space-y-3 ${winnerLocked ? "border-line bg-surface-2" : "border-amber-500/30 bg-amber-500/[0.04]"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-fg">Gewinner-Stat</span>
              {winnerLocked ? (
                <span className="flex items-center gap-1 text-xs text-subtle"><Lock className="w-3 h-3" /> steht fest</span>
              ) : (
                <span className="text-xs text-subtle">{winnerSourceText}</span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {isAvgFormat ? (
                <div>
                  <AvgDirectionToggle
                    value={avgDirection}
                    disabled={winnerLocked}
                    onChange={v => {
                      setAvgDirection(v);
                      if (!rankingManuallyEdited) autoSort(winnerStatField, v);
                    }}
                  />
                  <p className="text-xs text-subtle mt-1">Bewertet wird der Durchschnitt pro Runde über alle Stats.</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-subtle block mb-1">Wer am meisten hiervon hat, gewinnt</label>
                  <select
                    value={winnerStatField}
                    disabled={winnerLocked}
                    onChange={e => {
                      setWinnerStatField(e.target.value);
                      if (!rankingManuallyEdited && e.target.value) autoSort(e.target.value);
                    }}
                    className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="">– kein Gewinner-Stat –</option>
                    {(winnerStatFieldOptions ?? tournamentStatFields).map(f => <option key={f} value={f}>{statDisplayName(f)}</option>)}
                  </select>
                </div>
              )}
              {seriesStatFields.length > 0 && (
                <div>
                  <label className="text-xs text-subtle block mb-1">Sieg in der Reihen-Tabelle zählen als</label>
                  <select
                    value={seriesWinnerTargetField}
                    disabled={winnerLocked}
                    onChange={e => setSeriesWinnerTargetField(e.target.value)}
                    className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="">– nicht zählen –</option>
                    {seriesStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Gewinner-Vorschau */}
            {previewWinners.length > 0 && (isAvgFormat || winnerStatField) && (
              <p className="text-sm text-fg">
                {previewWinners.length > 1 ? "Gewinner (Gleichstand): " : "Gewinner danach: "}
                <b className="text-amber-300">{previewWinners.map(nameOf).join(", ")}</b>
                {!isAvgFormat && winnerStatField && (
                  <span className="text-xs text-subtle">
                    {" "}({formatDecimal(userStats[previewWinners[0]]?.[winnerStatField] ?? 0)} {statDisplayName(winnerStatField)}
                    {winnerCheck.runnerUp && <>, vor {nameOf(winnerCheck.runnerUp.id)} mit {formatDecimal(winnerCheck.runnerUp.value)}</>})
                  </span>
                )}
                {isAvgFormat && <span className="text-xs text-subtle"> (Ø {formatFixed(userAvgScore[previewWinners[0]] ?? 0, 2)})</span>}
              </p>
            )}

            {/* Prüfungen */}
            {!winnerLocked && !isAvgFormat && winnerStatField && winnerCheck.compareField && winnerCheck.compareWinnerDiffers && (
              <p className="flex items-start gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>
                  Die Eventreihe entscheidet nach „{statDisplayName(winnerCheck.compareField)}“. Danach würde{" "}
                  <b>{winnerCheck.compareWinners.map(nameOf).join(", ")}</b> gewinnen.{" "}
                  <button type="button" className="underline hover:text-amber-200"
                    onClick={() => { const f = winnerCheck.compareField!; setWinnerStatField(f); autoSort(f); setRankingDirty(true); }}>
                    Nach „{statDisplayName(winnerCheck.compareField)}“ sortieren
                  </button>
                </span>
              </p>
            )}
            {!winnerLocked && !isAvgFormat && winnerStatField && winnerCheck.missing > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {winnerCheck.missing === registeredUsers.length - excludedUsers.size
                  ? <>Bei „{statDisplayName(winnerStatField)}“ hat niemand einen Wert. Stimmt der Stat?</>
                  : <>{winnerCheck.missing} {winnerCheck.missing === 1 ? "Spieler hat" : "Spieler haben"} bei „{statDisplayName(winnerStatField)}“ keinen Wert und {winnerCheck.missing === 1 ? "steht" : "stehen"} unten.</>}
              </p>
            )}
            {!isFinishedSummary && !isPollOnly && !isAvgFormat && !winnerStatField && (
              <p className="flex items-start gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                Kein Gewinner-Stat gewählt: Die Platzierung wird nicht automatisch sortiert, bitte von Hand prüfen.
              </p>
            )}
          </div>
        )}

          <div className="rounded-control p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-primary-fg">Reihenfolge</span>
              {!rankingManuallyEdited && (isAvgFormat || winnerStatField) && (
                <span className="text-xs text-subtle">
                  — auto-sortiert nach „{isAvgFormat ? `Ø (${avgDirection === "high" ? "höchster" : "niedrigster"} gewinnt)` : statDisplayName(winnerStatField)}“
                </span>
              )}
              {rankingManuallyEdited && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> manuell geändert
                </span>
              )}
              {rankingManuallyEdited && (isAvgFormat || winnerStatField) && (
                <button
                  onClick={() => { autoSort(); setRankingDirty(true); }}
                  className="ml-auto flex items-center gap-1 text-xs text-primary-fg/70 hover:text-primary-fg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Auto-Sortierung zurücksetzen
                </button>
              )}
            </div>

            {tiedAbove.size > 0 && (
              <p className="text-xs text-primary-fg/70 flex items-center gap-1">
                <Equal className="w-3 h-3" />
                {tiedAbove.size} Gleichstand{tiedAbove.size > 1 ? "s" : ""} – beide erhalten dieselbe Platzierung
              </p>
            )}

            {seriesId && (
              <p className="text-xs text-subtle">
                Fließt in die Tabelle der Eventreihe ein. Die großen Platzierungs-Belohnungen der Reihe gibt es erst
                zum Abschluss der ganzen Reihe, hier nur den Bonus je Termin (falls eingestellt).
              </p>
            )}

            <p className="text-[10px] text-subtle">Ziehen oder ▲▼ zum Umsortieren · ☑ war da (sonst kein Platz und keine Belohnung) · <Equal className="w-3 h-3 inline" /> Gleichstand mit dem Platz darüber · <Ban className="w-3 h-3 inline" /> disqualifizieren (keine Belohnung)</p>

            {registeredUsers.length === 0 ? (
              <p className="text-sm text-subtle text-center py-4">Keine Teilnehmer registriert.</p>
            ) : (
              <div className="space-y-1">
                {rankingOrder.map((uid, idx) => {
                  const u = registeredUsers.find(u => u.id === uid);
                  if (!u) return null;
                  const isAbsent = absentPlayers.has(uid);
                  // Abwesende belegen keinen Platz (placementMap enthält nur Anwesende)
                  const place = placementMap.get(uid) ?? null;
                  const isExcluded = excludedUsers.has(uid);
                  const reward = isExcluded || isAbsent || place === null ? undefined : getPlacementReward(place);
                  const isTied = tiedAbove.has(uid);

                  return (
                    <div key={uid}>
                      {/* Tied-with-above indicator */}
                      {isTied && (
                        <div className="flex items-center gap-1 py-0.5 px-8">
                          <div className="flex-1 border-t border-primary/30 border-dashed" />
                          <Equal className="w-3 h-3 text-primary-fg/70" />
                          <div className="flex-1 border-t border-primary/30 border-dashed" />
                        </div>
                      )}
                      <div
                        draggable
                        onDragStart={() => setDragIdx(idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (dragIdx === null || dragIdx === idx) return;
                          setRankingManuallyEdited(true);
                          setRankingDirty(true);
                          setRankingOrder(prev => {
                            const next = [...prev];
                            const [removed] = next.splice(dragIdx, 1);
                            next.splice(idx, 0, removed);
                            return next;
                          });
                          // Clear ties for moved elements
                          setTiedAbove(t => {
                            const s = new Set(t);
                            s.delete(uid);
                            if (rankingOrder[dragIdx]) s.delete(rankingOrder[dragIdx]);
                            return s;
                          });
                          setDragIdx(null);
                        }}
                        className={`flex items-center gap-2 px-2 py-2 rounded-control border transition-colors select-none ${
                          isExcluded
                            ? "border-red-900/40 bg-danger-soft"
                            : isAbsent ? "border-line bg-transparent opacity-60"
                            : isTied ? "border-primary/30 bg-primary-soft/40" : "border-line bg-surface-2"
                        } cursor-grab active:cursor-grabbing`}
                      >
                        <button type="button" onClick={() => tapSwap(idx)} aria-pressed={pickIdx === idx}
                          aria-label={pickIdx === null ? `${userName(u)} zum Tauschen wählen` : pickIdx === idx ? "Auswahl aufheben" : `Mit ${ctx.nameOf(ctx.rankingOrder[pickIdx])} tauschen`}
                          title="Antippen, dann einen zweiten Spieler antippen: Plätze tauschen"
                          className={`grid size-9 -m-1 shrink-0 place-items-center rounded-control transition-colors ${pickIdx === idx ? "bg-primary text-primary-ink" : pickIdx !== null ? "text-primary-fg hover:bg-primary-soft" : "text-subtle hover:bg-surface-3"}`}>
                          <GripVertical className="size-4" />
                        </button>
                        <input type="checkbox" checked={!isAbsent} onChange={() => toggleAbsent(uid)}
                          aria-label={`${userName(u)} war da`} title={isAbsent ? "Nicht da: kein Platz, keine Belohnung" : "War da"}
                          className="rounded accent-primary shrink-0" />
                        <span className="text-sm w-6 text-center shrink-0">
                          {place === null
                            ? <span className="text-xs text-subtle">–</span>
                            : place <= 3
                            ? <span>{MEDALS[place - 1]}</span>
                            : <span className="text-xs text-subtle">{place}</span>
                          }
                        </span>
                        <Avatar u={u} size={5} />
                        <span className={`text-xs flex-1 truncate ${isExcluded ? "text-danger/70 line-through" : "text-fg"}`}>{userName(u)}</span>
                        {!isExcluded && dominionCfg?.enabled && (currentDominionStreaks[uid] ?? 0) > 0 && (
                          <span
                            title={`Dominion-Streak: ${currentDominionStreaks[uid]}x in Folge „${dominionTriggerLabel}" — noch ${Math.max(dominionCfg.threshold - currentDominionStreaks[uid], 0)}x bis zum Bonus`}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-xs font-semibold text-orange-400 shrink-0"
                          >
                            <Flame className="w-2.5 h-2.5" /> {currentDominionStreaks[uid]}
                          </span>
                        )}
                        {isExcluded && (
                          <span className="text-xs text-danger shrink-0">Disqualifiziert</span>
                        )}
                        {isAbsent && !isExcluded && (
                          <span className="text-xs text-subtle shrink-0">nicht da</span>
                        )}
                        {isAvgFormat && userAvgScore[uid] != null && (
                          <span className="text-xs text-subtle tabular-nums shrink-0">
                            Ø {formatFixed(userAvgScore[uid], 2)}
                          </span>
                        )}
                        {!isAvgFormat && winnerStatField && (
                          <span className="text-xs text-muted tabular-nums shrink-0">
                            {formatDecimal(userStats[uid]?.[winnerStatField] ?? 0)} {statDisplayName(winnerStatField)}
                            {winnerCheck.compareField && (
                              <span className="text-subtle"> · {formatDecimal(userStats[uid]?.[winnerCheck.compareField] ?? 0)} {statDisplayName(winnerCheck.compareField)}</span>
                            )}
                          </span>
                        )}
                        <span className="flex flex-col items-end shrink-0 ml-1 gap-0">
                          {!isExcluded && !isAbsent && effectiveParticipationCoins > 0 && (
                            <span className="text-xs text-amber-400 tabular-nums leading-tight">
                              +{(reward?.coins ?? 0) + effectiveParticipationCoins} <CoinIcon size={11} />
                            </span>
                          )}
                          {!isExcluded && reward && reward.rankPoints > 0 && (
                            <span className="text-xs text-primary tabular-nums leading-tight">
                              +{reward.rankPoints} <RankPointsIcon size={11} />
                            </span>
                          )}
                          {!isExcluded && reward?.tablePoints ? (
                            <span className="text-xs text-primary-fg tabular-nums leading-tight" title="Tabellenpunkte für die Reihentabelle">
                              +{reward.tablePoints} Tab.
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-0.5 shrink-0">
                            <button
                              onClick={() => toggleExcluded(uid)}
                              title={isExcluded ? "Disqualifikation aufheben" : "Disqualifizieren (keine Münzen/Punkte)"}
                              className={`p-2.5 -m-1 transition-colors ${isExcluded ? "text-danger" : "text-subtle hover:text-danger"}`}
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                            {/* Tie toggle (only for non-first rows) */}
                            {idx > 0 && (
                              <button
                                onClick={() => toggleTied(uid)}
                                title={isTied ? "Gleichstand aufheben" : "Gleichstand mit Platz darüber"}
                                className={`p-2.5 -m-1 transition-colors ${isTied ? "text-primary-fg" : "text-subtle hover:text-primary-fg"}`}
                              >
                                <Equal className="w-3 h-3" />
                              </button>
                            )}
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-2.5 -m-1 text-subtle hover:text-fg disabled:opacity-20 transition-colors">▲</button>
                            <button onClick={() => moveDown(idx)} disabled={idx === rankingOrder.length - 1} className="p-2.5 -m-1 text-subtle hover:text-fg disabled:opacity-20 transition-colors">▼</button>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ranking note */}
            <div>
                <label className="text-xs text-subtle block mb-1">
                  Begründung / Notiz (optional)
                </label>
                <textarea
                  value={rankingNote}
                  onChange={e => { setRankingNote(e.target.value); setRankingDirty(true); }}
                  placeholder="z.B. Spieler X nachträglich disqualifiziert wegen …"
                  rows={2}
                  className={`${inputCls} resize-none ${rankingManuallyEdited && rankingNote ? "border-amber-600/50" : ""}`}
                />
                {(rankingManuallyEdited || excludedUsers.size > 0) && !rankingNote && (
                  <p className="text-xs text-amber-500/70 mt-1">
                    Empfohlen: Begründung für manuelle Änderung{excludedUsers.size > 0 ? " / Disqualifikation" : ""} eintragen.
                  </p>
                )}
              </div>
          </div>
      </section>
  );
}
