"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, Save, Plus, Trash2, ChevronDown, ChevronUp, Settings, Trophy, UserPlus, History } from "lucide-react";

type UserInfo = { id: string; name: string | null; username: string | null; image: string | null };
type StatFieldConfig = { name: string; pts: number };

type ResultRow = {
  userId: string;
  user: UserInfo;
  stats: Record<string, string>;
};

type BaselineRow = {
  userId:         string;
  user:           UserInfo;
  points:         string;
  wins:           string;
  participations: string;
  stats:          Record<string, string>;
};

type SeriesEventData = {
  id: string;
  title: string;
  startAt: string;
  status: string;
  results: ResultRow[];
  participantUserIds: string[];
};

type SeriesData = {
  series: { id: string; name: string; statFields: StatFieldConfig[]; participationPts: number; baselineJson: string | null };
  events: SeriesEventData[];
  allUsers: UserInfo[];
};

const uname = (u: UserInfo) => u.username ?? u.name ?? "?";

const inputCls =
  "bg-gray-800 border border-gray-700 text-white rounded-lg px-2.5 py-2 text-sm text-center focus:border-teal-500/50 outline-none w-full";

function calcPoints(stats: Record<string, string>, fields: StatFieldConfig[], participationPts = 0): number {
  return fields.reduce((sum, f) => sum + (Number(stats[f.name]) || 0) * f.pts, 0) + participationPts;
}

/** Lade-Helper: unterstützt altes Format (string[]) und neues Format ({name,pts}[]) */
function parseStatFields(raw: unknown): StatFieldConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: unknown) => {
    if (typeof f === "string") return { name: f, pts: 0 };
    if (f && typeof f === "object" && "name" in f)
      return { name: String((f as { name: unknown }).name), pts: Number((f as { pts?: unknown }).pts) || 0 };
    return null;
  }).filter(Boolean) as StatFieldConfig[];
}

