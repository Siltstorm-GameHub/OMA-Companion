"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft, Save, Trophy, CheckCircle2, AlertTriangle, Trash2,
  Search, UserPlus, UserMinus, Repeat, ExternalLink, AlertCircle,
  Coins, Star, MessageSquare,
} from "lucide-react";
import GameNameInput from "@/components/GameNameInput";

/* ── Types ── */
type User = { id: string; name: string | null; username: string | null; image: string | null };
type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig   = { participationCoins: number; placements: PlacementReward[] };
type PollConfig      = { enabled: boolean; question: string; coins: number; rankPoints: number };

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
const DEFAULT_POLL: PollConfig = { enabled: false, question: "MVP", coins: 250, rankPoints: 3 };

const STATUS_OPTIONS = ["open", "active", "umfrage", "finished"];
const STATUS_STYLES: Record<string, string> = {
  open:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  umfrage:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  finished: "text-gray-500 bg-white/[0.03] border-white/[0.06]",
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const numCls   = "w-24 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
function parsePoll(json: string | null | undefined): PollConfig {
  if (!json) return DEFAULT_POLL;
  try { return { ...DEFAULT_POLL, ...JSON.parse(json) }; } catch { return DEFAULT_POLL; }
}
function toDatetimeLocal(d: Date | string) {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EventEditClient({ event, allUsers }: { event: any; allUsers: User[] }) {
  const router        = useRouter();
  const { data: session } = useSession();
  const isAdmin       = session?.user?.role === "admin";
  const [loading, setLoading] = useState(false);

  /* ── Event settings state ── */
  const [status, setStatus]           = useState<string>(event.status);
  const [title, setTitle]             = useState<string>(event.title);
  const [description, setDescription] = useState<string>(event.description ?? "");
  const [game, setGame]               = useState<string>(event.game ?? "");
  const [startAt, setStartAt]         = useState<string>(toDatetimeLocal(event.startAt));
  const [maxPlayers, setMaxPlayers]   = useState<string>(event.maxPlayers?.toString() ?? "");
  const [discordChannelId, setDiscordChannelId] = useState<string>(event.discordChannelId ?? "");

  /* ── Rewards state ── */
  const initialRewards = parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson);
  const [participationCoins, setParticipationCoins] = useState<number>(
    event.placementRewardsJson ? parseRewards(event.placementRewardsJson).participationCoins : (event.pointReward ?? initialRewards.participationCoins)
  );
  const [placements, setPlacements] = useState<PlacementReward[]>(initialRewards.placements);
  const [poll, setPoll] = useState<PollConfig>(parsePoll(event.pollConfigJson ?? event.series?.pollConfigJson));

  /* ── Series propagation ── */
  const [propagateTitleDesc, setPropagateTitleDesc] = useState(false);
  const titleDescChanged = title !== event.title || description !== (event.description ?? "");

  /* ── Participants state ── */
  const [search, setSearch]           = useState("");
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const registeredIds = new Set(event.registrations.map((r: { userId: string }) => r.userId));

  const userName = (u: User) => u.username ?? u.name ?? "?";

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(u => userName(u).toLowerCase().includes(q));
  }, [allUsers, search]);

  /* ── Series comparison helpers ── */
  const seriesGame   = event.series?.fixedGame;
  const seriesDiscord = event.series?.discordChannelId;

  function updatePlacement(place: number, key: keyof PlacementReward, value: number) {
    setPlacements(prev => prev.map(p => p.place === place ? { ...p, [key]: value } : p));
  }

  /* ── Save handler ── */
  async function handleSave() {
    setLoading(true);
    const scope = (event.series && titleDescChanged && propagateTitleDesc) ? "all" : "single";
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        status,
        title,
        description: description || null,
        game: game.trim() || null,
        startAt: new Date(startAt).toISOString(),
        maxPlayers: maxPlayers ? Number(maxPlayers) : null,
        pointReward: participationCoins,
        discordChannelId: discordChannelId.trim() || null,
        placementRewardsJson: JSON.stringify({ participationCoins, placements }),
        pollConfigJson: JSON.stringify(poll),
        seriesScope: scope,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(scope === "all" ? "Für gesamte Reihe gespeichert" : "Event gespeichert");
      setPropagateTitleDesc(false);
      router.refresh();
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  /* ── Participant actions ── */
  async function removeUser(userId: string, name: string) {
    if (!confirm(`"${name}" wirklich entfernen?`)) return;
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
    toast.success(data.added ? "Teilnehmer hinzugefügt" : "Bereits angemeldet");
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

  async function deleteEvent() {
    if (!confirm(`Event "${event.title}" unwiderruflich löschen?\n\nDies entfernt ${event._count.registrations} Anmeldung(en)${event.format ? " und das Turnier" : ""}.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/events?eventId=${event.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      toast.success(`"${event.title}" wurde gelöscht`);
      router.push(event.series ? `/admin/series/${event.series.id}` : "/admin/events");
    } else {
      toast.error("Fehler beim Löschen");
    }
  }

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* Breadcrumb + action buttons */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {event.series ? (
            <Link href={`/admin/series/${event.series.id}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <Repeat className="w-3.5 h-3.5 text-teal-500" />
              {event.series.name}
            </Link>
          ) : (
            <Link href="/admin/events" className="flex items-center gap-1 hover:text-gray-300 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Standalone Events
            </Link>
          )}
          <span>/</span>
          <span className="text-gray-300 truncate max-w-[200px]">{event.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Link
            href={`/events/${event.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/[0.08] hover:border-white/20 rounded-lg px-3 py-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Öffentlich
          </Link>
          {event.format && (
            <Link
              href={`/admin/events/${event.id}/bracket`}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg px-3 py-1.5 transition-all"
            >
              <Trophy className="w-3.5 h-3.5" /> Turnierbaum
            </Link>
          )}
          <Link
            href={`/admin/events/${event.id}/complete`}
            className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white bg-teal-700/30 hover:bg-teal-700 border border-teal-600/40 hover:border-teal-600 rounded-lg px-3 py-1.5 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {event.completionData ? "Abschluss bearbeiten" : "Event abschließen"}
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── Left: Settings ── */}
        <div className="space-y-4">

          {/* Status */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 shrink-0">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    status === s
                      ? STATUS_STYLES[s]
                      : "text-gray-600 border-white/[0.08] hover:text-gray-400"
                  }`}>
                  {s === "open" ? "Offen" : s === "active" ? "Aktiv" : s === "umfrage" ? "Umfrage" : "Beendet"}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titel</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Beschreibung</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Wird auch in Discord angezeigt"
              className={`${inputCls} resize-none`} />
          </div>

          {/* Series propagation checkbox */}
          {event.series && titleDescChanged && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={propagateTitleDesc} onChange={e => setPropagateTitleDesc(e.target.checked)}
                className="rounded accent-teal-500" />
              <span className="text-teal-400 text-xs flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                Titel & Beschreibung auf alle Events von „{event.series.name}" anwenden
              </span>
            </label>
          )}

          {/* Game */}
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center justify-between">
              <span>Spiel</span>
              {seriesGame && game && seriesGame !== game && (
                <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                  <AlertCircle className="w-3 h-3" /> Abweichend von Reihe ({seriesGame})
                </span>
              )}
            </label>
            <GameNameInput value={game} onChange={setGame} placeholder="z.B. Valorant" className={inputCls} />
          </div>

          {/* Date + MaxPlayers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Datum & Uhrzeit</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max. Spieler</label>
              <input type="number" min={2} value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
                placeholder="unbegrenzt" className={inputCls} />
            </div>
          </div>

          {/* Discord channel */}
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center justify-between">
              <span>Discord-Kanal ID</span>
              {seriesDiscord && discordChannelId && seriesDiscord !== discordChannelId && (
                <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                  <AlertCircle className="w-3 h-3" /> Abweichend von Reihe
                </span>
              )}
            </label>
            <input type="text" value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
              placeholder="Leer = Standard" className={inputCls} />
          </div>

          {/* Belohnungen */}
          <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Belohnungen</h3>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs text-gray-500 px-1">
                <span>Platzierung</span>
                <span className="flex items-center gap-1 justify-center"><Star className="w-3 h-3 text-purple-400" /> Punkte</span>
                <span className="flex items-center gap-1 justify-center"><Coins className="w-3 h-3 text-amber-400" /> Münzen</span>
              </div>
              {placements.map(p => (
                <div key={p.place} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <span className="text-sm text-gray-300">
                    {p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : "🥉"} {p.place}. Platz
                  </span>
                  <input type="number" min={0} value={p.rankPoints}
                    onChange={e => updatePlacement(p.place, "rankPoints", Number(e.target.value))}
                    className={numCls} />
                  <input type="number" min={0} value={p.coins}
                    onChange={e => updatePlacement(p.place, "coins", Number(e.target.value))}
                    className={numCls} />
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center pt-1 border-t border-white/[0.05]">
                <span className="text-sm text-gray-400">Teilnahme</span>
                <div />
                <input type="number" min={0} value={participationCoins}
                  onChange={e => setParticipationCoins(Number(e.target.value))}
                  className={numCls} />
              </div>
            </div>
          </div>

          {/* Poll */}
          <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Poll</h3>
            </div>
            <div className="px-4 py-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={poll.enabled} onChange={e => setPoll(p => ({ ...p, enabled: e.target.checked }))}
                  className="rounded accent-teal-500" />
                <span className="text-sm text-gray-300">Poll nach Event aktivieren</span>
              </label>
              {poll.enabled && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Was wird gewählt</label>
                    <input type="text" value={poll.question} onChange={e => setPoll(p => ({ ...p, question: e.target.value }))}
                      placeholder="z.B. MVP, Trostpreis, …" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Star className="w-3 h-3 text-purple-400" /> Punkte</label>
                      <input type="number" min={0} value={poll.rankPoints}
                        onChange={e => setPoll(p => ({ ...p, rankPoints: Number(e.target.value) }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Münzen</label>
                      <input type="number" min={0} value={poll.coins}
                        onChange={e => setPoll(p => ({ ...p, coins: Number(e.target.value) }))} className={inputCls} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {loading ? "Speichert…" : "Speichern"}
          </button>

          {/* Danger zone */}
          {isAdmin && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/10 p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Event löschen
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Entfernt {event._count.registrations} Anmeldung(en){event.format ? " und das Turnier" : ""} dauerhaft.
                  </p>
                </div>
                <button onClick={deleteEvent} disabled={loading}
                  className="flex items-center gap-1.5 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Participants ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Teilnehmer ({event._count.registrations}{event.maxPlayers ? `/${event.maxPlayers}` : ""})
            </h2>
            {bulkSelected.length > 0 && (
              <button onClick={bulkAdd} disabled={loading}
                className="flex items-center gap-1.5 text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
                <UserPlus className="w-3.5 h-3.5" /> {bulkSelected.length} hinzufügen
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Spieler suchen…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2 placeholder:text-gray-600" />
          </div>

          {/* Registered */}
          {filteredUsers.filter(u => registeredIds.has(u.id)).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-1.5">
                Angemeldet ({filteredUsers.filter(u => registeredIds.has(u.id)).length})
              </p>
              <div className="space-y-1">
                {filteredUsers.filter(u => registeredIds.has(u.id)).map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-900/10 border border-emerald-900/20">
                    {u.image
                      ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-emerald-900/40 flex items-center justify-center text-xs font-semibold text-emerald-400 shrink-0">{userName(u)[0].toUpperCase()}</div>
                    }
                    <span className="flex-1 text-sm text-emerald-300 truncate font-medium">{userName(u)}</span>
                    <button onClick={() => removeUser(u.id, userName(u))} disabled={loading}
                      className="shrink-0 text-gray-600 hover:text-red-400 p-1.5 rounded transition-colors disabled:opacity-50">
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not registered */}
          {filteredUsers.filter(u => !registeredIds.has(u.id)).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  Nicht angemeldet ({filteredUsers.filter(u => !registeredIds.has(u.id)).length})
                </p>
                <button onClick={() => setBulkSelected(filteredUsers.filter(u => !registeredIds.has(u.id)).map(u => u.id))}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors">
                  Alle auswählen
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredUsers.filter(u => !registeredIds.has(u.id)).map(u => {
                  const isSel = bulkSelected.includes(u.id);
                  return (
                    <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isSel ? "bg-teal-900/20 border border-teal-800/30" : "bg-gray-800 hover:bg-gray-700/50 border border-transparent"
                    }`}>
                      <input type="checkbox" checked={isSel}
                        onChange={e => setBulkSelected(e.target.checked ? [...bulkSelected, u.id] : bulkSelected.filter(id => id !== u.id))}
                        className="rounded accent-teal-500 shrink-0" />
                      {u.image
                        ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">{userName(u)[0].toUpperCase()}</div>
                      }
                      <span className="flex-1 text-sm text-white truncate">{userName(u)}</span>
                      <button onClick={() => addSingleUser(u.id)} disabled={loading}
                        className="shrink-0 text-gray-500 hover:text-teal-400 p-1.5 rounded transition-colors disabled:opacity-50">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredUsers.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-6">Keine Spieler gefunden.</p>
          )}
        </div>
      </div>
    </div>
  );
}
