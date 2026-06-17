"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Trophy, Settings, Users, UserPlus, UserMinus,
  Search, Trash2, AlertTriangle, Repeat, X, GitBranch, Gamepad2, Swords, ExternalLink, Hash, CalendarPlus, RefreshCw, BarChart2, Plus, CheckCircle2,
} from "lucide-react";
import { describeMonthlyModes } from "@/lib/recurrence";
import Link from "next/link";
import TournamentManager from "./TournamentManager";
import GameNameInput from "@/components/GameNameInput";
import EventCompletionModal from "./EventCompletionModal";

/* ── Types ───────────────────────────────────────────────────────────────── */
type User = { id: string; name: string | null; username: string | null; image: string | null };
type MatchEntry = { id: string; userId: string | null; teamId: string | null; placement: number | null; score: number | null; statsJson: string | null };
type Match = { id: string; round: number; position: number; title: string | null; scheduledAt: string | Date | null; notes: string | null; player1Id: string | null; player2Id: string | null; winnerId: string | null; score1: number | null; score2: number | null; playedAt: string | Date | null; entries: MatchEntry[] };
type Participant = { userId: string; seed: number | null; eliminated: boolean; user: User };
type Registration = { userId: string };
type Tournament = { id: string; status: string; format: string; pointsConfig: string | null; statFields: string | null; finalRankingJson: string | null; finalRankingNote: string | null; participants: Participant[]; matches: Match[] };
type Series = { id: string; name: string; _count: { events: number } };
type Event = {
  id: string; title: string; description: string | null; status: string; game: string | null;
  startAt: Date; maxPlayers: number | null; pointReward: number; type: string;
  discordChannelId?: string | null;
  seriesId?: string | null;
  series?: { id: string; name: string } | null;
  _count: { registrations: number };
  registrations: Registration[];
  completionData?: unknown;
  // Tournament fields (now directly on Event)
  format: string | null;
  tournamentStatus: string | null;
  pointsConfig: string | null;
  statFields: string | null;
  finalRankingJson: string | null;
  finalRankingNote: string | null;
  participants: Participant[];
  matches: Match[];
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_OPTIONS = ["open", "active", "closed", "finished"];
const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-900/50 text-blue-300", active: "bg-green-900/50 text-green-300",
  closed: "bg-amber-900/50 text-amber-300", finished: "bg-gray-800 text-gray-500",
};
const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

type Tab = "settings" | "participants" | "bracket";

