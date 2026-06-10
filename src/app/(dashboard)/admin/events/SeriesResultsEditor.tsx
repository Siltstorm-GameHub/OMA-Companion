"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, Save, Plus, Trash2, ChevronDown, ChevronUp, Settings, Trophy } from "lucide-react";

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

  useEffect(() => {
    fetch(`/api/admin/event-series/${seriesId}/results`)
      .then(r => r.json())
      .then((d: SeriesData & { events: Array<SeriesEventData & { results: Array<Omit<ResultRow, "placement"|"points"|"stats"> & { placement: number|null; points: number; stats: Record<string,number> }> }> }) => {
        const statFieldList: string[] = d.series.statFields ?? [];
        setStatFields(statFieldList);

        const drafts: Record<string, ResultRow[]> = {};
        for (const ev of d.events) {
          drafts[ev.id] = ev.results.map(r => ({
            userId:    r.userId,
            user:      r.user,
            placement: r.placement != null ? String(r.placement) : "",
            points:    String(r.points),
            stats:     Object.fromEntries(statFieldList.map(f => [f, r.stats[f] != null ? String(r.stats[f]) : ""])),
          }));
        }
        setEventDrafts(drafts);
        setData({ ...d, series: { ...d.series, statFields: statFieldList } });
        setLoading(false);
      });
  }, [seriesId]);

  const handleClose = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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
      // Sync existing drafts to new stat fields
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

  function addStatField() {
    const f = newField.trim();
    if (!f || statFields.includes(f)) return;
    setStatFields(prev => [...prev, f]);
    setNewField("");
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
        userId:    user.id,
        user,
        placement: "",
        points:    "0",
        stats:     Object.fromEntries(statFields.map(f => [f, ""])),
      }],
    }));
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
      stats:     Object.fromEntries(
        Object.entries(r.stats).map(([k, v]) => [k, Number(v) || 0])
      ),
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06] bg-gray-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Reihen-Tabelle bearbeiten</h2>
            <p className="text-xs text-gray-500">{data.series.name}</p>
          </div>
        </div>
        <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-4xl mx-auto w-full">

        {/* ── Stat-Felder ── */}
        <div className="bg-gray-900 border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-teal-400" />
            <p className="text-sm font-medium text-white">Stat-Felder der Reihe</p>
          </div>
          <p className="text-xs text-gray-500">
            Diese Spalten erscheinen in der Tabelle und beim Erfassen der Ergebnisse für alle Events dieser Reihe.
          </p>

          <div className="flex flex-wrap gap-2">
            {statFields.map(f => (
              <span key={f} className="flex items-center gap-1.5 text-xs bg-teal-900/30 border border-teal-700/30 text-teal-300 rounded-full pl-3 pr-2 py-1">
                {f}
                <button onClick={() => setStatFields(prev => prev.filter(x => x !== f))}
                  className="text-teal-600 hover:text-red-400 transition-colors">
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
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStatField(); } }}
              placeholder="Feldname, z.B. Kills"
              className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 placeholder:text-gray-600 focus:border-teal-500/50 outline-none"
            />
            <button onClick={addStatField}
              className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-2 transition-colors whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Hinzufügen
            </button>
          </div>

          <button onClick={saveStatFields} disabled={savingStats}
            className="flex items-center gap-1.5 text-xs bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors">
            <Save className="w-3.5 h-3.5" />
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
          const availableUsers = allUsers.filter(u => !takenIds.has(u.id));
          const sortedDraft = [...draft].sort((a, b) => {
            const pa = a.placement ? Number(a.placement) : 9999;
            const pb = b.placement ? Number(b.placement) : 9999;
            return pa - pb || uname(a.user).localeCompare(uname(b.user));
          });

          return (
            <div key={ev.id} className="bg-gray-900 border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{ev.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {new Date(ev.startAt).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
                    <span className={
                      ev.status === "finished" ? "text-gray-600" :
                      ev.status === "active"   ? "text-emerald-400" :
                      "text-blue-400"
                    }>{
                      ev.status === "finished" ? "Beendet" :
                      ev.status === "active"   ? "Läuft"   :
                      ev.status === "open"     ? "Offen"   : ev.status
                    }</span>
                    {" · "}{draft.length} Einträge
                  </p>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-white/[0.05] p-4 space-y-4">
                  {sortedDraft.length > 0 ? (
                    <div className="overflow-x-auto -mx-1 px-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-700 text-gray-500">
                            <th className="text-left py-1.5 pr-3 font-medium">Spieler</th>
                            <th className="text-center px-2 w-16 font-medium">Platz</th>
                            <th className="text-center px-2 w-20 font-medium">Punkte</th>
                            {statFields.map(f => (
                              <th key={f} className="text-center px-2 w-20 font-medium">{f}</th>
                            ))}
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDraft.map(row => (
                            <tr key={row.userId} className="border-b border-gray-800 last:border-0">
                              <td className="py-1.5 pr-3 text-white font-medium whitespace-nowrap">
                                {uname(row.user)}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input type="number" min={1} value={row.placement}
                                  onChange={e => setRowField(ev.id, row.userId, "placement", e.target.value)}
                                  placeholder="–"
                                  className="w-12 bg-gray-700 border border-gray-600 text-white rounded px-1.5 py-0.5 text-center text-xs focus:border-teal-500/50 outline-none"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input type="number" min={0} value={row.points}
                                  onChange={e => setRowField(ev.id, row.userId, "points", e.target.value)}
                                  className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-1.5 py-0.5 text-center text-xs focus:border-teal-500/50 outline-none"
                                />
                              </td>
                              {statFields.map(f => (
                                <td key={f} className="px-2 py-1.5 text-center">
                                  <input type="number" min={0} value={row.stats[f] ?? ""}
                                    onChange={e => setRowField(ev.id, row.userId, f, e.target.value)}
                                    className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-1.5 py-0.5 text-center text-xs focus:border-teal-500/50 outline-none"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1.5 text-center">
                                <button onClick={() => removePlayer(ev.id, row.userId)}
                                  className="text-gray-600 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 py-2">Noch keine Ergebnisse eingetragen.</p>
                  )}

                  {availableUsers.length > 0 && (
                    <select
                      value=""
                      onChange={e => {
                        const u = allUsers.find(u => u.id === e.target.value);
                        if (u) addPlayer(ev.id, u);
                      }}
                      className="text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 w-full sm:w-auto focus:border-teal-500/50 outline-none">
                      <option value="" disabled>+ Spieler hinzufügen…</option>
                      {availableUsers.map(u => (
                        <option key={u.id} value={u.id}>{uname(u)}</option>
                      ))}
                    </select>
                  )}

                  <button onClick={() => saveEvent(ev.id)} disabled={savingEvent === ev.id}
                    className="flex items-center gap-1.5 text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    {savingEvent === ev.id ? "Speichern…" : "Ergebnisse speichern"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
