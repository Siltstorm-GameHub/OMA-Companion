"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, CalendarPlus, RefreshCw, Gamepad2,
  Swords, Hash, BarChart2, Plus, X, Trophy, Save, Coins, Star,
  MessageSquare, ExternalLink,
} from "lucide-react";
import GameNameInput from "@/components/GameNameInput";
import { describeMonthlyModes } from "@/lib/recurrence";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const numCls   = "w-24 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

type SeriesEvent = {
  id: string; title: string; startAt: Date | string; status: string;
  maxPlayers: number | null; _count: { registrations: number };
};
type User = { id: string; name: string | null; username: string | null; image: string | null };

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
const DEFAULT_POLL: PollConfig = { enabled: false, question: "MVP", coins: 250, rankPoints: 3 };

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open:     { label: "Offen",    cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  active:   { label: "Aktiv",    cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  umfrage:  { label: "Umfrage",  cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  finished: { label: "Beendet", cls: "text-gray-500 bg-white/[0.03] border-white/[0.06]" },
};

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
function parsePollConfig(json: string | null | undefined): PollConfig {
  if (!json) return DEFAULT_POLL;
  try { return { ...DEFAULT_POLL, ...JSON.parse(json) }; } catch { return DEFAULT_POLL; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SeriesDetailClient({ series, allUsers }: { series: any; allUsers: User[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);

  // Basic
  const [name, setName]               = useState<string>(series.name);
  const [description, setDescription] = useState<string>(series.description ?? "");

  // Settings
  const [fixedGame, setFixedGame]           = useState<string>(series.fixedGame ?? "");
  const [fixedFormat, setFixedFormat]       = useState<string>(series.fixedFormat ?? "");
  const [discordChannelId, setDiscordChannelId] = useState<string>(series.discordChannelId ?? "");
  const [recurrenceType, setRecurrenceType] = useState<"" | "weekly" | "biweekly" | "monthly">(series.recurrenceType ?? "");
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<"dayOfMonth" | "weekdayOfMonth">(series.recurrenceMonthlyMode ?? "dayOfMonth");
  const [propagateGame, setPropagateGame]     = useState(false);
  const [propagateFormat, setPropagateFormat] = useState(false);

  // Stat config
  const initialStatCfg = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : {}; } catch { return {}; }
  })();
  const [statParticipationPts, setStatParticipationPts] = useState<number>(initialStatCfg.participationPoints ?? 0);
  const [statRows, setStatRows] = useState<{ field: string; pointsPer: number }[]>(initialStatCfg.stats ?? []);

  // Legacy standings
  type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };
  const [legacyRows, setLegacyRows] = useState<LegacyRow[]>(() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  });
  const [legacySearch, setLegacySearch] = useState("");

  // Placement rewards
  const initialRewards = parseRewards(series.placementRewardsJson);
  const [participationCoins, setParticipationCoins] = useState<number>(initialRewards.participationCoins);
  const [placementRewards, setPlacementRewards] = useState<PlacementReward[]>(initialRewards.placements);

  // Poll config
  const [poll, setPoll] = useState<PollConfig>(parsePollConfig(series.pollConfigJson));

  const latestEvent = series.events[series.events.length - 1];
  const latestStartAt = latestEvent ? new Date(latestEvent.startAt) : new Date();

  function updatePlacementReward(place: number, key: keyof PlacementReward, value: number) {
    setPlacementRewards(prev => prev.map(r => r.place === place ? { ...r, [key]: value } : r));
  }

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId: series.id,
        name:                 name.trim() || series.name,
        description:          description.trim() || null,
        fixedGame:            fixedGame.trim() || null,
        fixedFormat:          fixedFormat || null,
        discordChannelId:     discordChannelId.trim() || null,
        recurrenceType:       recurrenceType || null,
        recurrenceMonthlyMode: recurrenceType === "monthly" ? recurrenceMonthlyMode : null,
        propagateGame,
        propagateFormat,
        seriesStatConfig: JSON.stringify({
          participationPoints: statParticipationPts,
          stats: statRows.filter(r => r.field.trim()),
        }),
        legacyStandings:     JSON.stringify(legacyRows),
        placementRewardsJson: JSON.stringify({ participationCoins, placements: placementRewards }),
        pollConfigJson:       JSON.stringify(poll),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Reihe gespeichert");
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
      body: JSON.stringify({ seriesId: series.id }),
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

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/series" className="flex items-center gap-1 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Eventreihen
        </Link>
        <span>/</span>
        <span className="text-gray-300">{series.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <input
            value={name} onChange={e => setName(e.target.value)}
            className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-teal-500/50 outline-none transition-colors w-full max-w-lg"
            placeholder="Reihen-Name"
          />
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            className="text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-white/10 focus:border-teal-500/30 outline-none transition-colors w-full max-w-lg"
            placeholder="Beschreibung hinzufügen…"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/events/series/${series.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/[0.08] hover:border-white/20 rounded-lg px-3 py-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Öffentlich ansehen
          </Link>
          <button
            onClick={saveSettings} disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Left column: Settings ── */}
        <div className="space-y-4">

          {/* Spiel & Format */}
          <Section title="Spiel & Format">
            <Field label={<><Gamepad2 className="w-3 h-3" /> Festes Spiel</>}>
              <GameNameInput value={fixedGame} onChange={setFixedGame} placeholder="Leer = verschiedene Spiele" className={inputCls} />
              <Checkbox checked={propagateGame} onChange={setPropagateGame} label="Auf bestehende Events übertragen" />
            </Field>
            <Field label={<><Swords className="w-3 h-3" /> Festes Turnierformat</>}>
              <select value={fixedFormat} onChange={e => setFixedFormat(e.target.value)} className={inputCls}>
                <option value="">– Kein festes Format –</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
                <option value="ffa">Free-for-All</option>
                <option value="coop_stats">Coop / Stats</option>
              </select>
              <Checkbox checked={propagateFormat} onChange={setPropagateFormat} label="Auf bestehende Turniere übertragen" />
            </Field>
          </Section>

          {/* Discord & Wiederholung */}
          <Section title="Discord & Wiederholung">
            <Field label={<><Hash className="w-3 h-3" /> Discord-Kanal</>}>
              <input type="text" value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
                placeholder="Kanal-ID (leer = Standard)" className={inputCls} />
              <p className="text-[11px] text-gray-600 mt-1">Wird auf alle Events der Reihe angewendet</p>
            </Field>
            <Field label={<><RefreshCw className="w-3 h-3" /> Wiederholung</>}>
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
            </Field>
          </Section>

          {/* Belohnungen */}
          <Section title="Belohnungen (Standard für neue Events)">
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs text-gray-500 px-1">
                <span>Platzierung</span><span className="text-center">Punkte</span><span className="text-center">Münzen</span>
              </div>
              {placementRewards.map(r => (
                <div key={r.place} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <span className="text-sm text-gray-300 flex items-center gap-1.5">
                    {r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : "🥉"} {r.place}. Platz
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-purple-400 shrink-0" />
                    <input type="number" min={0} value={r.rankPoints}
                      onChange={e => updatePlacementReward(r.place, "rankPoints", Number(e.target.value))}
                      className={numCls} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                    <input type="number" min={0} value={r.coins}
                      onChange={e => updatePlacementReward(r.place, "coins", Number(e.target.value))}
                      className={numCls} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                <span className="text-sm text-gray-400 flex-1">Teilnahme</span>
                <div className="flex items-center gap-1 col-span-1" style={{ gridColumn: "3" }}>
                  <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                  <input type="number" min={0} value={participationCoins}
                    onChange={e => setParticipationCoins(Number(e.target.value))}
                    className={numCls} />
                </div>
              </div>
            </div>
          </Section>

          {/* Poll-Konfiguration */}
          <Section title="Poll-Konfiguration">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={poll.enabled} onChange={e => setPoll(p => ({ ...p, enabled: e.target.checked }))}
                className="rounded accent-teal-500" />
              <span className="text-sm text-gray-300">Poll nach Event aktivieren</span>
            </label>
            {poll.enabled && (
              <div className="space-y-3 mt-2">
                <Field label={<><MessageSquare className="w-3 h-3" /> Was wird gewählt</>}>
                  <input type="text" value={poll.question} onChange={e => setPoll(p => ({ ...p, question: e.target.value }))}
                    placeholder="z.B. MVP, Trostpreis, …" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Star className="w-3 h-3 text-purple-400" /> Punkte</label>
                    <input type="number" min={0} value={poll.rankPoints}
                      onChange={e => setPoll(p => ({ ...p, rankPoints: Number(e.target.value) }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Münzen</label>
                    <input type="number" min={0} value={poll.coins}
                      onChange={e => setPoll(p => ({ ...p, coins: Number(e.target.value) }))}
                      className={inputCls} />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Gesamttabellen-Konfiguration */}
          <Section title="Gesamttabellen-Konfiguration">
            <Field label={<><BarChart2 className="w-3 h-3" /> Punkte pro Teilnahme (Leaderboard)</>}>
              <input type="number" min={0} value={statParticipationPts}
                onChange={e => setStatParticipationPts(Number(e.target.value))}
                className={inputCls} />
            </Field>
            <div className="space-y-1.5">
              {statRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" defaultValue={row.field}
                    onBlur={e => { const v = e.target.value; setStatRows(prev => prev.map((r, j) => j === i ? { ...r, field: v } : r)); }}
                    placeholder="Stat-Name (z.B. Kills)"
                    className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
                  />
                  <input type="number" min={0} defaultValue={row.pointsPer}
                    onBlur={e => { const v = Number(e.target.value); setStatRows(prev => prev.map((r, j) => j === i ? { ...r, pointsPer: v } : r)); }}
                    placeholder="Pkt./Einheit" className="w-20 shrink-0 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
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
          </Section>

          {/* Legacy-Stand */}
          <Section title="Legacy-Stand">
            <p className="text-xs text-gray-600">Historische Werte vor App-Einführung</p>
            {legacyRows.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {legacyRows.map((row, i) => {
                  const u = allUsers.find(u => u.id === row.userId);
                  const displayName = u?.username ?? u?.name ?? row.userId.slice(0, 8);
                  return (
                    <div key={row.userId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-white truncate">{displayName}</span>
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
                        <span className="flex items-center gap-1.5 text-[11px] text-teal-500">
                          Punkte (auto)
                          <span className="w-16 rounded px-1.5 py-0.5 text-[11px] text-teal-300 bg-teal-900/20 border border-teal-800/40 tabular-nums">
                            {row.points}
                          </span>
                        </span>
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
          </Section>
        </div>

        {/* ── Right column: Events ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Events dieser Reihe
            </h2>
            {recurrenceType && (
              <button
                onClick={generateNextEvent} disabled={generatingNext}
                className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white border border-teal-600/40 hover:bg-teal-600 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                {generatingNext ? "Erstellt…" : "Nächsten Termin generieren"}
              </button>
            )}
          </div>

          {series.events.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm border border-white/[0.05] rounded-xl">
              Noch keine Events in dieser Reihe
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/[0.06]">
              {(series.events as SeriesEvent[]).map((ev, i) => {
                const st = STATUS_CONFIG[ev.status] ?? { label: ev.status, cls: "text-gray-500" };
                const date = new Date(ev.startAt).toLocaleDateString("de-DE", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                });
                return (
                  <Link
                    key={ev.id}
                    href={`/admin/events/${ev.id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                      i > 0 ? "border-t border-white/[0.05]" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{ev.title}</p>
                      <p className="text-xs text-gray-600">{date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-600">
                        {ev._count.registrations}{ev.maxPlayers ? `/${ev.maxPlayers}` : ""} Spieler
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small helper components ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.05]">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-500 flex items-center gap-1.5">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded accent-teal-500" />
      <span className="text-[11px] text-gray-500">{label}</span>
    </label>
  );
}
