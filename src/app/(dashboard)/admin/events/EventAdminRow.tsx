"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Trophy, Settings, Users, UserPlus, UserMinus,
  Search, Trash2, AlertTriangle, Repeat, X, GitBranch,
} from "lucide-react";
import TournamentManager from "./TournamentManager";

/* ── Types ───────────────────────────────────────────────────────────────── */
type User = { id: string; name: string | null; username: string | null; image: string | null };
type MatchEntry = { id: string; userId: string | null; teamId: string | null; placement: number | null; score: number | null; statsJson: string | null };
type Match = { id: string; round: number; position: number; title: string | null; scheduledAt: string | Date | null; notes: string | null; player1Id: string | null; player2Id: string | null; winnerId: string | null; score1: number | null; score2: number | null; playedAt: string | Date | null; entries: MatchEntry[] };
type Participant = { userId: string; seed: number | null; eliminated: boolean; user: User };
type Registration = { userId: string };
type Tournament = { id: string; status: string; format: string; pointsConfig: string | null; statFields: string | null; participants: Participant[]; matches: Match[] };
type Series = { id: string; name: string; _count: { events: number } };
type Event = {
  id: string; title: string; description: string | null; status: string; game: string | null;
  startAt: Date; maxPlayers: number | null; pointReward: number; type: string;
  seriesId?: string | null;
  series?: { id: string; name: string } | null;
  _count: { registrations: number };
  registrations: Registration[];
  tournament: Tournament | null;
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
export default function EventAdminRow({ event, allUsers }: { event: Event; allUsers: User[] }) {
  const [expanded, setExpanded]   = useState(false);
  const [tab, setTab]             = useState<Tab>("settings");
  const router                    = useRouter();
  const { data: session }         = useSession();
  const isAdmin                   = session?.user?.role === "admin";

  /* ── Settings state ── */
  const [status, setStatus]           = useState(event.status);
  const [pointReward, setPointReward] = useState(event.pointReward);
  const [title, setTitle]             = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [loading, setLoading]         = useState(false);

  /* ── Series state ── */
  const [seriesMode, setSeriesMode]         = useState<"keep" | "none" | "existing" | "new">("keep");
  const [seriesList, setSeriesList]         = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState(event.seriesId ?? "");
  const [newSeriesName, setNewSeriesName]   = useState("");
  const [newSeriesDesc, setNewSeriesDesc]   = useState("");
  const [seriesLoaded, setSeriesLoaded]     = useState(false);

  /* ── Scope modal ── */
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [pendingSave, setPendingSave]       = useState<"single" | null>(null);

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

  const registeredIds = new Set(event.registrations.map(r => r.userId));
  const userName      = (u: User) => u.username ?? u.name ?? "?";

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
        eventId:     event.id,
        status,
        pointReward,
        title,
        description: description || null,
        seriesScope: scope,
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
    await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
    setLoading(false);
    toast.success("Turnier gelöscht");
    router.refresh();
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

  const tournament = event.tournament;

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

                  {/* ── Eventreihe ── */}
                  <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.12)" }}>
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
                  </div>

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
              {tab === "participants" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" placeholder="User suchen…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-2 placeholder:text-gray-600" />
                    </div>
                    <button onClick={() => setBulkSelected(filteredUsers.filter(u => !registeredIds.has(u.id)).map(u => u.id))}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded border border-gray-700 hover:border-gray-500 whitespace-nowrap">
                      Alle auswählen
                    </button>
                    <button onClick={bulkAdd} disabled={loading || !bulkSelected.length}
                      className="flex items-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 whitespace-nowrap">
                      <UserPlus className="w-3.5 h-3.5" />
                      {bulkSelected.length > 0 ? `${bulkSelected.length} hinzufügen` : "Hinzufügen"}
                    </button>
                  </div>

                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">Keine User gefunden.</p>
                    )}
                    {filteredUsers.map(u => {
                      const isReg = registeredIds.has(u.id);
                      const isSel = bulkSelected.includes(u.id);
                      return (
                        <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isReg ? "bg-green-900/10 border border-green-900/30" : "bg-gray-800 hover:bg-gray-750"
                        }`}>
                          {!isReg && (
                            <input type="checkbox" checked={isSel}
                              onChange={e => setBulkSelected(
                                e.target.checked ? [...bulkSelected, u.id] : bulkSelected.filter(id => id !== u.id)
                              )}
                              className="rounded shrink-0" />
                          )}
                          {isReg && <span className="text-green-500 shrink-0">✓</span>}
                          {u.image
                            ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                            : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
                                {userName(u)[0].toUpperCase()}
                              </div>
                          }
                          <span className={`flex-1 text-sm truncate ${isReg ? "text-green-400" : "text-white"}`}>
                            {userName(u)}
                            {isReg && <span className="text-xs text-green-700 ml-2">angemeldet</span>}
                          </span>
                          {!isReg
                            ? <button onClick={() => addSingleUser(u.id)} disabled={loading} title="Hinzufügen"
                                className="shrink-0 text-xs text-gray-500 hover:text-rose-400 hover:bg-rose-900/30 px-2 py-1 rounded transition-colors disabled:opacity-50">
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                            : <button onClick={() => removeUser(u.id, userName(u))} disabled={loading} title="Entfernen"
                                className="shrink-0 text-xs text-gray-600 hover:text-red-400 hover:bg-red-900/30 px-2 py-1 rounded transition-colors disabled:opacity-50">
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
