"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, Save, Plus, Trash2, ChevronDown, ChevronUp, Settings, Trophy, UserPlus } from "lucide-react";

type UserInfo = { id: string; name: string | null; username: string | null; image: string | null };

type ResultRow = {
  userId: string;
  user: UserInfo;
  placement: string;
  points: string;
  stats: Record<string, string>;
};

type SeriesEventData = {
  id: string;
  title: string;
  startAt: string;
  status: string;
  results: ResultRow[];
};

type SeriesData = {
  series: { id: string; name: string; statFields: string[] };
  events: SeriesEventData[];
  allUsers: UserInfo[];
};

const uname = (u: UserInfo) => u.username ?? u.name ?? "?";

const inputCls =
  "bg-gray-800 border border-gray-700 text-white rounded-lg px-2.5 py-2 text-sm text-center focus:border-teal-500/50 outline-none w-full";

export default function SeriesResultsEditor({
  seriesId,
  onClose,
}: {
  seriesId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<SeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statFields, setStatFields] = useState<string[]>([]);
  const [newField, setNewField] = useState("");
  const [savingStats, setSavingStats] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventDrafts, setEventDrafts] = useState<Record<string, ResultRow[]>>({});
  const [savingEvent, setSavingEvent] = useState<string | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");

  useEffect(() => {
    fetch(`/api/admin/event-series/${seriesId}/results`)
      .then(r => r.json())
      .then((d: SeriesData & { events: Array<SeriesEventData & { results: Array<Omit<ResultRow, "placement" | "points" | "stats"> & { placement: number | null; points: number; stats: Record<string, number> }> }> }) => {
        const fields: string[] = d.series.statFields ?? [];
        setStatFields(fields);
        const drafts: Record<string, ResultRow[]> = {};
        for (const ev of d.events) {
          drafts[ev.id] = ev.results.map(r => ({
            userId:    r.userId,
            user:      r.user,
            placement: r.placement != null ? String(r.placement) : "",
            points:    String(r.points),
            stats:     Object.fromEntries(fields.map(f => [f, r.stats[f] != null ? String(r.stats[f]) : ""])),
          }));
        }
        setEventDrafts(drafts);
        setData({ ...d, series: { ...d.series, statFields: fields } });
        setLoading(false);
      });
  }, [seriesId]);

  const handleClose = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [handleClose]);

  async function saveStatFields() {
    setSavingStats(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId, statFields }),
    });
    setSavingStats(false);
    if (res.ok) {
      toast.success("Stat-Felder gespeichert");
      if (data) setData({ ...data, series: { ...data.series, statFields } });
      setEventDrafts(prev => {
        const next: Record<string, ResultRow[]> = {};
        for (const [evId, rows] of Object.entries(prev)) {
          next[evId] = rows.map(r => ({
            ...r,
            stats: Object.fromEntries(statFields.map(f => [f, r.stats[f] ?? ""])),
          }));
        }
        return next;
      });
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  function setRowField(eventId: string, userId: string, field: string, value: string) {
    setEventDrafts(prev => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).map(r => {
        if (r.userId !== userId) return r;
        if (field === "placement" || field === "points") return { ...r, [field]: value };
        return { ...r, stats: { ...r.stats, [field]: value } };
      }),
    }));
  }

  function addPlayer(eventId: string, user: UserInfo) {
    if ((eventDrafts[eventId] ?? []).some(r => r.userId === user.id)) return;
    setEventDrafts(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] ?? []), {
        userId: user.id, user,
        placement: "", points: "0",
        stats: Object.fromEntries(statFields.map(f => [f, ""])),
      }],
    }));
    setAddPlayerOpen(null);
    setPlayerSearch("");
  }

  function removePlayer(eventId: string, userId: string) {
    setEventDrafts(prev => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).filter(r => r.userId !== userId),
    }));
  }

  async function saveEvent(eventId: string) {
    setSavingEvent(eventId);
    const results = (eventDrafts[eventId] ?? []).map(r => ({
      userId:    r.userId,
      placement: r.placement ? Number(r.placement) : null,
      points:    Number(r.points) || 0,
      stats:     Object.fromEntries(Object.entries(r.stats).map(([k, v]) => [k, Number(v) || 0])),
    }));
    const res = await fetch(`/api/admin/event-series/${seriesId}/results`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, results }),
    });
    setSavingEvent(null);
    if (res.ok) toast.success("Ergebnisse gespeichert");
    else toast.error("Fehler beim Speichern");
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-gray-400 text-sm animate-pulse">Lade Reihen-Daten…</div>
    </div>
  );
  if (!data) return null;

  const { events, allUsers } = data;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-white/[0.06] bg-gray-900 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white leading-tight">Reihen-Tabelle bearbeiten</h2>
            <p className="text-[10px] text-gray-500 truncate">{data.series.name}</p>
          </div>
        </div>
        <button onClick={handleClose}
          className="text-gray-500 hover:text-white transition-colors p-2 -mr-1 rounded-lg active:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-3 max-w-2xl mx-auto w-full pb-8">

          {/* ── Stat-Felder ── */}
          <div className="bg-gray-900 border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-teal-400 shrink-0" />
              <p className="text-sm font-medium text-white">Stat-Felder der Reihe</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Diese Spalten gelten für alle Events dieser Reihe und erscheinen in der öffentlichen Tabelle.
            </p>

            <div className="flex flex-wrap gap-2">
              {statFields.map(f => (
                <span key={f}
                  className="flex items-center gap-1.5 text-xs bg-teal-900/30 border border-teal-700/30 text-teal-300 rounded-full pl-3 pr-2 py-1.5">
                  {f}
                  <button onClick={() => setStatFields(prev => prev.filter(x => x !== f))}
                    className="text-teal-600 hover:text-red-400 transition-colors p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {statFields.length === 0 && (
                <span className="text-xs text-gray-600">Keine Stat-Felder – nur Platz &amp; Punkte werden erfasst.</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newField}
                onChange={e => setNewField(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const f = newField.trim(); if (f && !statFields.includes(f)) { setStatFields(p => [...p, f]); setNewField(""); } } }}
                placeholder="z.B. Kills, Assists, Punkte…"
                className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 placeholder:text-gray-600 focus:border-teal-500/50 outline-none"
              />
              <button
                onClick={() => { const f = newField.trim(); if (f && !statFields.includes(f)) { setStatFields(p => [...p, f]); setNewField(""); } }}
                className="flex items-center gap-1.5 text-sm bg-gray-700 active:bg-gray-600 text-white rounded-lg px-3 py-2.5 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button onClick={saveStatFields} disabled={savingStats}
              className="flex items-center gap-1.5 text-sm bg-teal-700 active:bg-teal-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 transition-colors w-full sm:w-auto justify-center sm:justify-start">
              <Save className="w-4 h-4" />
              {savingStats ? "Speichern…" : "Stat-Felder speichern"}
            </button>
          </div>

          {/* ── Events ── */}
          {events.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-8">Diese Reihe hat noch keine Events.</p>
          )}

          {events.map(ev => {
            const isExpanded = expandedEvent === ev.id;
            const draft = eventDrafts[ev.id] ?? [];
            const takenIds = new Set(draft.map(r => r.userId));
            const sortedDraft = [...draft].sort((a, b) => {
              const pa = a.placement ? Number(a.placement) : 9999;
              const pb = b.placement ? Number(b.placement) : 9999;
              return pa - pb || uname(a.user).localeCompare(uname(b.user));
            });
            const isAddOpen = addPlayerOpen === ev.id;
            const filteredUsers = allUsers
              .filter(u => !takenIds.has(u.id))
              .filter(u => !playerSearch || uname(u).toLowerCase().includes(playerSearch.toLowerCase()));

            return (
              <div key={ev.id} className="bg-gray-900 border border-white/[0.06] rounded-xl overflow-hidden">

                {/* Event header */}
                <button
                  onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.03] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{ev.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {new Date(ev.startAt).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}
                      <span className={
                        ev.status === "finished" ? "text-gray-600" :
                        ev.status === "active"   ? "text-emerald-400" : "text-blue-400"
                      }>{
                        ev.status === "finished" ? "Beendet" :
                        ev.status === "active"   ? "Läuft" : "Offen"
                      }</span>
                      {draft.length > 0 && <> · <span className="text-gray-600">{draft.length} Einträge</span></>}
                    </p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-white/[0.05] p-4 space-y-3">

                    {/* Player cards */}
                    {sortedDraft.length === 0 && (
                      <p className="text-xs text-gray-600 py-1">Noch keine Einträge – Spieler unten hinzufügen.</p>
                    )}

                    {sortedDraft.map((row, idx) => (
                      <div key={row.userId}
                        className="bg-gray-800/60 border border-white/[0.05] rounded-lg p-3 space-y-2.5">

                        {/* Player name + delete */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {row.user.image
                              ? <img src={row.user.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                              : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-gray-300 shrink-0">
                                  {uname(row.user)[0]?.toUpperCase() ?? "?"}
                                </div>
                            }
                            <span className="text-sm font-semibold text-white truncate">{uname(row.user)}</span>
                            {row.placement && (
                              <span className="text-[10px] text-gray-500 shrink-0">#{row.placement}</span>
                            )}
                          </div>
                          <button onClick={() => removePlayer(ev.id, row.userId)}
                            className="text-gray-600 active:text-red-500 p-1.5 rounded-lg active:bg-red-900/20 transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Platz + Punkte + Stats — responsive grid */}
                        <div className={`grid gap-2 ${
                          statFields.length === 0 ? "grid-cols-2" :
                          statFields.length === 1 ? "grid-cols-3" :
                          "grid-cols-2 sm:grid-cols-4"
                        }`}>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1 text-center">Platz</label>
                            <input type="number" inputMode="numeric" min={1} value={row.placement}
                              onChange={e => setRowField(ev.id, row.userId, "placement", e.target.value)}
                              placeholder="–"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1 text-center">Punkte</label>
                            <input type="number" inputMode="numeric" min={0} value={row.points}
                              onChange={e => setRowField(ev.id, row.userId, "points", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          {statFields.map(f => (
                            <div key={f}>
                              <label className="text-[10px] text-gray-500 block mb-1 text-center truncate">{f}</label>
                              <input type="number" inputMode="numeric" min={0} value={row.stats[f] ?? ""}
                                onChange={e => setRowField(ev.id, row.userId, f, e.target.value)}
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Add player */}
                    {!isAddOpen ? (
                      <button
                        onClick={() => { setAddPlayerOpen(ev.id); setPlayerSearch(""); }}
                        className="flex items-center justify-center gap-2 text-sm text-gray-400 active:text-white border border-dashed border-gray-700 active:border-gray-500 rounded-lg px-3 py-2.5 w-full transition-colors">
                        <UserPlus className="w-4 h-4" /> Spieler hinzufügen
                      </button>
                    ) : (
                      <div className="bg-gray-800/60 border border-white/[0.05] rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Spieler suchen…"
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            className="flex-1 text-sm bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 placeholder:text-gray-500 focus:border-teal-500/50 outline-none"
                          />
                          <button onClick={() => { setAddPlayerOpen(null); setPlayerSearch(""); }}
                            className="text-gray-500 active:text-white p-2 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1">
                          {filteredUsers.length === 0 && (
                            <p className="text-xs text-gray-600 py-2 text-center">
                              {playerSearch ? "Kein Spieler gefunden." : "Alle Spieler bereits hinzugefügt."}
                            </p>
                          )}
                          {filteredUsers.map(u => (
                            <button key={u.id}
                              onClick={() => addPlayer(ev.id, u)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg active:bg-white/10 transition-colors text-left">
                              {u.image
                                ? <img src={u.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                                : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-gray-300 shrink-0">
                                    {uname(u)[0]?.toUpperCase() ?? "?"}
                                  </div>
                              }
                              <span className="text-sm text-white">{uname(u)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save button */}
                    <button onClick={() => saveEvent(ev.id)} disabled={savingEvent === ev.id}
                      className="flex items-center gap-2 text-sm bg-amber-700 active:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 transition-colors w-full sm:w-auto justify-center sm:justify-start">
                      <Save className="w-4 h-4" />
                      {savingEvent === ev.id ? "Speichern…" : "Ergebnisse speichern"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
