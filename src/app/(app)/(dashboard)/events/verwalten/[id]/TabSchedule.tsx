"use client";
import { Trophy, Trash2, Plus } from "@/components/icons";
import StatFieldEditor from "@/components/StatFieldEditor";
import StatPointsTable from "@/components/StatPointsTable";
import AvgDirectionToggle from "@/components/AvgDirectionToggle";
import TournamentManager from "../TournamentManager";
import GoalSummaryLink from "./GoalSummaryLink";
import CheckInPanel from "./CheckInPanel";
import { supportsCommunityGoal } from "@/lib/community-goal";
import { NumberInput } from "@/components/ui/NumberInput";
import { TMT_FORMATS, inputCls, labelCls } from "./edit-shared";
import type { EventEdit } from "./useEventEdit";

/** Reiter "Spielplan" (Einzel-Event): Check-in, Format, Wertung und Turnierbaum. */
export default function TabSchedule({ ctx }: { ctx: EventEdit }) {
  const { event, tmtFormat, setTmtFormat, tmtPlayHomeAway, setTmtPlayHomeAway, tmtPointsMode, setTmtPointsMode, tmtPoints, setTmtPoints, seriesStatRows, seriesStatFieldSet, tmtStatFields, setTmtStatFields, tmtExtraStatFields, tmtStatConfig, setTmtStatConfig, resolvedGoal, tmPointsCfg, tmAvgDirection, tmtLoading, hasTournament, hasStat, isRoundRobinFamily, usesMatchResultPoints, saveTmtSettings, startTournament, bracketWinnerStatKeys, bracketMatchWinStatKeys, bracketPlacementPoints, bracketTournament, bracketRegisteredUsers } = ctx;
  const notReadyNames = event.checkInEnabled ? bracketRegisteredUsers.filter(u => !ctx.checkedInIds.has(u.id)).map(ctx.userName) : null;
  return (
    <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Den Check-in speichert die Leiste unten. Format und Wertung haben eigene Knöpfe, weil sie den Spielplan anlegen oder ändern.
          </p>
          {/* Check-in vor Turnierstart — nur Bereite werden ausgelost */}
          <CheckInPanel ctx={ctx} drawn={(bracketTournament?.matches.length ?? 0) > 0} />

          {!hasTournament && (
          <div>
            <label className={labelCls}>Format</label>
            <div className="grid grid-cols-2 gap-2">
              {TMT_FORMATS.map(f => (
                <button key={f.value} type="button" onClick={() => setTmtFormat(f.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    tmtFormat === f.value ? "border-amber-500 bg-amber-900/25 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  }`}>
                  <p className="text-xs font-medium leading-tight">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Round-Robin-Zusatzparameter (Hin-/Rückrunde + Punktemodus, ersetzt das ehemalige Format "liga") */}
          {isRoundRobinFamily && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={tmtPlayHomeAway}
                  onChange={e => setTmtPlayHomeAway(e.target.checked)}
                  className="rounded shrink-0" />
                <span className="text-sm text-white">Hin- und Rückrunde spielen</span>
              </label>
              <div>
                <label className={labelCls}>Punktemodus</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTmtPointsMode("placement")}
                    className={`flex-1 text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                      tmtPointsMode === "placement" ? "border-amber-500 bg-amber-900/25 text-white" : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}>
                    Platzierungspunkte
                  </button>
                  <button type="button" onClick={() => setTmtPointsMode("matchResult")}
                    className={`flex-1 text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                      tmtPointsMode === "matchResult" ? "border-amber-500 bg-amber-900/25 text-white" : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}>
                    Sieg/Unentschieden-Münzen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Belohnungen pro Platzierung werden zentral im Reiter "Belohnungen" gepflegt */}
          <p className="text-xs text-gray-500">
            Platzierungsbelohnungen (Münzen/Rang-Punkte je Platz) kommen ausschließlich aus dem Reiter
            {event.series ? " der Eventreihe" : " „Belohnungen“"} und werden beim Abschluss des Events ausgezahlt.
            {usesMatchResultPoints && " Die Münzen pro Match-Ergebnis unten kommen zusätzlich, direkt beim Eintragen."}
          </p>
          {usesMatchResultPoints && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <label className="text-xs text-gray-500 block mb-3">Münzen pro Match-Ergebnis</label>
              <div className="grid grid-cols-2 gap-3">
                {([["🏆 Sieg", "win"], ["🤝 Unentschieden", "draw"]] as const).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <NumberInput min={0} value={tmtPoints[key]}
                      onChange={e => setTmtPoints(p => ({ ...p, [key]: Number(e.target.value) }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasStat && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              {seriesStatRows.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Statistiken der Reihe</label>
                    <div className="flex flex-wrap gap-1.5">
                      {seriesStatRows.map(r => (
                        <span key={r.field} className="text-xs px-2 py-1 rounded-lg bg-line border border-line text-gray-300">
                          {r.field} <span className="text-gray-500">· {r.points} Pkt.</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Werden in jedem Event der Reihe erfasst und zählen für die Eventpunkte und die Reihentabelle.
                      Ändern kannst du sie in den Einstellungen der Eventreihe.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Zusatz-Stats nur für dieses Event</label>
                    <StatFieldEditor
                      fields={tmtExtraStatFields}
                      onChange={extra => setTmtStatFields([...seriesStatRows.map(r => r.field), ...extra.filter(f => !seriesStatFieldSet.has(f))])}
                      isAvg={tmtFormat === "avg_stats"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Zählen nur für die Eventpunkte dieses Events, nicht für die Reihentabelle.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label className={labelCls}>Statistik-Felder</label>
                  <StatFieldEditor fields={tmtStatFields} onChange={setTmtStatFields} isAvg={tmtFormat === "avg_stats"} />
                </>
              )}
              {tmtFormat === "avg_stats" && (
                <div className="mt-3">
                  <AvgDirectionToggle
                    value={tmtStatConfig.avgDirection}
                    onChange={v => setTmtStatConfig(c => ({ ...c, avgDirection: v }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Community-Ziel: Kurzfassung, eingestellt wird es im Reiter "Ziel" */}
          {hasTournament ? <GoalSummaryLink ctx={ctx} /> : supportsCommunityGoal(tmtFormat) && (
            <p className="text-xs text-primary-fg/80">🎯 Mit diesem Format ist ein Community-Ziel möglich. Du richtest es nach dem Anlegen im Reiter „Ziel“ ein.</p>
          )}

          {/* Event-eigene Stat-Punkte-Konfiguration (Eventpunkte) — für alle Stats-Formate (ffa,
              coop_stats, avg_stats): legt fest, wie viele Punkte jeder Stat gibt, und optional wie
              viele Punkte welche Endplatzierung gibt. Für Reihen ohne festes Format/Spiel überschreibt
              das die Reihen-weite Konfiguration nur für dieses eine Event. */}
          {["ffa", "coop_stats", "avg_stats"].includes(tmtFormat) && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
              <div>
                <label className={labelCls}>Stat-Punkte-Konfiguration (nur dieses Event)</label>
                <p className="text-xs text-gray-500 -mt-1 mb-2">
                  {seriesStatRows.length > 0
                    ? "Punkte für die Zusatz-Stats dieses Events. Die Statistiken der Reihe bringen ihre Punkte aus der Reihe mit."
                    : "Wie viele Punkte gibt jede Einheit einer Statistik in diesem Event (Eventpunkte)?"}
                </p>
              </div>

              {(seriesStatRows.length === 0 || tmtExtraStatFields.length > 0) && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Punkte pro Statistik</p>
                <StatPointsTable
                  fields={seriesStatRows.length > 0 ? tmtExtraStatFields : tmtStatFields}
                  values={tmtStatConfig.pointsByField}
                  onChange={(f, v) => setTmtStatConfig(c => ({ ...c, pointsByField: { ...c.pointsByField, [f]: v } }))}
                />
              </div>
              )}

              <div className="pt-2 border-t border-line space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={tmtStatConfig.placementEnabled}
                    onChange={e => setTmtStatConfig(c => ({ ...c, placementEnabled: e.target.checked }))}
                    className="rounded" />
                  <span>Endplatzierung tracken</span>
                </label>
                <p className="text-xs text-gray-500 -mt-2">
                  Im Reiter „Spielplan“ kann dann jedem Spieler pro Runde ein Platz zugewiesen werden. Die
                  hier hinterlegten Punkte pro Platz ergeben zusammen mit den Stat-Punkten die
                  Eventpunkte dieses Events — sie bestimmen nur die Endplatzierung/den Sieger dieses
                  Events, nicht die Tabellenpunkte der Reihe.
                </p>

                {tmtStatConfig.placementEnabled && (
                  <div className="space-y-2">
                    {tmtStatConfig.placementPoints.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 shrink-0">Platz</span>
                        <div className="w-16 shrink-0">
                          <NumberInput min={1} value={row.place}
                            onChange={e => setTmtStatConfig(c => ({
                              ...c, placementPoints: c.placementPoints.map((r, ri) => ri === i ? { ...r, place: Number(e.target.value) } : r),
                            }))}
                            className={`${inputCls} text-center`} />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">Punkte</span>
                        <div className="flex-1">
                          <NumberInput step="0.1" value={row.points}
                            onChange={e => setTmtStatConfig(c => ({
                              ...c, placementPoints: c.placementPoints.map((r, ri) => ri === i ? { ...r, points: Number(e.target.value) } : r),
                            }))}
                            className={`${inputCls} text-center`} />
                        </div>
                        <button type="button"
                          onClick={() => setTmtStatConfig(c => ({ ...c, placementPoints: c.placementPoints.filter((_, ri) => ri !== i) }))}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setTmtStatConfig(c => ({
                        ...c,
                        placementPoints: [...c.placementPoints, { place: (c.placementPoints.at(-1)?.place ?? 0) + 1, points: 1 }],
                      }))}
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Platz hinzufügen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {hasTournament ? (
              <button onClick={() => saveTmtSettings()} disabled={tmtLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-600 transition-colors disabled:opacity-50">
                <Trophy className="w-4 h-4" />
                {tmtLoading ? "Speichert…" : "Turnier-Einstellungen speichern"}
              </button>
            ) : (
              <>
                <button onClick={() => saveTmtSettings("pending")} disabled={tmtLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-600 transition-colors disabled:opacity-50">
                  <Trophy className="w-4 h-4" />
                  {tmtLoading ? "Speichert…" : "Einstellungen speichern (Turnier noch nicht starten)"}
                </button>
                <button onClick={() => saveTmtSettings("active")} disabled={tmtLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-amber-300 border border-amber-700/60 hover:bg-amber-900/20 transition-colors disabled:opacity-50">
                  Turnier erstellen & direkt starten
                </button>
              </>
            )}
            {hasTournament && event.tournamentStatus !== "active" && event.tournamentStatus !== "finished" && event.tournamentStatus !== "finalized" && (
              <button onClick={startTournament} disabled={tmtLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/20 transition-colors disabled:opacity-50">
                Turnier jetzt starten
              </button>
            )}
          </div>

          {/* Turnierbaum — im selben Reiter wie die Turnier-Einstellungen */}
          {bracketTournament && (
            <div className="pt-4 border-t border-line">
              <TournamentManager
                event={{ id: event.id, startAt: event.startAt, endAt: event.endAt ?? null }}
                tournament={bracketTournament}
                allUsers={bracketRegisteredUsers}
                winnerStatKeys={bracketWinnerStatKeys}
                matchWinStatKeys={bracketMatchWinStatKeys}
                standaloneEvent={!event.series}
                placementPoints={bracketPlacementPoints}
                pointsCfg={tmPointsCfg}
                goal={resolvedGoal.goal}
                avgDirection={tmAvgDirection}
                notReadyNames={notReadyNames}
              />
            </div>
          )}
        </div>
  );
}