export default function SeriesResultsEditor({
  seriesId,
  onClose,
}: {
  seriesId: string;
  onClose: () => void;
}) {
  const [data, setData]           = useState<SeriesData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [statFields, setStatFields] = useState<StatFieldConfig[]>([]);
  const [participationPts, setParticipationPts] = useState(0);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldPts,  setNewFieldPts]  = useState("");
  const [savingStats, setSavingStats]   = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventDrafts, setEventDrafts]   = useState<Record<string, ResultRow[]>>({});
  const [savingEvent, setSavingEvent]   = useState<string | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch]   = useState("");

  // Baseline state
  const [baselineExpanded, setBaselineExpanded] = useState(false);
  const [baselineDraft, setBaselineDraft] = useState<BaselineRow[]>([]);
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [baselineAddOpen, setBaselineAddOpen] = useState(false);
  const [baselineSearch, setBaselineSearch]  = useState("");

  useEffect(() => {
    fetch(`/api/admin/event-series/${seriesId}/results`)
      .then(r => r.json())
      .then((d: SeriesData & {
        series: { statFields: unknown; baselineJson: string | null };
        events: Array<SeriesEventData & {
          results: Array<Omit<ResultRow, "stats"> & {
            placement: number | null; points: number; stats: Record<string, number>;
          }>;
        }>;
      }) => {
        const fields = parseStatFields(d.series.statFields);
        setStatFields(fields);
        setParticipationPts(d.series.participationPts ?? 0);
        const drafts: Record<string, ResultRow[]> = {};
        for (const ev of d.events) {
          drafts[ev.id] = ev.results.map(r => ({
            userId: r.userId,
            user:   r.user,
            stats:  Object.fromEntries(fields.map(f => [f.name, r.stats[f.name] != null ? String(r.stats[f.name]) : ""])),
          }));
        }
        setEventDrafts(drafts);

        // Load baseline
        if (d.series.baselineJson) {
          try {
            const bmap = JSON.parse(d.series.baselineJson) as Record<string, {
              points: number; wins: number; participations: number; stats: Record<string, number>;
            }>;
            const rows: BaselineRow[] = Object.entries(bmap).map(([uid, b]) => {
              const user = d.allUsers.find(u => u.id === uid) ?? { id: uid, name: uid, username: null, image: null };
              return {
                userId: uid,
                user,
                points: String(b.points ?? ""),
                wins: String(b.wins ?? ""),
                participations: String(b.participations ?? ""),
                stats: Object.fromEntries(fields.map(f => [f.name, b.stats?.[f.name] != null ? String(b.stats[f.name]) : ""])),
              };
            });
            setBaselineDraft(rows);
          } catch { /* ignore */ }
        }

        setData({ ...d, series: { ...d.series, statFields: fields, participationPts: d.series.participationPts ?? 0 } });
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
      body: JSON.stringify({ seriesId, statFields, participationPts }),
    });
    setSavingStats(false);
    if (res.ok) {
      toast.success("Punktesystem gespeichert");
      if (data) setData({ ...data, series: { ...data.series, statFields, participationPts } });
      // Sync event drafts: add missing fields, keep existing values
      setEventDrafts(prev => {
        const next: Record<string, ResultRow[]> = {};
        for (const [evId, rows] of Object.entries(prev)) {
          next[evId] = rows.map(r => ({
            ...r,
            stats: Object.fromEntries(statFields.map(f => [f.name, r.stats[f.name] ?? ""])),
          }));
        }
        return next;
      });
      // Sync baseline drafts
      setBaselineDraft(prev => prev.map(r => ({
        ...r,
        stats: Object.fromEntries(statFields.map(f => [f.name, r.stats[f.name] ?? ""])),
      })));
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  function addStatField() {
    const name = newFieldName.trim();
    if (!name || statFields.some(f => f.name === name)) return;
    setStatFields(prev => [...prev, { name, pts: Number(newFieldPts) || 0 }]);
    setNewFieldName("");
    setNewFieldPts("");
  }

  function updateStatField(idx: number, key: "name" | "pts", value: string) {
    setStatFields(prev => prev.map((f, i) =>
      i === idx ? { ...f, [key]: key === "pts" ? Number(value) || 0 : value } : f
    ));
  }

  function setRowStat(eventId: string, userId: string, field: string, value: string) {
    setEventDrafts(prev => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).map(r =>
        r.userId !== userId ? r : { ...r, stats: { ...r.stats, [field]: value } }
      ),
    }));
  }

  function addPlayer(eventId: string, user: UserInfo) {
    if ((eventDrafts[eventId] ?? []).some(r => r.userId === user.id)) return;
    setEventDrafts(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] ?? []), {
        userId: user.id, user,
        stats: Object.fromEntries(statFields.map(f => [f.name, ""])),
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

  function importParticipants(ev: SeriesEventData) {
    const existing = new Set((eventDrafts[ev.id] ?? []).map(r => r.userId));
    const toAdd = ev.participantUserIds
      .filter(uid => !existing.has(uid))
      .map(uid => {
        const user = (data?.allUsers ?? []).find(u => u.id === uid) ?? { id: uid, name: uid, username: null, image: null };
        return { userId: uid, user, stats: Object.fromEntries(statFields.map(f => [f.name, ""])) };
      });
    if (toAdd.length === 0) { toast.info("Alle Teilnehmer bereits eingetragen"); return; }
    setEventDrafts(prev => ({ ...prev, [ev.id]: [...(prev[ev.id] ?? []), ...toAdd] }));
    toast.success(`${toAdd.length} Teilnehmer importiert`);
  }

  async function saveEvent(eventId: string) {
    setSavingEvent(eventId);
    const results = (eventDrafts[eventId] ?? []).map(r => ({
      userId:    r.userId,
      placement: null,
      points:    calcPoints(r.stats, statFields, participationPts),
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

  // ── Baseline helpers ──────────────────────────────────────────────────────

  function setBaselineStat(userId: string, field: string, value: string) {
    setBaselineDraft(prev => prev.map(r =>
      r.userId !== userId ? r : { ...r, stats: { ...r.stats, [field]: value } }
    ));
  }

  function setBaselineField(userId: string, field: "points" | "wins" | "participations", value: string) {
    setBaselineDraft(prev => prev.map(r =>
      r.userId !== userId ? r : { ...r, [field]: value }
    ));
  }

  function addBaselinePlayer(user: UserInfo) {
    if (baselineDraft.some(r => r.userId === user.id)) return;
    setBaselineDraft(prev => [...prev, {
      userId: user.id, user,
      points: "", wins: "", participations: "",
      stats: Object.fromEntries(statFields.map(f => [f.name, ""])),
    }]);
    setBaselineAddOpen(false);
    setBaselineSearch("");
  }

  function removeBaselinePlayer(userId: string) {
    setBaselineDraft(prev => prev.filter(r => r.userId !== userId));
  }

  async function saveBaseline() {
    setSavingBaseline(true);
    const bmap: Record<string, { points: number; wins: number; participations: number; stats: Record<string, number> }> = {};
    for (const row of baselineDraft) {
      const pts = statFields.length > 0 ? calcPoints(row.stats, statFields) : Number(row.points) || 0;
      bmap[row.userId] = {
        points:         pts,
        wins:           Number(row.wins) || 0,
        participations: Number(row.participations) || 0,
        stats:          Object.fromEntries(Object.entries(row.stats).map(([k, v]) => [k, Number(v) || 0])),
      };
    }
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId, baselineJson: baselineDraft.length > 0 ? JSON.stringify(bmap) : "" }),
    });
    setSavingBaseline(false);
    if (res.ok) toast.success("Historische Daten gespeichert");
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

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-3 max-w-2xl mx-auto w-full pb-8">

          {/* ── Punktesystem ── */}
          <div className="bg-gray-900 border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-teal-400 shrink-0" />
              <p className="text-sm font-medium text-white">Punktesystem konfigurieren</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Lege fest, welche Werte pro Event erfasst werden und wie viele Punkte jede Einheit gibt.
              Die Gesamtpunkte eines Spielers werden automatisch berechnet.
            </p>

            {statFields.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_6rem_2rem] gap-2 px-1">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Feld</span>
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold text-center">Pkt / Einheit</span>
                  <span />
                </div>
                {statFields.map((f, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_6rem_2rem] gap-2 items-center">
                    <input
                      type="text"
                      value={f.name}
                      onChange={e => updateStatField(idx, "name", e.target.value)}
                      placeholder="Feldname"
                      className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:border-teal-500/50 outline-none"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={f.pts}
                      onChange={e => updateStatField(idx, "pts", e.target.value)}
                      className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-center w-full focus:border-teal-500/50 outline-none"
                    />
                    <button onClick={() => setStatFields(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-600 active:text-red-500 p-1 rounded transition-colors flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {statFields.length === 0 && (
              <p className="text-xs text-gray-600 py-1">Noch keine Felder definiert. Füge unten ein Feld hinzu.</p>
            )}

            <div className="grid grid-cols-[1fr_6rem_auto] gap-2 items-end pt-1 border-t border-white/[0.05]">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Neues Feld</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStatField(); } }}
                  placeholder="z.B. Kills"
                  className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 w-full focus:border-teal-500/50 outline-none placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Pkt / Einheit</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newFieldPts}
                  onChange={e => setNewFieldPts(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStatField(); } }}
                  placeholder="0"
                  className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-center w-full focus:border-teal-500/50 outline-none placeholder:text-gray-600"
                />
              </div>
              <button onClick={addStatField}
                className="flex items-center gap-1.5 text-sm bg-gray-700 active:bg-gray-600 text-white rounded-lg px-3 py-2 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Participation points */}
            <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-gray-500 block mb-1">Punkte pro Teilnahme</label>
                <p className="text-[10px] text-gray-700 leading-relaxed">
                  Wird für jeden eingetragenen Spieler automatisch addiert.
                  0 = keine Teilnahme-Punkte.
                </p>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={participationPts}
                onChange={e => setParticipationPts(Number(e.target.value) || 0)}
                className="w-20 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-center focus:border-teal-500/50 outline-none shrink-0"
              />
            </div>

            {(statFields.length > 0 || participationPts > 0) && (
              <div className="bg-gray-800/50 rounded-lg px-3 py-2.5 text-xs text-gray-400 leading-relaxed">
                <span className="text-gray-600 font-medium">Formel: </span>
                {statFields.map((f, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-gray-600"> + </span>}
                    <span className="text-white">{f.name}</span>
                    {f.pts !== 0 && <span className="text-amber-400"> ×{f.pts}</span>}
                  </span>
                ))}
                {participationPts > 0 && (
                  <span>
                    {statFields.length > 0 && <span className="text-gray-600"> + </span>}
                    <span className="text-teal-400">{participationPts} pro Teilnahme</span>
                  </span>
                )}
              </div>
            )}

            <button onClick={saveStatFields} disabled={savingStats}
              className="flex items-center gap-1.5 text-sm bg-teal-700 active:bg-teal-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 transition-colors w-full sm:w-auto justify-center sm:justify-start">
              <Save className="w-4 h-4" />
              {savingStats ? "Speichern…" : "Punktesystem speichern"}
            </button>
          </div>

          {/* ── Historische Daten ── */}
          <div className="bg-gray-900 border border-white/[0.06] rounded-xl overflow-hidden">
            <button
              onClick={() => setBaselineExpanded(!baselineExpanded)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.03] transition-colors">
              <History className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-tight">Historische Daten</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Gesamtstatistiken aus der Vergangenheit direkt eintragen
                  {baselineDraft.length > 0 && <> · <span className="text-gray-600">{baselineDraft.length} Einträge</span></>}
                </p>
              </div>
              {baselineExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
            </button>

            {baselineExpanded && (
              <div className="border-t border-white/[0.05] p-4 space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Diese Werte werden direkt zur Gesamttabelle addiert — ohne einzelne vergangene Events eintragen zu müssen.
                  Ideal für Daten aus der Zeit vor diesem System.
                </p>

                {baselineDraft.map(row => {
                  const computed = statFields.length > 0 ? calcPoints(row.stats, statFields) : null;
                  return (
                    <div key={row.userId}
                      className="bg-gray-800/60 border border-white/[0.05] rounded-lg p-3 space-y-2.5">

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {row.user.image
                            ? <img src={row.user.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                            : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-gray-300 shrink-0">
                                {uname(row.user)[0]?.toUpperCase() ?? "?"}
                              </div>
                          }
                          <span className="text-sm font-semibold text-white truncate">{uname(row.user)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {computed !== null && (
                            <span className="text-xs font-bold text-amber-400 tabular-nums">
                              {computed.toLocaleString("de-DE")} Pkt
                            </span>
                          )}
                          <button onClick={() => removeBaselinePlayer(row.userId)}
                            className="text-gray-600 active:text-red-500 p-1.5 rounded-lg active:bg-red-900/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Core fields */}
                      <div className={`grid gap-2 ${
                        statFields.length === 0 ? "grid-cols-3" : "grid-cols-2"
                      }`}>
                        {statFields.length === 0 && (
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1 text-center">Punkte</label>
                            <input
                              type="number" inputMode="numeric" min={0}
                              value={row.points}
                              onChange={e => setBaselineField(row.userId, "points", e.target.value)}
                              placeholder="0"
                              className={inputCls}
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1 text-center">Siege</label>
                          <input
                            type="number" inputMode="numeric" min={0}
                            value={row.wins}
                            onChange={e => setBaselineField(row.userId, "wins", e.target.value)}
                            placeholder="0"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1 text-center">Teilnahmen</label>
                          <input
                            type="number" inputMode="numeric" min={0}
                            value={row.participations}
                            onChange={e => setBaselineField(row.userId, "participations", e.target.value)}
                            placeholder="0"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Stat fields */}
                      {statFields.length > 0 && (
                        <div className={`grid gap-2 ${
                          statFields.length === 1 ? "grid-cols-1" :
                          statFields.length === 2 ? "grid-cols-2" :
                          statFields.length <= 4  ? "grid-cols-2 sm:grid-cols-4" :
                          "grid-cols-2 sm:grid-cols-3"
                        }`}>
                          {statFields.map(f => (
                            <div key={f.name}>
                              <label className="text-[10px] text-gray-500 block mb-1 text-center truncate">
                                {f.name}
                                {f.pts > 0 && <span className="text-gray-700 ml-1">×{f.pts}</span>}
                              </label>
                              <input
                                type="number" inputMode="numeric" min={0}
                                value={row.stats[f.name] ?? ""}
                                onChange={e => setBaselineStat(row.userId, f.name, e.target.value)}
                                placeholder="0"
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add player to baseline */}
                {(() => {
                  const takenIds = new Set(baselineDraft.map(r => r.userId));
                  const filtered = allUsers
                    .filter(u => !takenIds.has(u.id))
                    .filter(u => !baselineSearch || uname(u).toLowerCase().includes(baselineSearch.toLowerCase()));
                  return !baselineAddOpen ? (
                    <button
                      onClick={() => { setBaselineAddOpen(true); setBaselineSearch(""); }}
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
                          value={baselineSearch}
                          onChange={e => setBaselineSearch(e.target.value)}
                          className="flex-1 text-sm bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 placeholder:text-gray-500 focus:border-teal-500/50 outline-none"
                        />
                        <button onClick={() => { setBaselineAddOpen(false); setBaselineSearch(""); }}
                          className="text-gray-500 active:text-white p-2 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-1">
                        {filtered.length === 0 && (
                          <p className="text-xs text-gray-600 py-2 text-center">
                            {baselineSearch ? "Kein Spieler gefunden." : "Alle Spieler bereits hinzugefügt."}
                          </p>
                        )}
                        {filtered.map(u => (
                          <button key={u.id}
                            onClick={() => addBaselinePlayer(u)}
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
                  );
                })()}

                <button onClick={saveBaseline} disabled={savingBaseline}
                  className="flex items-center gap-2 text-sm bg-purple-700 active:bg-purple-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 transition-colors w-full sm:w-auto justify-center sm:justify-start">
                  <Save className="w-4 h-4" />
                  {savingBaseline ? "Speichern…" : "Historische Daten speichern"}
                </button>
              </div>
            )}
          </div>

          {/* ── Events ── */}
          {events.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-8">Diese Reihe hat noch keine Events.</p>
          )}

          {events.map(ev => {
            const isExpanded = expandedEvent === ev.id;
            const draft      = eventDrafts[ev.id] ?? [];
            const takenIds   = new Set(draft.map(r => r.userId));
            const sortedDraft = [...draft].sort((a, b) => {
              const pa = calcPoints(a.stats, statFields, participationPts);
              const pb = calcPoints(b.stats, statFields, participationPts);
              return pb - pa || uname(a.user).localeCompare(uname(b.user));
            });
            const isAddOpen = addPlayerOpen === ev.id;
            const filteredUsers = allUsers
              .filter(u => !takenIds.has(u.id))
              .filter(u => !playerSearch || uname(u).toLowerCase().includes(playerSearch.toLowerCase()));

            return (
              <div key={ev.id} className="bg-gray-900 border border-white/[0.06] rounded-xl overflow-hidden">

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
                    {statFields.length === 0 && participationPts === 0 && (
                      <p className="text-xs text-amber-600 bg-amber-900/10 border border-amber-800/20 rounded-lg px-3 py-2">
                        Zuerst das Punktesystem oben konfigurieren.
                      </p>
                    )}

                    {/* Import participants button */}
                    {ev.participantUserIds.length > 0 && (
                      <button
                        onClick={() => importParticipants(ev)}
                        className="flex items-center justify-center gap-2 text-xs text-teal-400 active:text-white border border-teal-800/40 active:border-teal-600 rounded-lg px-3 py-2 w-full transition-colors">
                        <UserPlus className="w-3.5 h-3.5" />
                        {ev.participantUserIds.length} Teilnehmer importieren
                      </button>
                    )}

                    {sortedDraft.length === 0 && (statFields.length > 0 || participationPts > 0) && (
                      <p className="text-xs text-gray-600 py-1">Noch keine Einträge – Spieler oben importieren oder unten hinzufügen.</p>
                    )}

                    {sortedDraft.map(row => {
                      const computed = calcPoints(row.stats, statFields, participationPts);
                      return (
                        <div key={row.userId}
                          className="bg-gray-800/60 border border-white/[0.05] rounded-lg p-3 space-y-2.5">

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {row.user.image
                                ? <img src={row.user.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                                : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-gray-300 shrink-0">
                                    {uname(row.user)[0]?.toUpperCase() ?? "?"}
                                  </div>
                              }
                              <span className="text-sm font-semibold text-white truncate">{uname(row.user)}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {(statFields.length > 0 || participationPts > 0) && (
                                <span className="text-xs font-bold text-amber-400 tabular-nums">
                                  {computed.toLocaleString("de-DE")} Pkt
                                </span>
                              )}
                              <button onClick={() => removePlayer(ev.id, row.userId)}
                                className="text-gray-600 active:text-red-500 p-1.5 rounded-lg active:bg-red-900/20 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {statFields.length > 0 && (
                            <div className={`grid gap-2 ${
                              statFields.length === 1 ? "grid-cols-1" :
                              statFields.length === 2 ? "grid-cols-2" :
                              statFields.length <= 4  ? "grid-cols-2 sm:grid-cols-4" :
                              "grid-cols-2 sm:grid-cols-3"
                            }`}>
                              {statFields.map(f => (
                                <div key={f.name}>
                                  <label className="text-[10px] text-gray-500 block mb-1 text-center truncate">
                                    {f.name}
                                    {f.pts > 0 && <span className="text-gray-700 ml-1">×{f.pts}</span>}
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={row.stats[f.name] ?? ""}
                                    onChange={e => setRowStat(ev.id, row.userId, f.name, e.target.value)}
                                    placeholder="0"
                                    className={inputCls}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

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

                    <button onClick={() => saveEvent(ev.id)} disabled={savingEvent === ev.id || statFields.length === 0}
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
