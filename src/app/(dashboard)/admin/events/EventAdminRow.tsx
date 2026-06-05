"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trophy, Settings, Users, UserPlus, Search, Trash2, AlertTriangle } from "lucide-react";
import TournamentManager from "./TournamentManager";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type MatchEntry = { id: string; userId: string | null; teamId: string | null; placement: number | null; score: number | null; statsJson: string | null };
type Match = { id: string; round: number; position: number; title: string | null; scheduledAt: string | Date | null; notes: string | null; player1Id: string | null; player2Id: string | null; winnerId: string | null; score1: number | null; score2: number | null; playedAt: string | Date | null; entries: MatchEntry[] };
type Participant = { userId: string; seed: number | null; eliminated: boolean; user: User };
type Registration = { userId: string };
type Tournament = { id: string; status: string; format: string; pointsConfig: string | null; statFields: string | null; participants: Participant[]; matches: Match[] };
type Event = {
  id: string; title: string; status: string; game: string | null;
  startAt: Date; maxPlayers: number | null; pointReward: number; type: string;
  _count: { registrations: number };
  registrations: Registration[];
  tournament: Tournament | null;
};

const STATUS_OPTIONS = ["open", "active", "closed", "finished"];
const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-900/50 text-blue-300", active: "bg-green-900/50 text-green-300",
  closed: "bg-amber-900/50 text-amber-300", finished: "bg-gray-800 text-gray-500",
};
type Tab = "settings" | "participants" | "bracket";

export default function EventAdminRow({ event, allUsers }: { event: Event; allUsers: User[] }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("settings");
  const [status, setStatus] = useState(event.status);
  const [pointReward, setPointReward] = useState(event.pointReward);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const registeredIds = new Set(event.registrations.map((r) => r.userId));
  const userName = (u: User) => u.username ?? u.name ?? "?";

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter((u) => userName(u).toLowerCase().includes(q));
  }, [allUsers, search]);

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

  async function saveEventSettings() {
    setLoading(true);
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, status, pointReward }),
    });
    setLoading(false);
    if (res.ok) toast.success("Event-Einstellungen gespeichert");
    else toast.error("Fehler beim Speichern");
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
    { key: "settings",     label: "Einstellungen",                      icon: <Settings className="w-3.5 h-3.5" /> },
    { key: "participants", label: `Teilnehmer (${event._count.registrations})`, icon: <Users className="w-3.5 h-3.5" /> },
    { key: "bracket",      label: "Turnierbaum",                        icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-800/30" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">{event.title}</p>
            {event.type === "tournament" && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(event.startAt).toLocaleDateString("de-DE")} · {event._count.registrations} Anmeldungen{event.maxPlayers ? ` / ${event.maxPlayers}` : ""} · {event.game ?? "Kein Spiel"}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[status] ?? STATUS_STYLES.finished}`}>{status}</span>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>

      {expanded && (
        <div className="border-t border-gray-800">
          <div className="flex border-b border-gray-800 px-4">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors mr-2 ${
                  tab === t.key ? "border-rose-500 text-rose-400" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* EINSTELLUNGEN */}
            {tab === "settings" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}
                      className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">🪙 Münzen bei Anmeldung</label>
                    <input type="number" value={pointReward} onChange={(e) => setPointReward(Number(e.target.value))}
                      className="w-28 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                    <p className="text-[10px] text-gray-600 mt-1">Nur Münzen — keine Punkte</p>
                  </div>
                  <button onClick={saveEventSettings} disabled={loading}
                    className="text-sm bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                    Speichern
                  </button>
                </div>

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
                      <button
                        onClick={deleteTournament}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-sm text-red-400 hover:text-white hover:bg-red-700 border border-red-800/50 hover:border-red-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Turnier löschen
                      </button>
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="border border-red-900/60 rounded-lg p-3 bg-red-950/20">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-red-300 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Event komplett löschen
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Entfernt das Event, alle {event._count.registrations} Anmeldung(en){tournament ? ", das Turnier und alle Matches" : ""} dauerhaft.
                          Nur für Admins sichtbar.
                        </p>
                      </div>
                      <button
                        onClick={deleteEvent}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Event löschen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEILNEHMER */}
            {tab === "participants" && (
              <div>
                {/* Toolbar */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="relative flex-1 min-w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="User suchen..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-2 placeholder:text-gray-600"
                    />
                  </div>
                  <button
                    onClick={() => setBulkSelected(filteredUsers.filter((u) => !registeredIds.has(u.id)).map((u) => u.id))}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded border border-gray-700 hover:border-gray-500 whitespace-nowrap"
                  >
                    Alle auswählen
                  </button>
                  <button
                    onClick={bulkAdd}
                    disabled={loading || !bulkSelected.length}
                    className="flex items-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {bulkSelected.length > 0 ? `${bulkSelected.length} hinzufügen` : "Hinzufügen"}
                  </button>
                </div>

                {/* User-Liste */}
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Keine User gefunden.</p>
                  )}
                  {filteredUsers.map((u) => {
                    const isReg = registeredIds.has(u.id);
                    const isSel = bulkSelected.includes(u.id);
                    return (
                      <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isReg ? "bg-green-900/10 border border-green-900/30" : "bg-gray-800 hover:bg-gray-750"
                      }`}>
                        {/* Checkbox für Bulk */}
                        {!isReg && (
                          <input type="checkbox" checked={isSel}
                            onChange={(e) => setBulkSelected(
                              e.target.checked ? [...bulkSelected, u.id] : bulkSelected.filter((id) => id !== u.id)
                            )}
                            className="rounded shrink-0" />
                        )}
                        {isReg && <span className="text-green-500 shrink-0">✓</span>}

                        {/* Avatar */}
                        {u.image ? (
                          <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
                            {userName(u)[0].toUpperCase()}
                          </div>
                        )}

                        {/* Name */}
                        <span className={`flex-1 text-sm truncate ${isReg ? "text-green-400" : "text-white"}`}>
                          {userName(u)}
                          {isReg && <span className="text-xs text-green-700 ml-2">angemeldet</span>}
                        </span>

                        {/* Einzeln hinzufügen */}
                        {!isReg && (
                          <button
                            onClick={() => addSingleUser(u.id)}
                            disabled={loading}
                            className="shrink-0 text-xs text-gray-500 hover:text-rose-400 hover:bg-rose-900/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TURNIERBAUM */}
            {tab === "bracket" && (
              <TournamentManager
                event={{ id: event.id }}
                tournament={tournament ?? null}
                allUsers={allUsers}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
