"use client";
import { formatDecimal } from "@/lib/format-number";
import RankPointsIcon from "@/components/RankPointsIcon";
import { Trophy, Flame } from "@/components/icons";
import { statDisplayName } from "@/lib/series-event-points";
import { userName, Avatar } from "./complete-shared";
import type { EventComplete } from "./useEventComplete";

/** Abschnitt "Extras": MVP, Dominion Bonus, Zuschauer. */
export default function CompleteExtras({ ctx }: { ctx: EventComplete }) {
  const { spectatorActivity, registeredUsers, spectatorUsers, userStats, seriesStatConfig, spectatorRewardJson, isFinishedSummary, winnerStatField, mvpUserId, setMvpUserId, spectatorAttended, setSpectatorAttended, dominionCfg, dominionTriggerLabel, dominionChanges, dominionAwarded, effectiveSpectatorCoins, stepNo } = ctx;
  return (
    <section id="schritt-extras" aria-label="Extras" className="space-y-3 scroll-mt-20">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 text-[11px] flex items-center justify-center">{stepNo("Extras")}</span>
            Extras
          </h2>
          <div className="grid gap-3 lg:grid-cols-2 items-start">
          {/* MVP */}
          {seriesStatConfig?.mvpStatField && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <div className="flex items-center gap-2">
                <RankPointsIcon size={14} />
                <span className="text-xs font-semibold text-teal-300">
                  MVP{" "}
                  <span className="font-normal text-gray-500">(+1 auf „{seriesStatConfig.mvpStatField}“ in der Reihen-Tabelle)</span>
                </span>
              </div>
              {isFinishedSummary ? (
                mvpUserId ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <Avatar u={registeredUsers.find(u => u.id === mvpUserId) ?? { id: mvpUserId, name: mvpUserId, username: null, image: null }} size={6} />
                    <span className="text-sm text-white flex-1 truncate">{userName(registeredUsers.find(u => u.id === mvpUserId) ?? { id: mvpUserId, name: mvpUserId, username: null, image: null })}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Kein MVP</p>
                )
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <input type="radio" name="mvp" value="" checked={mvpUserId === ""} onChange={() => setMvpUserId("")} className="accent-teal-500" />
                    <span className="text-sm text-gray-500 italic">Kein MVP</span>
                  </label>
                  {registeredUsers.map(u => (
                    <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      mvpUserId === u.id ? "bg-teal-500/10 border border-teal-500/20" : "hover:bg-white/[0.03]"
                    }`}>
                      <input type="radio" name="mvp" value={u.id} checked={mvpUserId === u.id} onChange={() => setMvpUserId(u.id)} className="accent-teal-500 shrink-0" />
                      <Avatar u={u} size={6} />
                      <span className="text-sm text-white flex-1 truncate">{userName(u)}</span>
                      {winnerStatField && userStats[u.id]?.[winnerStatField] != null && (
                        <span className="text-xs text-gray-500 tabular-nums shrink-0">
                          {formatDecimal(userStats[u.id][winnerStatField] ?? 0)} {statDisplayName(winnerStatField)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dominion Bonus */}
          {dominionCfg?.enabled && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)" }}>
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">Dominion Bonus</span>
              </div>
              <p className="text-[10px] text-gray-600">
                Bei {dominionCfg.threshold}x in Folge „{dominionTriggerLabel}&quot; gibt es
                {dominionCfg.coins > 0 ? ` ${dominionCfg.coins} Münzen` : ""}
                {dominionCfg.coins > 0 && dominionCfg.seriesPoints > 0 ? " + " : ""}
                {dominionCfg.seriesPoints > 0 ? ` ${dominionCfg.seriesPoints} Punkte` : ""}
                . Der Streak-Stand wird server-seitig geführt und ist vor dem Speichern nicht vorschaubar.
              </p>
              {dominionChanges ? (
                dominionAwarded.length > 0 ? (
                  <div className="space-y-1">
                    {dominionAwarded.map(([uid, c]) => {
                      const u = registeredUsers.find(x => x.id === uid) ?? spectatorUsers.find(x => x.id === uid);
                      return (
                        <div key={uid} className="flex items-center gap-2 text-sm text-white">
                          <Trophy className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="flex-1 truncate">{u ? userName(u) : uid}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {c.coins > 0 ? `+${c.coins} Münzen` : ""}
                            {c.coins > 0 && c.seriesPoints > 0 ? " + " : ""}
                            {c.seriesPoints > 0 ? `+${c.seriesPoints} Punkte` : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">Bei diesem Abschluss hat niemand den Bonus erreicht.</p>
                )
              ) : (
                <p className="text-xs text-gray-600 italic">Wird beim Speichern berechnet.</p>
              )}
            </div>
          )}

          {/* Zuschauer-Anwesenheit */}
          {spectatorUsers.length > 0 && spectatorRewardJson && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <p className="text-xs font-semibold text-teal-300">
                👁️ Zuschauer-Anwesenheit
                <span className="font-normal text-gray-500 ml-1">({effectiveSpectatorCoins} Münzen{spectatorRewardJson.rankPoints > 0 ? ` + ${spectatorRewardJson.rankPoints} RP` : ""} für Anwesende)</span>
              </p>
              {isFinishedSummary ? (
                <div className="space-y-1">
                  {spectatorUsers.filter(u => spectatorAttended.has(u.id)).map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <Avatar u={u} size={5} />
                      <span className="text-sm text-white flex-1 truncate">{userName(u)}</span>
                    </div>
                  ))}
                  {spectatorUsers.every(u => !spectatorAttended.has(u.id)) && (
                    <p className="text-sm text-gray-500 italic">Niemand anwesend.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Punkt 5: Bulk-Aktionen statt jeden Zuschauer einzeln anklicken zu müssen */}
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => setSpectatorAttended(new Set(spectatorUsers.map(u => u.id)))}
                      className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">
                      Alle anwesend
                    </button>
                    <span className="text-gray-700">·</span>
                    <button type="button"
                      onClick={() => setSpectatorAttended(new Set())}
                      className="text-[11px] text-gray-500 hover:text-white transition-colors">
                      Keiner anwesend
                    </button>
                    <button type="button"
                      onClick={() => setSpectatorAttended(new Set(spectatorUsers.filter(u => spectatorActivity[u.id]?.length).map(u => u.id)))}
                      className="text-[11px] text-gray-400 hover:text-white transition-colors">
                      Nur Aktive
                    </button>
                    <span className="text-[10px] text-gray-600 ml-auto">
                      {spectatorAttended.size}/{spectatorUsers.length} anwesend
                    </span>
                  </div>
                  {spectatorUsers.map(u => (
                    <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      spectatorAttended.has(u.id) ? "bg-teal-500/10 border border-teal-500/20" : "bg-white/[0.03] border border-transparent hover:border-white/[0.08]"
                    }`}>
                      <input type="checkbox" checked={spectatorAttended.has(u.id)}
                        onChange={e => setSpectatorAttended(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(u.id); else next.delete(u.id);
                          return next;
                        })}
                        className="accent-teal-500 shrink-0" />
                      <Avatar u={u} size={5} />
                      <span className="text-sm text-white flex-1 truncate">{userName(u)}</span>
                      {/* Aktivität beim Event als Entscheidungshilfe */}
                      <span className={`text-[10px] shrink-0 ${spectatorActivity[u.id]?.length ? "text-teal-300/80" : "text-gray-600"}`}>
                        {spectatorActivity[u.id]?.length ? spectatorActivity[u.id].join(" · ") : "keine Aktivität"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          </div>
        </section>
  );
}
