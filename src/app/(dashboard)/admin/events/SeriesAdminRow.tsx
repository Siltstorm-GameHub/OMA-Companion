"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Repeat, Gamepad2, Swords, Hash, RefreshCw,
  CalendarPlus, BarChart2, Plus, X, Trophy, ExternalLink, Settings,
} from "lucide-react";
import Link from "next/link";
import { describeMonthlyModes } from "@/lib/recurrence";
import GameNameInput from "@/components/GameNameInput";
import EventAdminRow from "./EventAdminRow";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

type User = { id: string; name: string | null; username: string | null; image: string | null };

// Minimal Event type mirroring EventAdminRow's Event type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeriesEvent = any;

type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };

export default function SeriesAdminRow({
  seriesId,
  seriesName,
  events,
  allUsers,
}: {
  seriesId: string;
  seriesName: string;
  events: SeriesEvent[];
  allUsers: User[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);

  /* ── Series settings state ── */
  const [loaded, setLoaded] = useState(false);
  const [fixedGame, setFixedGame] = useState("");
  const [fixedFormat, setFixedFormat] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<"" | "weekly" | "biweekly" | "monthly">("");
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<"dayOfMonth" | "weekdayOfMonth">("dayOfMonth");
  const [propagateGame, setPropagateGame] = useState(false);
  const [propagateFormat, setPropagateFormat] = useState(false);

  /* ── Stat config ── */
  const statConfigInitialized = useRef(false);
  const [statParticipationPts, setStatParticipationPts] = useState(0);
  const [statRows, setStatRows] = useState<{ field: string; pointsPer: number; isWinnerStat?: boolean; isMatchWinStat?: boolean }[]>([]);
  // Felder aus der Reihen-Konfiguration, die dieses Panel nicht editiert (mvpStatField,
  // winnerStatKeys, eventStatFields, transferToGlobalRanking, matchWinStatKeys, dominionBonus, ...)
  // — beim Speichern unverändert zurückschreiben, statt sie durch eine unvollständige
  // Rekonstruktion zu verlieren.
  const [statCfgRest, setStatCfgRest] = useState<Record<string, unknown>>({});

  /* ── Legacy standings ── */
  const [legacyRows, setLegacyRows] = useState<LegacyRow[]>([]);
  const [legacySearch, setLegacySearch] = useState("");

  /* Load series settings when expanded */
  useEffect(() => {
    if (!expanded || loaded) return;
    fetch(`/api/admin/event-series?id=${seriesId}`)
      .then(r => r.json())
      .then(d => {
        setFixedGame(d.fixedGame ?? "");
        setFixedFormat(d.fixedFormat ?? "");
        setDiscordChannelId(d.discordChannelId ?? "");
        setRecurrenceType(d.recurrenceType ?? "");
        setRecurrenceMonthlyMode(d.recurrenceMonthlyMode ?? "dayOfMonth");
        if (!statConfigInitialized.current) {
          statConfigInitialized.current = true;
          if (d.seriesStatConfig) {
            try {
              const cfg = JSON.parse(d.seriesStatConfig);
              setStatParticipationPts(cfg.participationPoints ?? 0);
              setStatRows(cfg.stats ?? []);
              const rest = { ...cfg };
              delete rest.participationPoints;
              delete rest.stats;
              setStatCfgRest(rest);
            } catch { /* ignore */ }
          }
          if (d.legacyStandings) {
            try { setLegacyRows(JSON.parse(d.legacyStandings)); } catch { /* ignore */ }
          }
        }
        setLoaded(true);
      })
      .catch(() => {});
  }, [expanded, loaded, seriesId]);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId,
        fixedGame:             fixedGame.trim() || null,
        fixedFormat:           fixedFormat || null,
        discordChannelId:      discordChannelId.trim() || null,
        recurrenceType:        recurrenceType || null,
        recurrenceMonthlyMode: recurrenceType === "monthly" ? recurrenceMonthlyMode : null,
        propagateGame,
        propagateFormat,
        seriesStatConfig: JSON.stringify({
          ...statCfgRest,
          participationPoints: statParticipationPts,
          stats: statRows.filter(r => r.field.trim()),
          winnerStatKeys: statRows.filter(r => r.field.trim() && r.isWinnerStat).map(r => r.field),
          matchWinStatKeys: statRows.filter(r => r.field.trim() && r.isMatchWinStat).map(r => r.field),
        }),
        legacyStandings: JSON.stringify(legacyRows),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Reihen-Einstellungen gespeichert");
      setPropagateGame(false);
      setPropagateFormat(false);
      router.refresh();
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  async function generateNextEvent() {
    setGeneratingNext(true);
    const res = await fetch("/api/admin/event-series/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId }),
    });
    setGeneratingNext(false);
    if (res.ok) {
      const { event: newEv } = await res.json();
      const dateStr = new Date(newEv.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      toast.success(`Neuer Termin erstellt: ${newEv.title} am ${dateStr}`);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Fehler beim Erstellen");
    }
  }

  const latestEvent = events[events.length - 1];
  const latestStartAt = latestEvent ? new Date(latestEvent.startAt) : new Date();

  const statusCounts = events.reduce((acc: Record<string, number>, e: SeriesEvent) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl overflow-hidden border border-teal-500/20 bg-teal-500/[0.02]">
      {/* ── Series header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Repeat className="w-4 h-4 text-teal-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white text-sm">{seriesName}</p>
            <span className="text-[10px] text-teal-600 bg-teal-500/10 border border-teal-500/15 px-2 py-0.5 rounded-full">
              Eventreihe · {events.length} Events
            </span>
            {statusCounts["active"]  > 0 && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{statusCounts["active"]} aktiv</span>}
            {statusCounts["open"]    > 0 && <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{statusCounts["open"]} offen</span>}
            {statusCounts["finished"]> 0 && <span className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">{statusCounts["finished"]} beendet</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/events/series/${seriesId}`}
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-teal-600 hover:text-teal-400 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Ansehen
          </Link>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </div>

      {expanded && (
        <div className="border-t border-teal-500/10">

          {/* ── Reihen-Einstellungen (collapsible) ── */}
          <div className="border-b border-white/[0.05]">
            <button
              type="button"
              onClick={() => setSettingsOpen(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Reihen-Einstellungen
              {settingsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>

            {settingsOpen && (
              <div className="px-4 pb-4 space-y-4">

                {/* Festes Spiel */}
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                    <Gamepad2 className="w-3 h-3" />
                    Festes Spiel <span className="text-gray-600">(gilt für alle Events der Reihe)</span>
                  </label>
                  <GameNameInput value={fixedGame} onChange={setFixedGame} placeholder="Leer = verschiedene Spiele möglich" className={inputCls} />
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={propagateGame} onChange={e => setPropagateGame(e.target.checked)} className="rounded accent-teal-500" />
                    <span className="text-[11px] text-gray-500">Spiel auf alle Events der Reihe übertragen</span>
                  </label>
                </div>

                {/* Festes Turnierformat */}
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                    <Swords className="w-3 h-3" />
                    Festes Turnierformat
                  </label>
                  <select value={fixedFormat} onChange={e => setFixedFormat(e.target.value)} className={inputCls}>
                    <option value="">– Kein festes Format –</option>
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="ffa">Free-for-All</option>
                    <option value="coop_stats">Coop / Stats</option>
                  </select>
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={propagateFormat} onChange={e => setPropagateFormat(e.target.checked)} className="rounded accent-teal-500" />
                    <span className="text-[11px] text-gray-500">Format auf alle Turniere der Reihe übertragen</span>
                  </label>
                </div>

                {/* Discord-Kanal */}
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                    <Hash className="w-3 h-3" />
                    Discord-Kanal <span className="text-gray-600">(für alle Events der Reihe)</span>
                  </label>
                  <input type="text" value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
                    placeholder="Kanal-ID (leer = Standard)" className={inputCls} />
                </div>

                {/* Wiederholung */}
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                    <RefreshCw className="w-3 h-3" />
                    Wiederholungsintervall
                  </label>
                  <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as typeof recurrenceType)} className={inputCls}>
                    <option value="">Keine Wiederholung</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="biweekly">Alle 2 Wochen</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                  {recurrenceType === "monthly" && (() => {
                    const labels = describeMonthlyModes(latestStartAt);
                    return (
                      <div className="mt-2 space-y-1.5">
                        {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
                          <button key={mode} type="button" onClick={() => setRecurrenceMonthlyMode(mode)}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                            style={recurrenceMonthlyMode === mode
                              ? { background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                              : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }
                            }>
                            {labels[mode]}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Gesamttabellen-Konfiguration */}
                <div className="space-y-3">
                  <label className="text-xs text-gray-500 flex items-center gap-1.5">
                    <BarChart2 className="w-3 h-3" />
                    Gesamttabellen-Konfiguration
                    <span className="text-gray-600">(Punkte aus Event-Statistiken)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-32 shrink-0">Punkte pro Teilnahme</span>
                    <input type="number" min={0} value={statParticipationPts}
                      onChange={e => setStatParticipationPts(Number(e.target.value))}
                      className="w-20 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors" />
                  </div>

                  <div className="space-y-1.5">
                    {statRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={row.field}
                          onBlur={e => { const v = e.target.value; setStatRows(prev => prev.map((r, j) => j === i ? { ...r, field: v } : r)); }}
                          placeholder="Stat-Name (z.B. Kills)"
                          className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
                        />
                        <input
                          type="number" min={0}
                          defaultValue={row.pointsPer}
                          onBlur={e => { const v = Number(e.target.value); setStatRows(prev => prev.map((r, j) => j === i ? { ...r, pointsPer: v } : r)); }}
                          placeholder="Pkt./Einheit"
                          className="w-24 shrink-0 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
                        />
                        <button type="button" onClick={() => setStatRows(prev => prev.filter((_, j) => j !== i))}
                          className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setStatRows(prev => [...prev, { field: "", pointsPer: 1 }])}
                      className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300 transition-colors">
                      <Plus className="w-3 h-3" /> Statistik hinzufügen
                    </button>
                  </div>
                </div>

                {/* Legacy-Stand */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    Legacy-Stand <span className="text-gray-600">(historische Werte vor App-Einführung)</span>
                  </label>

                  {legacyRows.length > 0 && (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {legacyRows.map((row, i) => {
                        const u = allUsers.find(u => u.id === row.userId);
                        const name = u?.username ?? u?.name ?? row.userId.slice(0, 8);
                        return (
                          <div key={row.userId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-white truncate">{name}</span>
                              <button type="button" onClick={() => setLegacyRows(prev => prev.filter((_, j) => j !== i))}
                                className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                Teilnahmen
                                <input type="number" min={0} value={row.participations}
                                  onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                    if (j !== i) return r;
                                    const newPart = Number(e.target.value);
                                    const calcPts = newPart * statParticipationPts
                                      + statRows.filter(sr => sr.field.trim()).reduce((sum, sr) => sum + (r.stats[sr.field] ?? 0) * sr.pointsPer, 0);
                                    return { ...r, participations: newPart, points: calcPts };
                                  }))}
                                  className="w-16 rounded px-1.5 py-0.5 text-[11px] text-white bg-gray-800 border border-gray-700" />
                              </label>
                              {statRows.filter(s => s.field.trim()).map(s => (
                                <label key={s.field} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                  {s.field}
                                  <input type="number" min={0} value={row.stats[s.field] ?? 0}
                                    onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                      if (j !== i) return r;
                                      const newStats = { ...r.stats, [s.field]: Number(e.target.value) };
                                      const calcPts = r.participations * statParticipationPts
                                        + statRows.filter(sr => sr.field.trim()).reduce((sum, sr) => sum + (newStats[sr.field] ?? 0) * sr.pointsPer, 0);
                                      return { ...r, stats: newStats, points: calcPts };
                                    }))}
                                    className="w-16 rounded px-1.5 py-0.5 text-[11px] text-white bg-gray-800 border border-gray-700" />
                                </label>
                              ))}
                              <label className="flex items-center gap-1.5 text-[11px] text-teal-500">
                                Punkte (auto)
                                <span className="w-16 rounded px-1.5 py-0.5 text-[11px] text-teal-300 bg-teal-900/20 border border-teal-800/40 tabular-nums">
                                  {row.points}
                                </span>
                              </label>
                            </div>
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
                        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                          {filtered.map(u => (
                            <button key={u.id} type="button"
                              onClick={() => { setLegacyRows(prev => [...prev, { userId: u.id, points: 0, participations: 0, stats: {} }]); setLegacySearch(""); }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.06] flex items-center gap-2 transition-colors">
                              {u.image ? <img src={u.image} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" /> : <div className="w-5 h-5 rounded-full bg-gray-700 shrink-0" />}
                              {u.username ?? u.name}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Speichern */}
                <div className="flex gap-2 flex-wrap items-center">
                  <button onClick={saveSettings} disabled={saving}
                    className="text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
                    {saving ? "Speichert…" : "Reihe speichern"}
                  </button>
                  {recurrenceType && (
                    <button onClick={generateNextEvent} disabled={generatingNext}
                      className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white border border-teal-600/40 hover:bg-teal-600 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50">
                      <CalendarPlus className="w-3.5 h-3.5" />
                      {generatingNext ? "Erstellt…" : "Nächsten Termin erstellen"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Events der Reihe ── */}
          <div className="divide-y divide-white/[0.04]">
            {events.map((ev: SeriesEvent) => (
              <div key={ev.id} className="pl-4 border-l-2 border-teal-500/20">
                <EventAdminRow event={ev} allUsers={allUsers} hideSeries />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
