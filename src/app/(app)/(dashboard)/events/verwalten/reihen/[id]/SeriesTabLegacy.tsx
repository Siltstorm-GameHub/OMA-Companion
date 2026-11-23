"use client";
import { X, Flame } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { inputCls, Section } from "./series-shared";
import type { SeriesDetail } from "./useSeriesDetail";

/** Reiter "Legacy" (nur Mods): Altstand und Stat-Felder zusammenführen. */
export default function SeriesTabLegacy({ ctx }: { ctx: SeriesDetail }) {
  const { allUsers, isArchived, statRows, dominionEnabled, legacyRows, setLegacyRows, legacySearch, setLegacySearch, polls, calcLegacyPoints, lockedNotice } = ctx;
  return (
    <>
          {lockedNotice}
          <fieldset disabled={isArchived} className="space-y-4 min-w-0 border-0 p-0 m-0">
          {/* Legacy-Stand */}
          <Section title="Legacy-Stand" overflowVisible>
            <p className="text-xs text-subtle">Historische Werte vor App-Einführung</p>
            {legacyRows.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {legacyRows.map((row, i) => {
                  const u = allUsers.find(u => u.id === row.userId);
                  const displayName = u?.username ?? u?.name ?? row.userId.slice(0, 8);
                  return (
                    <div key={row.userId} className="rounded-control border border-line bg-surface-2 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-fg truncate">{displayName}</span>
                        <button type="button" onClick={() => setLegacyRows(prev => prev.filter((_, j) => j !== i))}
                          className="text-subtle hover:text-danger transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted">
                          Teilnahmen
                          <NumberInput min={0} value={row.participations}
                            onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                              if (j !== i) return r;
                              const newPart = Number(e.target.value);
                              return { ...r, participations: newPart, points: calcLegacyPoints(newPart, r.stats) };
                            }))}
                            className="w-16 rounded px-1.5 py-0.5 text-xs text-fg bg-gray-800 border border-gray-700" />
                        </label>
                        {statRows.filter(s => s.field.trim()).map(s => (
                          <label key={s.field} className="flex items-center gap-1.5 text-xs text-muted">
                            {s.field}
                            <NumberInput min={0} value={row.stats[s.field] ?? 0}
                              onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                if (j !== i) return r;
                                const newStats = { ...r.stats, [s.field]: Number(e.target.value) };
                                return { ...r, stats: newStats, points: calcLegacyPoints(r.participations, newStats) };
                              }))}
                              className="w-16 rounded px-1.5 py-0.5 text-xs text-fg bg-gray-800 border border-gray-700" />
                          </label>
                        ))}
                        <span className="flex items-center gap-1.5 text-xs text-primary">
                          Punkte (auto)
                          <span className="w-16 rounded px-1.5 py-0.5 text-xs text-primary-fg bg-primary-soft border border-primary/30 tabular-nums">
                            {row.points}
                          </span>
                        </span>
                      </div>
                      {/* Poll-Felder */}
                      {polls.filter(p => p.label.trim()).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1.5 border-t border-line mt-1">
                          {polls.filter(p => p.label.trim()).map(p => (
                            <label key={p.label} className="flex items-center gap-1.5 text-xs text-violet-400">
                              {p.label} Siege
                              <NumberInput min={0} value={row.stats[p.label] ?? 0}
                                onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                  if (j !== i) return r;
                                  const newStats = { ...r.stats, [p.label]: Number(e.target.value) };
                                  return { ...r, stats: newStats, points: calcLegacyPoints(r.participations, newStats) };
                                }))}
                                className="w-16 rounded px-1.5 py-0.5 text-xs text-fg bg-gray-800 border border-gray-700" />
                            </label>
                          ))}
                        </div>
                      )}
                      {/* Dominion Bonus */}
                      {dominionEnabled && (
                        <div className="flex flex-wrap gap-2 pt-1.5 border-t border-line mt-1">
                          <label className="flex items-center gap-1.5 text-xs text-amber-400">
                            <Flame className="w-3 h-3" /> Dominion Bonus (Anzahl)
                            <NumberInput min={0} value={row.stats["Dominion Bonus"] ?? 0}
                              onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                if (j !== i) return r;
                                const newStats = { ...r.stats, "Dominion Bonus": Number(e.target.value) };
                                return { ...r, stats: newStats, points: calcLegacyPoints(r.participations, newStats) };
                              }))}
                              className="w-16 rounded px-1.5 py-0.5 text-xs text-fg bg-gray-800 border border-gray-700" />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="relative">
              <input type="text" value={legacySearch} onChange={e => setLegacySearch(e.target.value)}
                placeholder="Spieler suchen und hinzufügen…" className={`${inputCls} text-xs`} />
              {legacySearch.trim() && (() => {
                const q = legacySearch.toLowerCase();
                const filtered = allUsers.filter(u =>
                  !legacyRows.some(r => r.userId === u.id) &&
                  (u.username ?? u.name ?? "").toLowerCase().includes(q)
                ).slice(0, 6);
                if (!filtered.length) return null;
                return (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-surface-2 border border-gray-700 rounded-control overflow-hidden shadow-xl">
                    {filtered.map(u => (
                      <button key={u.id} type="button"
                        onClick={() => { setLegacyRows(prev => [...prev, { userId: u.id, points: 0, participations: 0, stats: {} }]); setLegacySearch(""); }}
                        className="w-full text-left px-3 py-2 text-xs text-fg/90 hover:bg-line flex items-center gap-2 transition-colors">
                        {u.image ? <img src={u.image} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" /> : <div className="w-5 h-5 rounded-full bg-gray-700 shrink-0" />}
                        {u.username ?? u.name}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </Section>
          </fieldset>
          </>
  );
}