/* ── Scope-Modal ─────────────────────────────────────────────────────────── */
function ScopeModal({
  seriesName,
  onSingle,
  onAll,
  onCancel,
}: {
  seriesName: string;
  onSingle: () => void;
  onAll: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div ref={ref} className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-white">Änderungsbereich</h3>
            </div>
            <p className="text-xs text-gray-400">
              Dieses Event gehört zur Reihe <span className="text-teal-400 font-medium">{seriesName}</span>.
              Sollen Titel und Beschreibung für alle Events der Reihe übernommen werden?
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-600 hover:text-gray-400 mt-0.5 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={onSingle}
            className="w-full text-left px-4 py-3 rounded-xl border border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
          >
            <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">Nur dieses Event</p>
            <p className="text-xs text-gray-500 mt-0.5">Status, Punkte und andere Felder werden immer nur für dieses Event gespeichert.</p>
          </button>
          <button
            onClick={onAll}
            className="w-full text-left px-4 py-3 rounded-xl border border-teal-500/30 hover:border-teal-500/60 bg-teal-500/5 hover:bg-teal-500/10 transition-all group"
          >
            <p className="text-sm font-medium text-teal-300 group-hover:text-teal-200 transition-colors flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5" /> Gesamte Reihe
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Titel und Beschreibung werden für alle Events in „{seriesName}" aktualisiert.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function EventAdminRow({ event, allUsers, hideSeries = false }: { event: Event; allUsers: User[]; hideSeries?: boolean }) {
  const [expanded, setExpanded]   = useState(false);
  const [tab, setTab]             = useState<Tab>("settings");
  const router                    = useRouter();
  const { data: session }         = useSession();
  const isAdmin                   = session?.user?.role === "admin";

  /* ── Settings state ── */
  const [status, setStatus]                     = useState(event.status);
  const [pointReward, setPointReward]           = useState(event.pointReward);
  const [title, setTitle]                       = useState(event.title);
  const [description, setDescription]           = useState(event.description ?? "");
  const [discordChannelId, setDiscordChannelId] = useState(event.discordChannelId ?? "");
  const [loading, setLoading]                   = useState(false);

  /* ── Series state ── */
  const [seriesMode, setSeriesMode]         = useState<"keep" | "none" | "existing" | "new">("keep");
  const [seriesList, setSeriesList]         = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState(event.seriesId ?? "");
  const [newSeriesName, setNewSeriesName]   = useState("");
  const [newSeriesDesc, setNewSeriesDesc]   = useState("");
  const [seriesLoaded, setSeriesLoaded]     = useState(false);

  /* ── Series settings state ── */
  const [seriesFixedGame, setSeriesFixedGame]               = useState("");
  const [seriesFixedFormat, setSeriesFixedFormat]           = useState("");
  const [seriesDiscordChannelId, setSeriesDiscordChannelId] = useState("");
  const [propagateGame, setPropagateGame]                   = useState(false);
  const [propagateFormat, setPropagateFormat]               = useState(false);
  const [seriesSettingsLoaded, setSeriesSettingsLoaded]     = useState(false);
  const [seriesSettingsSaving, setSeriesSettingsSaving]     = useState(false);

  /* ── Series stat config state ── */
  const [statParticipationPts, setStatParticipationPts] = useState(0);
  const [statRows, setStatRows] = useState<{ field: string; pointsPer: number }[]>([]);
  const [statMvpField, setStatMvpField]                       = useState("");
  const [statDefaultWinnerField, setStatDefaultWinnerField]   = useState("");
  const [statDefaultTargetField, setStatDefaultTargetField]   = useState("");
  const statConfigInitialized = useRef(false);

  /* ── Legacy standings state ── */
  type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };
  const [legacyRows, setLegacyRows]   = useState<LegacyRow[]>([]);
  const [legacySearch, setLegacySearch] = useState("");

  /* ── Recurrence state ── */
  const [recurrenceType, setRecurrenceType]             = useState<"" | "weekly" | "biweekly" | "monthly">("");
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<"dayOfMonth" | "weekdayOfMonth">("dayOfMonth");
  const [generatingNext, setGeneratingNext]             = useState(false);

  /* ── Scope modal ── */
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [pendingSave, setPendingSave]       = useState<"single" | null>(null);

  /* ── Completion modal ── */
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  /* ── Participants state ── */
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [search, setSearch]             = useState("");

  /* Load series list when expanded */
  useEffect(() => {
    if (expanded && !seriesLoaded) {
      fetch("/api/events/series")
        .then(r => r.json())
        .then(data => { setSeriesList(data); setSeriesLoaded(true); })
        .catch(() => {});
    }
  }, [expanded, seriesLoaded]);

  /* Load current series settings (fixedGame, fixedFormat) when expanded */
  useEffect(() => {
    if (expanded && event.seriesId && !seriesSettingsLoaded) {
      fetch(`/api/admin/event-series?id=${event.seriesId}`)
        .then(r => r.json())
        .then(d => {
          setSeriesFixedGame(d.fixedGame ?? "");
          setSeriesFixedFormat(d.fixedFormat ?? "");
          setSeriesDiscordChannelId(d.discordChannelId ?? "");
          setRecurrenceType(d.recurrenceType ?? "");
          setRecurrenceMonthlyMode(d.recurrenceMonthlyMode ?? "dayOfMonth");
          if (!statConfigInitialized.current) {
            statConfigInitialized.current = true;
            if (d.seriesStatConfig) {
              try {
                const cfg = JSON.parse(d.seriesStatConfig);
                setStatParticipationPts(cfg.participationPoints ?? 0);
                setStatRows(cfg.stats ?? []);
                setStatMvpField(cfg.mvpStatField ?? "");
                setStatDefaultWinnerField(cfg.defaultWinnerStatField ?? "");
                setStatDefaultTargetField(cfg.defaultWinnerTargetField ?? "");
              } catch { /* ignore */ }
            }
            if (d.legacyStandings) {
              try { setLegacyRows(JSON.parse(d.legacyStandings)); } catch { /* ignore */ }
            }
          }
          setSeriesSettingsLoaded(true);
        })
        .catch(() => {});
    }
  }, [expanded, event.seriesId, seriesSettingsLoaded]);

  const registeredIds = new Set(event.registrations.map(r => r.userId));
  const userName      = (u: User) => u.username ?? u.name ?? "?";

  // Adapter: map Event's tournament fields → Tournament shape for child components
  const tournament: Tournament | null = event.format
    ? {
        id:               event.id,
        status:           event.tournamentStatus ?? "active",
        format:           event.format,
        pointsConfig:     event.pointsConfig,
        statFields:       event.statFields,
        finalRankingJson: event.finalRankingJson,
        finalRankingNote: event.finalRankingNote,
        participants:     event.participants,
        matches:          event.matches,
      }
    : null;

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(u => userName(u).toLowerCase().includes(q));
  }, [allUsers, search]);

  /* ── Helpers ── */
  const hasSeriesNow     = !!(event.seriesId);
  const contentChanged   = title !== event.title || description !== (event.description ?? "");
  const needsScopeDialog = hasSeriesNow && contentChanged && seriesMode === "keep";

  /* ── Resolve seriesId to save ── */
  async function resolveSeriesId(): Promise<string | null | "KEEP"> {
    if (seriesMode === "keep")     return "KEEP"; // don't change
    if (seriesMode === "none")     return null;
    if (seriesMode === "existing") return selectedSeries || null;
    if (seriesMode === "new" && newSeriesName.trim()) {
      const res = await fetch("/api/events/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim(), description: newSeriesDesc.trim() || null }),
      });
      if (!res.ok) { toast.error("Fehler beim Erstellen der Eventreihe"); return "KEEP"; }
      const s = await res.json();
      return s.id;
    }
    return "KEEP";
  }

  async function doSave(scope: "single" | "all") {
    setLoading(true);
    try {
      const resolvedSeriesId = await resolveSeriesId();
      if (resolvedSeriesId === "KEEP" && seriesMode !== "keep") {
        setLoading(false);
        return;
      }

      const body: Record<string, unknown> = {
        eventId:          event.id,
        status,
        pointReward,
        title,
        description:      description || null,
        discordChannelId: discordChannelId.trim() || null,
        seriesScope:      scope,
      };

      if (resolvedSeriesId !== "KEEP") {
        body.seriesId = resolvedSeriesId;
      }

      const res = await fetch("/api/admin/events", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(scope === "all"
          ? "Änderungen für gesamte Reihe gespeichert"
          : "Event-Einstellungen gespeichert"
        );
        router.refresh();
      } else {
        toast.error("Fehler beim Speichern");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSaveClick() {
    if (needsScopeDialog) {
      setShowScopeModal(true);
    } else {
      doSave("single");
    }
  }

  async function deleteEvent() {
    if (!confirm(
      `Event "${event.title}" KOMPLETT löschen?\n\n` +
      `Dies entfernt unwiderruflich:\n` +
      `• ${event._count.registrations} Anmeldung(en)\n` +
      `${tournament ? `• Das Turnier mit allen Matches und Teilnehmern\n` : ""}` +
      `• Das Event selbst\n\n` +
      `Diese Aktion kann nicht rückgängig gemacht werden.`
    )) return;
    setLoading(true);
    const res = await fetch(`/api/admin/events?eventId=${event.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) toast.success(`"${event.title}" wurde gelöscht`);
    else toast.error("Fehler beim Löschen");
    router.refresh();
  }

  async function deleteTournament() {
    if (!tournament) return;
    if (!confirm(`Turnier für "${event.title}" wirklich löschen?\n\nAlle Matches und Teilnehmer-Daten werden entfernt. Das Event selbst bleibt bestehen.`)) return;
    setLoading(true);
    await fetch(`/api/tournaments/${event.id}`, { method: "DELETE" });
    setLoading(false);
    toast.success("Turnier gelöscht");
    router.refresh();
  }

  async function saveSeriesSettings() {
    if (!event.seriesId) return;
    setSeriesSettingsSaving(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId:              event.seriesId,
        fixedGame:             seriesFixedGame.trim() || null,
        fixedFormat:           seriesFixedFormat || null,
        discordChannelId:      seriesDiscordChannelId.trim() || null,
        recurrenceType:        recurrenceType || null,
        recurrenceMonthlyMode: recurrenceType === "monthly" ? recurrenceMonthlyMode : null,
        propagateGame,
        propagateFormat,
        seriesStatConfig: JSON.stringify({
          participationPoints: statParticipationPts,
          stats: statRows.filter(r => r.field.trim()),
          ...(statMvpField.trim()          && { mvpStatField:             statMvpField.trim() }),
          ...(statDefaultWinnerField.trim() && { defaultWinnerStatField:  statDefaultWinnerField.trim() }),
          ...(statDefaultTargetField.trim() && { defaultWinnerTargetField: statDefaultTargetField.trim() }),
        }),
        legacyStandings: JSON.stringify(legacyRows),
      }),
    });
    setSeriesSettingsSaving(false);
    if (res.ok) {
      toast.success("Reihen-Einstellungen gespeichert");
      setPropagateGame(false);
      setPropagateFormat(false);
      router.refresh();
    } else {
      toast.error("Fehler beim Speichern der Reihe");
    }
  }

  async function generateNextEvent() {
    if (!event.seriesId) return;
    setGeneratingNext(true);
    const res = await fetch("/api/admin/event-series/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: event.seriesId }),
    });
    setGeneratingNext(false);
    if (res.ok) {
      const { event: newEv } = await res.json();
      const dateStr = new Date(newEv.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      toast.success(`Neuer Termin erstellt: ${newEv.title} am ${dateStr}`);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Fehler beim Erstellen des nächsten Termins");
    }
  }

  async function removeUser(userId: string, name: string) {
    if (!confirm(`"${name}" wirklich aus dem Event entfernen?`)) return;
    setLoading(true);
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, removeUserId: userId }),
    });
    setLoading(false);
    toast.success(`${name} entfernt`);
    router.refresh();
  }

  async function addSingleUser(userId: string) {
    setLoading(true);
    const res = await fetch(`/api/events/${event.id}/bulk-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [userId] }),
    });
    const data = await res.json();
    if (data.added) toast.success("Teilnehmer hinzugefügt");
    else toast.info("Bereits angemeldet");
    setLoading(false);
    router.refresh();
  }

  async function bulkAdd() {
    if (!bulkSelected.length) return;
    setLoading(true);
    const res = await fetch(`/api/events/${event.id}/bulk-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: bulkSelected }),
    });
    const data = await res.json();
    toast.success(`${data.added} hinzugefügt${data.skipped ? `, ${data.skipped} bereits dabei` : ""}`);
    setBulkSelected([]);
    setLoading(false);
    router.refresh();
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "settings",     label: "Einstellungen",                            icon: <Settings className="w-3.5 h-3.5" /> },
    { key: "participants", label: `Teilnehmer (${event._count.registrations})`, icon: <Users   className="w-3.5 h-3.5" /> },
    { key: "bracket",     label: "Turnierbaum",                               icon: <Trophy   className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {showScopeModal && (
        <ScopeModal
          seriesName={event.series?.name ?? ""}
          onSingle={() => { setShowScopeModal(false); doSave("single"); }}
          onAll={()    => { setShowScopeModal(false); doSave("all");    }}
          onCancel={()  =>  setShowScopeModal(false)}
        />
      )}

      {showCompletionModal && event.seriesId && (
        <EventCompletionModal
          eventId={event.id}
          eventTitle={event.title}
          seriesId={event.seriesId}
          registeredUsers={allUsers.filter(u => registeredIds.has(u.id))}
          tournament={tournament ?? null}
          seriesStatConfig={(() => {
            const cfg = { participationPoints: statParticipationPts, stats: statRows, mvpStatField: statMvpField || undefined, defaultWinnerStatField: statDefaultWinnerField || undefined, defaultWinnerTargetField: statDefaultTargetField || undefined };
            return cfg;
          })()}
          isReEdit={!!event.completionData}
          initialData={(() => {
            try { return event.completionData ? (JSON.parse(event.completionData as string) as Record<string, unknown>) : undefined; }
            catch { return undefined; }
          })()}
          initialFinalRanking={event.finalRankingJson ? JSON.parse(event.finalRankingJson) as string[] : undefined}
          initialFinalRankingNote={event.finalRankingNote ?? undefined}
          onClose={() => setShowCompletionModal(false)}
        />
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* ── Row header ── */}
        <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-800/30" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {event.series && <Repeat className="w-3 h-3 text-teal-600 shrink-0" />}
              <p className="font-medium text-white truncate">{event.title}</p>
              {event.type === "tournament" && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(event.startAt).toLocaleDateString("de-DE")}
              {event.series && <span className="text-teal-700 ml-1.5">· {event.series.name}</span>}
              {" · "}{event._count.registrations} Anmeldungen{event.maxPlayers ? ` / ${event.maxPlayers}` : ""}
              {" · "}{event.game ?? "Kein Spiel"}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[status] ?? STATUS_STYLES.finished}`}>{status}</span>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>

        {expanded && (
          <div className="border-t border-gray-800">
            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-800 px-4">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors mr-2 ${
                    tab === t.key ? "border-rose-500 text-rose-400" : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* ── EINSTELLUNGEN ── */}
              {tab === "settings" && (
                <div className="space-y-4">

                  {/* Titel & Beschreibung */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Titel</label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Beschreibung</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Wird auch in Discord angezeigt"
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>

                  {/* Status & Punkte */}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Status</label>
                      <select value={status} onChange={e => setStatus(e.target.value)}
                        className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">🪙 Münzen bei Anmeldung</label>
                      <input type="number" value={pointReward} onChange={e => setPointReward(Number(e.target.value))}
                        className="w-28 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                    </div>
                  </div>

                  {/* ── Discord-Kanal ── */}
                  <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(88,101,242,0.05)", border: "1px solid rgba(88,101,242,0.15)" }}>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Discord-Kanal</span>
                    </div>
                    <input
                      type="text"
                      value={discordChannelId}
                      onChange={e => setDiscordChannelId(e.target.value)}
                      placeholder="Kanal-ID (leer = Standard aus .env)"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      Kanal-ID aus Discord (Rechtsklick auf Kanal → ID kopieren). Bot postet Ankündigungen,
                      Erinnerungen und Ergebnisse für dieses Event in diesen Kanal.
                      Leer lassen = globaler Standard-Kanal aus der Server-Konfiguration.
                    </p>
                  </div>

                  {/* ── Eventreihe ── */}
                  {!hideSeries && <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.12)" }}>
                    <div className="flex items-center gap-2">
                      <Repeat className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Eventreihe</span>
                      {event.series && seriesMode === "keep" && (
                        <span className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                          {event.series.name}
                        </span>
                      )}
                    </div>

                    {/* Mode buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {event.series && (
                        <button type="button" onClick={() => setSeriesMode("keep")}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={seriesMode === "keep"
                            ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                            : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                          Behalten
                        </button>
                      )}
                      <button type="button" onClick={() => setSeriesMode("none")}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={seriesMode === "none"
                          ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.30)", color: "#f87171" }
                          : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                        {event.series ? "Aus Reihe entfernen" : "Kein (Einzelevent)"}
                      </button>
                      <button type="button" onClick={() => setSeriesMode("existing")}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={seriesMode === "existing"
                          ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                          : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                        {event.series ? "Reihe wechseln" : "Zu Reihe hinzufügen"}
                      </button>
                      <button type="button" onClick={() => setSeriesMode("new")}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={seriesMode === "new"
                          ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                          : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                        Neue Reihe erstellen
                      </button>
                    </div>

                    {seriesMode === "existing" && (
                      <select value={selectedSeries} onChange={e => setSelectedSeries(e.target.value)}
                        className={inputCls}>
                        <option value="">– Reihe auswählen –</option>
                        {seriesList.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s._count.events} Events)</option>
                        ))}
                      </select>
                    )}

                    {seriesMode === "new" && (
                      <div className="space-y-2">
                        <input type="text" value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)}
                          placeholder="Name der Reihe" className={inputCls} />
                        <input type="text" value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)}
                          placeholder="Kurze Beschreibung (optional)" className={inputCls} />
                      </div>
                    )}

                    {seriesMode === "none" && event.series && (
                      <p className="text-xs text-red-400/70">
                        Das Event wird aus der Reihe „{event.series.name}" entfernt. Die Reihe selbst bleibt bestehen.
                      </p>
                    )}

                    {/* ── Reihen-Einstellungen (nur wenn in Reihe & behalten) ── */}
                    {seriesMode === "keep" && event.seriesId && (
                      <div className="border-t border-teal-500/10 pt-3 mt-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                            Reihen-Konfiguration
                          </p>
                          <Link href={`/events/series/${event.seriesId}`}
                            className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-400 transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> Reihe ansehen
                          </Link>
                        </div>

                        {/* Festes Spiel */}
                        <div>
                          <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                            <Gamepad2 className="w-3 h-3" />
                            Festes Spiel <span className="text-gray-600">(gilt für alle Events der Reihe)</span>
                          </label>
                          <GameNameInput
                            value={seriesFixedGame}
                            onChange={setSeriesFixedGame}
                            placeholder="Leer = verschiedene Spiele möglich"
                            className={inputCls}
                          />
                          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                            <input type="checkbox" checked={propagateGame}
                              onChange={e => setPropagateGame(e.target.checked)}
                              className="rounded accent-teal-500" />
                            <span className="text-[11px] text-gray-500">
                              Spiel auf alle Events der Reihe übertragen
                            </span>
                          </label>
                        </div>

                        {/* Festes Turnierformat */}
                        <div>
                          <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                            <Swords className="w-3 h-3" />
                            Festes Turnierformat
                          </label>
                          <select value={seriesFixedFormat}
                            onChange={e => setSeriesFixedFormat(e.target.value)}
                            className={inputCls}>
                            <option value="">– Kein festes Format (wechselt) –</option>
                            <option value="single_elimination">Single Elimination</option>
                            <option value="double_elimination">Double Elimination</option>
                            <option value="round_robin">Round Robin</option>
                            <option value="ffa">Free-for-All</option>
                            <option value="coop_stats">Coop / Stats</option>
                          </select>
                          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                            <input type="checkbox" checked={propagateFormat}
                              onChange={e => setPropagateFormat(e.target.checked)}
                              className="rounded accent-teal-500" />
                            <span className="text-[11px] text-gray-500">
                              Format auf alle Turniere der Reihe übertragen
                            </span>
                          </label>
                        </div>

                        {/* Discord-Kanal für die gesamte Reihe */}
                        <div>
                          <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                            <Hash className="w-3 h-3" />
                            Discord-Kanal
                            <span className="text-gray-600">(wird auf alle Events der Reihe übertragen)</span>
                          </label>
                          <input
                            type="text"
                            value={seriesDiscordChannelId}
                            onChange={e => setSeriesDiscordChannelId(e.target.value)}
                            placeholder="Kanal-ID (leer = Standard aus .env)"
                            className={inputCls}
                          />
                        </div>

                        {/* ── Wiederholung ── */}
                        <div>
                          <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                            <RefreshCw className="w-3 h-3" />
                            Wiederholungsintervall
                          </label>
                          <select
                            value={recurrenceType}
                            onChange={e => setRecurrenceType(e.target.value as typeof recurrenceType)}
                            className={inputCls}
                          >
                            <option value="">Keine Wiederholung</option>
                            <option value="weekly">Wöchentlich</option>
                            <option value="biweekly">Alle 2 Wochen</option>
                            <option value="monthly">Monatlich</option>
                          </select>

                          {recurrenceType === "monthly" && (() => {
                            const labels = describeMonthlyModes(new Date(event.startAt));
                            return (
                              <div className="mt-2 space-y-1.5">
                                <p className="text-[10px] text-gray-500">
                                  Basierend auf dem Datum dieses Events ({new Date(event.startAt).toLocaleDateString("de-DE")}):
                                </p>
                                {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setRecurrenceMonthlyMode(mode)}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                                    style={recurrenceMonthlyMode === mode
                                      ? { background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }
                                    }
                                  >
                                    {labels[mode]}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* ── Gesamttabellen-Statistiken ── */}
                        <div className="space-y-3 pt-1">
                          <label className="text-xs text-gray-500 flex items-center gap-1.5">
                            <BarChart2 className="w-3 h-3" />
                            Gesamttabellen-Konfiguration
                            <span className="text-gray-600">(Punkte aus Event-Statistiken)</span>
                          </label>

                          {/* Teilnahme-Punkte */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-32 shrink-0">Punkte pro Teilnahme</span>
                            <input
                              type="number"
                              min={0}
                              value={statParticipationPts}
                              onChange={e => setStatParticipationPts(Number(e.target.value))}
                              className={`${inputCls} w-20`}
                            />
                          </div>

                          {/* Stat-Zeilen */}
                          <div className="space-y-1.5">
                            {statRows.map((row, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  defaultValue={row.field}
                                  onBlur={e => {
                                    const v = e.target.value;
                                    setStatRows(prev => prev.map((r, j) => j === i ? { ...r, field: v } : r));
                                  }}
                                  placeholder="Stat-Name (z.B. Kills)"
                                  className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  defaultValue={row.pointsPer}
                                  onBlur={e => {
                                    const v = Number(e.target.value);
                                    setStatRows(prev => prev.map((r, j) => j === i ? { ...r, pointsPer: v } : r));
                                  }}
                                  placeholder="Pkt./Einheit"
                                  className="w-24 shrink-0 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => setStatRows(prev => prev.filter((_, j) => j !== i))}
                                  className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setStatRows(prev => [...prev, { field: "", pointsPer: 1 }])}
                              className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Statistik hinzufügen
                            </button>
                          </div>

                          {/* MVP + Gewinner-Defaults */}
                          <div className="border-t border-white/[0.05] pt-3 space-y-2">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Event-Abschluss Defaults</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-40 shrink-0">MVP-Stat-Feld</span>
                              <input
                                type="text"
                                value={statMvpField}
                                onChange={e => setStatMvpField(e.target.value)}
                                placeholder="z.B. MVP (leer = kein MVP-Tracking)"
                                className={`${inputCls} flex-1`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-40 shrink-0">Standard Gewinner-Stat</span>
                              <input
                                type="text"
                                value={statDefaultWinnerField}
                                onChange={e => setStatDefaultWinnerField(e.target.value)}
                                placeholder="z.B. Kills"
                                className={`${inputCls} flex-1`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-40 shrink-0">Standard Ziel-Stat</span>
                              <input
                                type="text"
                                value={statDefaultTargetField}
                                onChange={e => setStatDefaultTargetField(e.target.value)}
                                placeholder="z.B. Siege"
                                className={`${inputCls} flex-1`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* ── Legacy-Stand (Vorjahre / vor App-Einführung) ── */}
                        <div className="space-y-2 pt-1">
                          <label className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Trophy className="w-3 h-3" />
                            Legacy-Stand
                            <span className="text-gray-600">(historische Werte vor App-Einführung)</span>
                          </label>

                          {/* Existierende Legacy-Zeilen */}
                          {legacyRows.length > 0 && (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                              {legacyRows.map((row, i) => {
                                const u = allUsers.find(u => u.id === row.userId);
                                const name = u?.username ?? u?.name ?? row.userId.slice(0, 8);
                                return (
                                  <div key={row.userId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium text-white truncate">{name}</span>
                                      <button
                                        type="button"
                                        onClick={() => setLegacyRows(prev => prev.filter((_, j) => j !== i))}
                                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                        Teilnahmen
                                        <input
                                          type="number" min={0}
                                          value={row.participations}
                                          onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                            if (j !== i) return r;
                                            const newPart = Number(e.target.value);
                                            const calcPts = newPart * statParticipationPts
                                              + statRows.filter(sr => sr.field.trim()).reduce((sum, sr) => sum + (r.stats[sr.field] ?? 0) * sr.pointsPer, 0);
                                            return { ...r, participations: newPart, points: calcPts };
                                          }))}
                                          className="w-16 rounded px-1.5 py-0.5 text-[11px] text-white bg-gray-800 border border-gray-700"
                                        />
                                      </label>
                                      {statRows.filter(s => s.field.trim()).map(s => (
                                        <label key={s.field} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                          {s.field}
                                          <input
                                            type="number" min={0}
                                            value={row.stats[s.field] ?? 0}
                                            onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                              if (j !== i) return r;
                                              const newStats = { ...r.stats, [s.field]: Number(e.target.value) };
                                              const calcPts = r.participations * statParticipationPts
                                                + statRows.filter(sr => sr.field.trim()).reduce((sum, sr) => sum + (newStats[sr.field] ?? 0) * sr.pointsPer, 0);
                                              return { ...r, stats: newStats, points: calcPts };
                                            }))}
                                            className="w-16 rounded px-1.5 py-0.5 text-[11px] text-white bg-gray-800 border border-gray-700"
                                          />
                                        </label>
                                      ))}
                                      {/* Auto-berechnete Punkte */}
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

                          {/* User-Picker zum Hinzufügen */}
                          <div className="relative">
                            <input
                              type="text"
                              value={legacySearch}
                              onChange={e => setLegacySearch(e.target.value)}
                              placeholder="Spieler suchen und hinzufügen…"
                              className={`${inputCls} text-xs`}
                            />
                            {legacySearch.trim() && (() => {
                              const q = legacySearch.toLowerCase();
                              const filtered = allUsers.filter(u =>
                                !legacyRows.some(r => r.userId === u.id) &&
                                ((u.username ?? u.name ?? "").toLowerCase().includes(q))
                              ).slice(0, 6);
                              if (!filtered.length) return null;
                              return (
                                <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                                  {filtered.map(u => (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => {
                                        setLegacyRows(prev => [...prev, { userId: u.id, points: 0, participations: 0, stats: {} }]);
                                        setLegacySearch("");
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                                    >
                                      {u.image
                                        ? <img src={u.image} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                        : <div className="w-5 h-5 rounded-full bg-gray-700 shrink-0" />
                                      }
                                      {u.username ?? u.name}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center">
                          <button onClick={saveSeriesSettings}
                            disabled={seriesSettingsSaving || loading}
                            className="text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
                            {seriesSettingsSaving ? "Speichert…" : "Reihe speichern"}
                          </button>

                          {recurrenceType && (
                            <button
                              onClick={generateNextEvent}
                              disabled={generatingNext || loading}
                              className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white border border-teal-600/40 hover:bg-teal-600 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              {generatingNext ? "Erstellt…" : "Nächsten Termin erstellen"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>}

                  {/* Save hint für series + content change */}
                  {needsScopeDialog && (
                    <p className="text-xs text-teal-400/70 flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3" />
                      Beim Speichern wird gefragt, ob Titel/Beschreibung für die gesamte Reihe gelten sollen.
                    </p>
                  )}

                  <button onClick={handleSaveClick} disabled={loading}
                    className="text-sm bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-4 py-2 disabled:opacity-50 transition-colors">
                    {loading ? "Speichert…" : "Speichern"}
                  </button>

                  {/* ── Event abschließen / Abschluss bearbeiten ── */}
                  {event.seriesId && (
                    <div className="border border-teal-800/40 rounded-lg p-3 bg-teal-950/10">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                            {event.completionData ? "Abschluss bearbeiten" : "Event abschließen"}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {event.completionData
                              ? "MVP, Umfrage oder Endplatzierung nachträglich anpassen."
                              : "Überträgt Teilnahmen und Stats in die Gesamttabelle der Reihe."}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCompletionModal(true)}
                          disabled={loading}
                          className="flex items-center gap-1.5 text-sm text-teal-300 hover:text-white hover:bg-teal-700 border border-teal-600/50 hover:border-teal-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {event.completionData ? "Bearbeiten" : "Abschließen"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Turnier-Danger-Zone */}
                  {tournament && (
                    <div className="border border-red-900/40 rounded-lg p-3 bg-red-950/10">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            Turnier vorhanden
                            <span className="text-xs text-gray-500 font-normal">
                              · {tournament.format} · {tournament.matches.length} Matches · {tournament.participants.length} Teilnehmer
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Löscht alle Matches, Teilnehmer-Daten und den Turnierbaum. Das Event bleibt bestehen.
                          </p>
                        </div>
                        <button onClick={deleteTournament} disabled={loading}
                          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-white hover:bg-red-700 border border-red-800/50 hover:border-red-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" /> Turnier löschen
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Event-Danger-Zone */}
                  {isAdmin && (
                    <div className="border border-red-900/60 rounded-lg p-3 bg-red-950/20">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-red-300 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Event komplett löschen
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Entfernt das Event, alle {event._count.registrations} Anmeldung(en)
                            {tournament ? ", das Turnier und alle Matches" : ""} dauerhaft.
                          </p>
                        </div>
                        <button onClick={deleteEvent} disabled={loading}
                          className="flex items-center gap-1.5 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" /> Event löschen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TEILNEHMER ── */}
              {tab === "participants" && (() => {
                const registeredUsers   = filteredUsers.filter(u =>  registeredIds.has(u.id));
                const unregisteredUsers = filteredUsers.filter(u => !registeredIds.has(u.id));
                return (
                  <div className="space-y-3">
                    {/* Suche + Bulk-Aktionen */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" placeholder="User suchen…" value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-2 placeholder:text-gray-600" />
                      </div>
                      {bulkSelected.length > 0 && (
                        <button onClick={bulkAdd} disabled={loading}
                          className="flex items-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 whitespace-nowrap">
                          <UserPlus className="w-3.5 h-3.5" />
                          {bulkSelected.length} hinzufügen
                        </button>
                      )}
                    </div>

                    {/* ── Angemeldete Teilnehmer ── */}
                    {registeredUsers.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Angemeldet ({registeredUsers.length})
                        </p>
                        <div className="space-y-1">
                          {registeredUsers.map(u => (
                            <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-green-900/10 border border-green-900/25">
                              {u.image
                                ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                                : <div className="w-7 h-7 rounded-full bg-green-900/40 flex items-center justify-center text-xs font-semibold text-green-400 shrink-0">
                                    {userName(u)[0].toUpperCase()}
                                  </div>
                              }
                              <span className="flex-1 text-sm text-green-300 truncate font-medium">{userName(u)}</span>
                              <button onClick={() => removeUser(u.id, userName(u))} disabled={loading}
                                title="Abmelden"
                                className="shrink-0 text-gray-600 hover:text-red-400 hover:bg-red-900/30 p-1.5 rounded transition-colors disabled:opacity-50">
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Nicht angemeldete User ── */}
                    {unregisteredUsers.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
                            Nicht angemeldet ({unregisteredUsers.length})
                          </p>
                          <button
                            onClick={() => setBulkSelected(unregisteredUsers.map(u => u.id))}
                            className="text-[10px] text-gray-500 hover:text-white transition-colors">
                            Alle auswählen
                          </button>
                        </div>
                        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                          {unregisteredUsers.map(u => {
                            const isSel = bulkSelected.includes(u.id);
                            return (
                              <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                isSel ? "bg-rose-900/15 border border-rose-900/30" : "bg-gray-800 hover:bg-gray-800/80"
                              }`}>
                                <input type="checkbox" checked={isSel}
                                  onChange={e => setBulkSelected(
                                    e.target.checked
                                      ? [...bulkSelected, u.id]
                                      : bulkSelected.filter(id => id !== u.id)
                                  )}
                                  className="rounded shrink-0 accent-rose-500" />
                                {u.image
                                  ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                                  : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
                                      {userName(u)[0].toUpperCase()}
                                    </div>
                                }
                                <span className="flex-1 text-sm text-white truncate">{userName(u)}</span>
                                <button onClick={() => addSingleUser(u.id)} disabled={loading}
                                  title="Anmelden"
                                  className="shrink-0 text-gray-500 hover:text-rose-400 hover:bg-rose-900/30 p-1.5 rounded transition-colors disabled:opacity-50">
                                  <UserPlus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">Keine User gefunden.</p>
                    )}
                  </div>
                );
              })()}

              {/* ── TURNIERBAUM ── */}
              {tab === "bracket" && (
                <TournamentManager
                  event={{ id: event.id }}
                  tournament={tournament ?? null}
                  allUsers={allUsers.filter(u => registeredIds.has(u.id))}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
