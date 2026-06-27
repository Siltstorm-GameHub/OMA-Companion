"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft, Save, Trophy, CheckCircle2, AlertTriangle, Trash2,
  Search, UserPlus, UserMinus, Repeat, ExternalLink, AlertCircle, Plus, Tv2,
} from "lucide-react";
import { EventCategory, EventGenre } from "@prisma/client";
import GameNameInput from "@/components/GameNameInput";
import StatFieldEditor from "@/components/StatFieldEditor";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import EventCategoryBadge from "@/components/EventCategoryBadge";

/* ── Types ── */
type User = { id: string; name: string | null; username: string | null; image: string | null };
type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig   = { participationCoins: number; placements: PlacementReward[] };
type PollConfig      = { label: string; question: string; coins: number; rankPoints: number; type: "player" | "spectator" };

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};

const TMT_FORMATS = [
  { value: "single_elimination", label: "Einzel-Eliminierung", desc: "Klassisches K.O.-System" },
  { value: "round_robin",        label: "Jeder gegen Jeden",   desc: "Alle spielen gegen alle" },
  { value: "liga",               label: "Liga",                desc: "Spieltage, Tabelle S/U/N" },
  { value: "ffa",                label: "Free for All",        desc: "Alle gegeneinander" },
  { value: "coop_stats",         label: "Kooperativ (Stats)",  desc: "Individuelle Stats" },
  { value: "avg_stats",          label: "Durchschnittswerte",  desc: "Bester Schnitt gewinnt" },
] as const;

const GENRES: { value: EventGenre; label: string; icon: string }[] = [
  { value: "arcade",    label: "Arcade",     icon: "/Arcade Icon.png" },
  { value: "beat_em_up",label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  { value: "sport",     label: "Sport",      icon: "/Sport Icon.png" },
  { value: "racing",    label: "Racing",     icon: "/Racing Icon.png" },
  { value: "shooter",   label: "Shooter",    icon: "/Shooter Icon.png" },
  { value: "community", label: "Community",  icon: "/Community Icon.png" },
];

const CATEGORIES: { value: EventCategory; label: string; emoji: string }[] = [
  { value: "competitive",     label: "Kompetitiv", emoji: "🏆" },
  { value: "fun",             label: "Fun",        emoji: "🎉" },
  { value: "casual",          label: "Casual",     emoji: "🛋️" },
  { value: "training",        label: "Training",   emoji: "🎓" },
  { value: "community_event", label: "Community",  emoji: "🤝" },
  { value: "special",         label: "Special",    emoji: "⭐" },
];

function parseTmtConfig(pc: string | null) {
  const d = { coins1: 200, coins2: 100, coins3: 50, pts1: 100, pts2: 50, pts3: 25, win: 30, draw: 10 };
  if (!pc) return d;
  try {
    const p = JSON.parse(pc) as Record<string, number | { coins?: number; points?: number }>;
    const c = (v: number | { coins?: number; points?: number } | undefined, fb: number) =>
      v == null ? fb : typeof v === "number" ? v : (v.coins ?? fb);
    const r = (v: number | { coins?: number; points?: number } | undefined, fb: number) =>
      v == null ? fb : typeof v === "number" ? v : (v.points ?? v.coins ?? fb);
    return { coins1: c(p["1"],200), coins2: c(p["2"],100), coins3: c(p["3"],50),
             pts1: r(p["1"],100), pts2: r(p["2"],50), pts3: r(p["3"],25),
             win: c(p["win"],30), draw: c(p["draw"],10) };
  } catch { return d; }
}

const STATUS_OPTIONS = ["open", "active", "umfrage", "finished"];
const STATUS_STYLES: Record<string, string> = {
  open:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  umfrage:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  finished: "text-gray-500 bg-white/[0.03] border-white/[0.06]",
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const numCls   = "w-24 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const labelCls = "text-xs text-gray-500 mb-1 block";

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
function parsePolls(json: string | null | undefined): PollConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as PollConfig[];
    // legacy single-poll format
    if (parsed.enabled) return [{ label: parsed.question ?? "MVP", question: parsed.question ?? "", coins: parsed.coins ?? 250, rankPoints: parsed.rankPoints ?? 3, type: "player" }];
    return [];
  } catch { return []; }
}
function parseSpectatorReward(json: string | null | undefined) {
  if (!json) return { coins: 5, rankPoints: 0 };
  try { return JSON.parse(json) as { coins: number; rankPoints: number }; }
  catch { return { coins: 5, rankPoints: 0 }; }
}
function toDatetimeLocal(d: Date | string) {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

type TabKey = "details" | "rewards" | "tournament" | "participants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EventEditClient({ event, allUsers }: { event: any; allUsers: User[] }) {
  const router        = useRouter();
  const { data: session } = useSession();
  const isAdmin       = session?.user?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  /* ── Details state ── */
  const [status, setStatus]           = useState<string>(event.status);
  const [title, setTitle]             = useState<string>(event.title);
  const [description, setDescription] = useState<string>(event.description ?? "");
  const [game, setGame]               = useState<string>(event.game ?? "");
  const [genre, setGenre]             = useState<EventGenre | null>(event.genre ?? null);
  const [category, setCategory]       = useState<EventCategory>(event.category ?? "casual");
  const [startAt, setStartAt]         = useState<string>(toDatetimeLocal(event.startAt));
  const [maxPlayers, setMaxPlayers]   = useState<string>(event.maxPlayers?.toString() ?? "");
  const [discordChannelId, setDiscordChannelId] = useState<string>(event.discordChannelId ?? "");
  const [propagateTitleDesc, setPropagateTitleDesc] = useState(false);
  const titleDescChanged = title !== event.title || description !== (event.description ?? "");

  /* ── Rewards state ── */
  const initialRewards = parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson);
  const [participationCoins, setParticipationCoins] = useState<number>(
    event.placementRewardsJson ? parseRewards(event.placementRewardsJson).participationCoins : (event.pointReward ?? initialRewards.participationCoins)
  );
  const [placements, setPlacements] = useState<PlacementReward[]>(initialRewards.placements);
  const [polls, setPolls] = useState<PollConfig[]>(parsePolls(event.pollsConfigJson ?? event.pollConfigJson));
  const initialSpectatorReward = parseSpectatorReward(event.spectatorRewardJson);
  const [spectatorCoins, setSpectatorCoins] = useState(initialSpectatorReward.coins);
  const [spectatorRankPts, setSpectatorRankPts] = useState(initialSpectatorReward.rankPoints);

  /* ── Tournament state ── */
  const [tmtFormat, setTmtFormat]       = useState<string>(event.format ?? "single_elimination");
  const [tmtPoints, setTmtPoints]       = useState(() => parseTmtConfig(event.pointsConfig));
  const [tmtStatFields, setTmtStatFields] = useState<string[]>(() => {
    if (!event.statFields) return ["Kills", "Assists", "Punkte"];
    try { return JSON.parse(event.statFields) as string[]; } catch { return []; }
  });
  const [tmtLoading, setTmtLoading] = useState(false);
  const hasTournament = !!event.format;
  const hasStat       = ["ffa", "coop_stats", "avg_stats"].includes(tmtFormat);
  const isLiga        = tmtFormat === "liga";

    /* ── Partners state ── */
  const [allPartners, setAllPartners] = useState<{ id: string; name: string; twitchLogin: string; logoUrl: string }[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>(
    (event.streamingPartners ?? []).map((ep: { partnerId: string }) => ep.partnerId)
  );
  const [partnersLoaded, setPartnersLoaded] = useState(false);
  const [partnerSaving, setPartnerSaving] = useState(false);

  /* ── Participants state ── */
  const [search, setSearch]             = useState("");
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const registeredIds  = new Set(event.registrations.filter((r: { role: string }) => r.role !== "spectator").map((r: { userId: string }) => r.userId));
  const spectatorIds   = new Set(event.registrations.filter((r: { role: string }) => r.role === "spectator").map((r: { userId: string }) => r.userId));
  const userName = (u: User) => u.username ?? u.name ?? "?";
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(u => userName(u).toLowerCase().includes(q));
  }, [allUsers, search]);

  const seriesGame    = event.series?.fixedGame;
  const seriesDiscord = event.series?.discordChannelId;

  async function loadPartners() {
    if (partnersLoaded) return;
    const res = await fetch("/api/partners");
    if (res.ok) { setAllPartners(await res.json()); }
    setPartnersLoaded(true);
  }

  async function savePartners() {
    setPartnerSaving(true);
    const res = await fetch(`/api/admin/events/${event.id}/partners`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerIds: selectedPartnerIds }),
    });
    setPartnerSaving(false);
    if (res.ok) toast.success("Streaming-Partner gespeichert");
    else toast.error("Fehler beim Speichern");
  }

  function updatePlacement(place: number, key: keyof PlacementReward, value: number) {
    setPlacements(prev => prev.map(p => p.place === place ? { ...p, [key]: value } : p));
  }
  function addPoll() {
    if (polls.length >= 3) return;
    setPolls(p => [...p, { label: "", question: "", coins: 50, rankPoints: 0, type: "player" }]);
  }
  function updatePoll(i: number, patch: Partial<PollConfig>) {
    setPolls(p => p.map((poll, idx) => idx === i ? { ...poll, ...patch } : poll));
  }
  function removePoll(i: number) {
    setPolls(p => p.filter((_, idx) => idx !== i));
  }

  /* ── Save handlers ── */
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
        genre: genre || null,
        category,
        startAt: new Date(startAt).toISOString(),
        maxPlayers: maxPlayers ? Number(maxPlayers) : null,
        discordChannelId: discordChannelId.trim() || null,
        placementRewardsJson: JSON.stringify({ participationCoins, placements }),
        pollsConfigJson: polls.length > 0 ? polls : null,
        spectatorRewardJson: event.spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
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

  async function saveTmtSettings() {
    setTmtLoading(true);
    const config = isLiga
      ? { win: tmtPoints.win, draw: tmtPoints.draw }
      : { "1": { coins: tmtPoints.coins1, points: tmtPoints.pts1 },
          "2": { coins: tmtPoints.coins2, points: tmtPoints.pts2 },
          "3": { coins: tmtPoints.coins3, points: tmtPoints.pts3 } };
    if (!hasTournament) {
      const res = await fetch("/api/tournaments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, format: tmtFormat, pointsConfig: config,
          statFields: hasStat ? tmtStatFields : null }),
      });
      if (res.ok) { toast.success("Turnier erstellt"); router.refresh(); }
      else { const e = await res.json(); toast.error(e.error ?? "Fehler"); }
    } else {
      const res = await fetch(`/api/tournaments/${event.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: tmtFormat, pointsConfig: config,
          statFields: hasStat ? tmtStatFields : null }),
      });
      if (res.ok) { toast.success("Turnier-Einstellungen gespeichert"); router.refresh(); }
      else { toast.error("Fehler beim Speichern"); }
    }
    setTmtLoading(false);
  }

  async function removeUser(userId: string, name: string, role: "player" | "spectator" = "player") {
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

  async function addSingleUser(userId: string, role: "player" | "spectator" = "player") {
    setLoading(true);
    const res = await fetch(`/api/events/${event.id}/bulk-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [userId], role }),
    });
    const data = await res.json();
    toast.success(data.added ? `${role === "spectator" ? "Zuschauer" : "Teilnehmer"} hinzugefügt` : "Bereits angemeldet");
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

  /* ── Tab definitions ── */
  const tabs: { key: TabKey; label: string }[] = [
    { key: "details",     label: "Details" },
    { key: "rewards",     label: "Belohnungen" },
    ...(hasTournament || event.type === "tournament" ? [{ key: "tournament" as TabKey, label: "Turnier" }] : []),
    { key: "participants", label: `Teilnehmer (${event._count.registrations})` },
  ];

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
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
              <ChevronLeft className="w-4 h-4" /> Events
            </Link>
          )}
          <span>/</span>
          <span className="text-gray-300 truncate max-w-[200px]">{event.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <EventCategoryBadge category={event.category ?? "casual"} />
          <Link href={`/events/${event.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/[0.08] hover:border-white/20 rounded-lg px-3 py-1.5 transition-all">
            <ExternalLink className="w-3.5 h-3.5" /> Öffentlich
          </Link>
          {event.format && (
            <Link href={`/admin/events/${event.id}/bracket`}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg px-3 py-1.5 transition-all">
              <Trophy className="w-3.5 h-3.5" /> Turnierbaum
            </Link>
          )}
        </div>
      </div>

      {/* Abschließen-CTA */}
      {(event.status === "active" || event.status === "finished" || event.status === "umfrage") && (
        <Link href={`/admin/events/${event.id}/complete`}
          className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-teal-600/40 bg-teal-700/20 hover:bg-teal-700/30 transition-colors">
          <div>
            <p className="text-sm font-semibold text-teal-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {event.completionData ? "Abschluss bearbeiten" : "Event abschließen"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Platzierungen, Belohnungen und Umfragen vergeben</p>
          </div>
          <ExternalLink className="w-4 h-4 text-teal-400 shrink-0" />
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "text-teal-300 border-b-2 border-teal-500 -mb-px"
                : "text-gray-500 hover:text-gray-300"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Details ── */}
      {activeTab === "details" && (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 shrink-0">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    status === s ? STATUS_STYLES[s] : "text-gray-600 border-white/[0.08] hover:text-gray-400"
                  }`}>
                  {s === "open" ? "Offen" : s === "active" ? "Aktiv" : s === "umfrage" ? "Umfrage" : "Beendet"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Titel</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Beschreibung</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Wird auch in Discord angezeigt"
              className={`${inputCls} resize-none`} />
          </div>

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

          <div>
            <label className={`${labelCls} flex items-center justify-between`}>
              <span>Spiel</span>
              {seriesGame && game && seriesGame !== game && (
                <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                  <AlertCircle className="w-3 h-3" /> Abweichend von Reihe ({seriesGame})
                </span>
              )}
            </label>
            <GameNameInput value={game} onChange={setGame} placeholder="z.B. Valorant" className={inputCls} />
          </div>

          {game && (
            <div>
              <label className={labelCls}>Genre</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {GENRES.map(g => (
                  <button key={g.value} type="button" onClick={() => setGenre(genre === g.value ? null : g.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      genre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                    }`}>
                    <Image src={g.icon} alt={g.label} width={28} height={28} className="object-contain" />
                    <span className={`text-[10px] font-medium leading-tight text-center ${genre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Kategorie</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    category === cat.value ? "border-teal-500/50 bg-teal-500/10 text-teal-300" : "border-white/10 text-gray-500 hover:border-white/20"
                  }`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Datum & Uhrzeit</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max. Spieler</label>
              <input type="number" min={2} value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
                placeholder="unbegrenzt" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={`${labelCls} flex items-center justify-between`}>
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

          {/* ── Streaming-Partner ── */}
          <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 p-4 space-y-3">
            <button
              type="button"
              onClick={loadPartners}
              className="flex items-center gap-2 w-full text-left"
            >
              <Tv2 className="w-4 h-4 text-[#9146ff]" />
              <span className="text-sm font-semibold text-gray-300">Streaming-Partner</span>
              {!partnersLoaded && <span className="text-xs text-gray-600 ml-auto">Klicken zum Laden</span>}
            </button>
            {partnersLoaded && (
              <>
                {allPartners.length === 0 ? (
                  <p className="text-xs text-gray-600">Keine Partner eingetragen. Im Admin-Bereich unter Community → Partner anlegen.</p>
                ) : (
                  <div className="space-y-1.5">
                    {allPartners.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedPartnerIds.includes(p.id)}
                          onChange={(e) => {
                            setSelectedPartnerIds((ids) =>
                              e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id)
                            );
                          }}
                          className="rounded accent-violet-500"
                        />
                        <Image
                          src={p.logoUrl}
                          alt={p.name}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{p.name}</span>
                        <span className="text-xs text-gray-600">twitch.tv/{p.twitchLogin}</span>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={savePartners}
                      disabled={partnerSaving}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {partnerSaving ? "Speichert…" : "Streaming-Partner speichern"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={handleSave} disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {loading ? "Speichert…" : "Speichern"}
          </button>
        </div>
      )}

      {/* ── Tab: Belohnungen ── */}
      {activeTab === "rewards" && (
        <div className="space-y-4">
          {/* Teilnahme */}
          <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CoinIcon size={16} />
              <h3 className="text-sm font-semibold text-gray-300">Teilnahme-Belohnung</h3>
            </div>
            <p className="text-[11px] text-gray-600">Wird erst nach Event-Abschluss vergeben</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Münzen</label>
                <input type="number" min={0} value={participationCoins} onChange={e => setParticipationCoins(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Platzierungen */}
          <div className="rounded-xl border border-white/[0.06] bg-gray-900/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Platzierungs-Belohnungen</h3>
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center text-xs text-gray-500 px-1">
              <span />
              <span>Platz</span>
              <span className="flex items-center gap-1 justify-center"><RankPointsIcon size={12} /> RP</span>
              <span className="flex items-center gap-1 justify-center"><CoinIcon size={12} /> Münzen</span>
            </div>
            {placements.map(p => (
              <div key={p.place} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
                <span className="text-base">{p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : "🥉"}</span>
                <span className="text-sm text-gray-300">{p.place}. Platz</span>
                <input type="number" min={0} value={p.rankPoints}
                  onChange={e => updatePlacement(p.place, "rankPoints", Number(e.target.value))}
                  className={numCls} />
                <input type="number" min={0} value={p.coins}
                  onChange={e => updatePlacement(p.place, "coins", Number(e.target.value))}
                  className={numCls} />
              </div>
            ))}
          </div>

          {/* Zuschauer-Belohnung */}
          {event.spectatorMode && (
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-teal-300">👁️ Zuschauer-Basis-Belohnung</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Münzen</label>
                  <input type="number" min={0} value={spectatorCoins} onChange={e => setSpectatorCoins(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Rang-Punkte</label>
                  <input type="number" min={0} value={spectatorRankPts} onChange={e => setSpectatorRankPts(Number(e.target.value))} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Polls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">Umfragen</h3>
              {polls.length < 3 && (
                <button type="button" onClick={addPoll}
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Hinzufügen
                </button>
              )}
            </div>
            {polls.length === 0 && <p className="text-xs text-gray-600">Keine Umfragen konfiguriert.</p>}
            {polls.map((poll, i) => (
              <div key={i} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-300">Umfrage {i + 1}</p>
                  <button type="button" onClick={() => removePoll(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Label (z.B. MVP)</label>
                    <input type="text" value={poll.label} onChange={e => updatePoll(i, { label: e.target.value })}
                      placeholder="MVP" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Typ</label>
                    <select value={poll.type} onChange={e => updatePoll(i, { type: e.target.value as "player" | "spectator" })} className={inputCls}>
                      <option value="player">Spieler-Poll</option>
                      <option value="spectator">Zuschauer-Poll</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Frage</label>
                  <input type="text" value={poll.question} onChange={e => updatePoll(i, { question: e.target.value })}
                    placeholder="Wer war der MVP?" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Münzen (Sieger)</label>
                    <input type="number" min={0} value={poll.coins} onChange={e => updatePoll(i, { coins: Number(e.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Rang-Punkte</label>
                    <input type="number" min={0} value={poll.rankPoints} onChange={e => updatePoll(i, { rankPoints: Number(e.target.value) })} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" /> {loading ? "Speichert…" : "Speichern"}
          </button>
        </div>
      )}

      {/* ── Tab: Turnier ── */}
      {activeTab === "tournament" && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Format</label>
            <div className="grid grid-cols-2 gap-2">
              {TMT_FORMATS.map(f => (
                <button key={f.value} type="button" onClick={() => setTmtFormat(f.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    tmtFormat === f.value ? "border-amber-500 bg-amber-900/25 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  }`}>
                  <p className="text-xs font-medium leading-tight">{f.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {isLiga ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <label className="text-xs text-gray-500 block mb-3">Münzen pro Match-Ergebnis</label>
              <div className="grid grid-cols-2 gap-3">
                {([["🏆 Sieg", "win"], ["🤝 Unentschieden", "draw"]] as const).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type="number" min={0} value={tmtPoints[key]}
                      onChange={e => setTmtPoints(p => ({ ...p, [key]: Number(e.target.value) }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <label className={labelCls}>Belohnungen pro Platzierung</label>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600 px-1">
                <span>Platz</span>
                <span className="flex items-center justify-center gap-0.5"><CoinIcon size={11} /> Münzen</span>
                <span className="flex items-center justify-center gap-0.5"><RankPointsIcon size={11} /> Punkte</span>
              </div>
              {([["🥇 1.", "coins1", "pts1"], ["🥈 2.", "coins2", "pts2"], ["🥉 3.", "coins3", "pts3"]] as const).map(([label, ck, pk]) => (
                <div key={label} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-xs text-gray-300">{label}</span>
                  <input type="number" min={0} value={tmtPoints[ck]}
                    onChange={e => setTmtPoints(p => ({ ...p, [ck]: Number(e.target.value) }))}
                    className="text-xs bg-gray-800 border border-gray-700 text-amber-300 rounded px-2 py-1.5 text-center w-full" />
                  <input type="number" min={0} value={tmtPoints[pk]}
                    onChange={e => setTmtPoints(p => ({ ...p, [pk]: Number(e.target.value) }))}
                    className="text-xs bg-gray-800 border border-gray-700 text-teal-300 rounded px-2 py-1.5 text-center w-full" />
                </div>
              ))}
            </div>
          )}

          {hasStat && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <label className={labelCls}>Statistik-Felder</label>
              <StatFieldEditor fields={tmtStatFields} onChange={setTmtStatFields} isAvg={tmtFormat === "avg_stats"} />
            </div>
          )}

          <button onClick={saveTmtSettings} disabled={tmtLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-600 transition-colors disabled:opacity-50">
            <Trophy className="w-4 h-4" />
            {tmtLoading ? "Speichert…" : hasTournament ? "Turnier-Einstellungen speichern" : "Turnier erstellen"}
          </button>
        </div>
      )}

      {/* ── Tab: Teilnehmer ── */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">
              Spieler ({[...registeredIds].length}{event.maxPlayers ? `/${event.maxPlayers}` : ""})
            </h2>
            {bulkSelected.length > 0 && (
              <button onClick={bulkAdd} disabled={loading}
                className="flex items-center gap-1.5 text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
                <UserPlus className="w-3.5 h-3.5" /> {bulkSelected.length} hinzufügen
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Spieler suchen…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2 placeholder:text-gray-600" />
          </div>

          {/* Registered players */}
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
          {filteredUsers.filter(u => !registeredIds.has(u.id) && !spectatorIds.has(u.id)).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Nicht angemeldet</p>
                <button onClick={() => setBulkSelected(filteredUsers.filter(u => !registeredIds.has(u.id) && !spectatorIds.has(u.id)).map(u => u.id))}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors">
                  Alle auswählen
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredUsers.filter(u => !registeredIds.has(u.id) && !spectatorIds.has(u.id)).map(u => {
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

          {/* Spectators section */}
          {event.spectatorMode && (
            <div className="pt-2 border-t border-white/[0.05]">
              <p className="text-[10px] font-semibold text-teal-600/80 uppercase tracking-widest mb-2">
                👁️ Zuschauer ({[...spectatorIds].length})
              </p>
              <div className="space-y-1 mb-2">
                {filteredUsers.filter(u => spectatorIds.has(u.id)).map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-900/10 border border-teal-900/20">
                    {u.image
                      ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-teal-900/40 flex items-center justify-center text-xs font-semibold text-teal-400 shrink-0">{userName(u)[0].toUpperCase()}</div>
                    }
                    <span className="flex-1 text-sm text-teal-300/80 truncate">{userName(u)}</span>
                    <button onClick={() => removeUser(u.id, userName(u), "spectator")} disabled={loading}
                      className="shrink-0 text-gray-600 hover:text-red-400 p-1.5 rounded transition-colors disabled:opacity-50">
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {filteredUsers.filter(u => !registeredIds.has(u.id) && !spectatorIds.has(u.id)).length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredUsers.filter(u => !registeredIds.has(u.id) && !spectatorIds.has(u.id)).map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800 border border-transparent hover:border-teal-900/30">
                      {u.image
                        ? <img src={u.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                        : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-300 shrink-0">{userName(u)[0].toUpperCase()}</div>
                      }
                      <span className="flex-1 text-sm text-gray-400 truncate">{userName(u)}</span>
                      <button onClick={() => addSingleUser(u.id, "spectator")} disabled={loading}
                        className="shrink-0 text-gray-500 hover:text-teal-400 text-xs flex items-center gap-1 transition-colors disabled:opacity-50">
                        <UserPlus className="w-3 h-3" /> Zuschauer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredUsers.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-6">Keine Spieler gefunden.</p>
          )}
        </div>
      )}

      {/* ── Danger Zone (always visible) ── */}
      {isAdmin && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/10 p-3 mt-6">
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
  );
}
