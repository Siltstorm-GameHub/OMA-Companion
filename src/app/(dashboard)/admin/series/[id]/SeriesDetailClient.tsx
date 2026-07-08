"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, CalendarPlus, RefreshCw, Gamepad2,
  Swords, Hash, BarChart2, Plus, X, Trophy, Save, Coins,
  MessageSquare, ExternalLink, Archive, Vote, Trash2, Eye, EyeOff,
  Monitor, Flame,
} from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import GameNameInput from "@/components/GameNameInput";
import StatFieldEditor from "@/components/StatFieldEditor";
import { describeMonthlyModes } from "@/lib/recurrence";
import { SERIES_ICONS, resolveSeriesColor } from "@/lib/series-icons";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const numCls   = "w-24 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

const GENRES: { value: string; label: string; icon: string }[] = [
  { value: "arcade",     label: "Arcade",     icon: "/Arcade Icon.png" },
  { value: "beat_em_up", label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  { value: "sport",      label: "Sport",      icon: "/Sport Icon.png" },
  { value: "racing",     label: "Racing",     icon: "/Racing Icon.png" },
  { value: "shooter",    label: "Shooter",    icon: "/Shooter Icon.png" },
  { value: "community",  label: "Community",  icon: "/Community Icon.png" },
];

const PLATFORMS: { value: string; label: string; icon: string }[] = [
  { value: "PC",     label: "PC",     icon: "🖥️" },
  { value: "Xbox",   label: "Xbox",   icon: "🟢" },
  { value: "PS",     label: "PS",     icon: "🔵" },
  { value: "Mobile", label: "Mobile", icon: "📱" },
];

type SeriesEvent = {
  id: string; title: string; startAt: Date | string; status: string;
  maxPlayers: number | null; _count: { registrations: number };
};
type User = { id: string; name: string | null; username: string | null; image: string | null };

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
type PollConfig = {
  label: string;
  question: string;
  voterEligibility: "all" | "participants" | "players" | "spectators";
  answerType: "players" | "spectators" | "custom";
  customAnswers: string[];
  startOffsetHours: number;
  endOffsetHours: number;
  participationCoins: number;
  participationSeriesPoints: number;
  winnerCoins: number;
  winnerRankPoints: number;
};

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
const DEFAULT_POLL_ITEM: PollConfig = {
  label: "MVP",
  question: "Wer war der MVP?",
  voterEligibility: "participants",
  answerType: "players",
  customAnswers: [],
  startOffsetHours: 0,
  endOffsetHours: 24,
  participationCoins: 10,
  participationSeriesPoints: 0,
  winnerCoins: 100,
  winnerRankPoints: 0,
};

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
function parsePollConfigs(json: string | null | undefined): PollConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      // Migrate old format: { enabled, question, coins, rankPoints }
      if (parsed.enabled) {
        return [{
          ...DEFAULT_POLL_ITEM,
          label: parsed.question ?? "MVP",
          question: `Wer war der ${parsed.question ?? "MVP"}?`,
          winnerCoins: parsed.coins ?? 100,
          winnerRankPoints: parsed.rankPoints ?? 0,
        }];
      }
      return [];
    }
    return parsed as PollConfig[];
  } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SeriesDetailClient({ series, allUsers }: { series: any; allUsers: User[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteRevertCoins, setDeleteRevertCoins] = useState(false);
  const [deleteRevertRankPoints, setDeleteRevertRankPoints] = useState(false);

  // Basic
  const [name, setName]               = useState<string>(series.name);
  const [description, setDescription] = useState<string>(series.description ?? "");
  const [icon, setIcon]               = useState<string>(series.icon ?? "");
  const seriesColor = resolveSeriesColor(icon);

  // Category
  const [category, setCategory] = useState<string>(series.category ?? "");

  // Settings
  const [fixedGame, setFixedGame]           = useState<string>(series.fixedGame ?? "");
  const [fixedFormat, setFixedFormat]       = useState<string>(series.fixedFormat ?? "");
  const [genre, setGenre]                   = useState<string>(series.genre ?? "");
  const [platforms, setPlatforms]           = useState<string[]>(
    series.platform ? series.platform.split(",").map((p: string) => p.trim()).filter(Boolean) : []
  );
  const [discordChannelId, setDiscordChannelId] = useState<string>(series.discordChannelId ?? "");
  const [recurrenceType, setRecurrenceType] = useState<"" | "weekly" | "biweekly" | "monthly">(series.recurrenceType ?? "");
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<"dayOfMonth" | "weekdayOfMonth">(series.recurrenceMonthlyMode ?? "dayOfMonth");
  const [propagateGame, setPropagateGame]     = useState(false);
  const [propagateFormat, setPropagateFormat] = useState(false);
  const [hidden, setHidden]                   = useState<boolean>(series.hidden ?? false);
  const [hiddenBusy, setHiddenBusy]           = useState(false);

  // Stat config
  const initialStatCfg = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : {}; } catch { return {}; }
  })();
  const [statParticipationPts, setStatParticipationPts]   = useState<number>(initialStatCfg.participationPoints ?? 0);
  const [statSpectatorPts, setStatSpectatorPts]           = useState<number>(initialStatCfg.spectatorParticipationPoints ?? 0);
  const [statParticipationCoins, setStatParticipationCoins] = useState<number>(initialStatCfg.participationCoins ?? 0);
  const [statSpectatorCoins, setStatSpectatorCoins]         = useState<number>(initialStatCfg.spectatorParticipationCoins ?? 0);
  const [statTransferToGlobal, setStatTransferToGlobal]   = useState<boolean>(initialStatCfg.transferToGlobalRanking ?? false);
  const [statRows, setStatRows] = useState<{ field: string; pointsPer: number; isWinnerStat?: boolean; isMatchWinStat?: boolean }[]>(initialStatCfg.stats ?? []);
  // Event-level stat settings (Step 4 im Wizard)
  const [eventStatFields, setEventStatFields] = useState<string[]>(initialStatCfg.eventStatFields ?? []);
  const [winnerStatField, setWinnerStatField] = useState<string>(initialStatCfg.winnerStatField ?? "");
  // Dominion Bonus
  const initialDom = initialStatCfg.dominionBonus ?? {};
  const [dominionEnabled, setDominionEnabled]           = useState<boolean>(initialDom.enabled ?? false);
  const [dominionTriggerStats, setDominionTriggerStats] = useState<string[]>(initialDom.triggerStats ?? []);
  const [dominionThreshold, setDominionThreshold]       = useState<number>(initialDom.threshold ?? 3);
  const [dominionCoins, setDominionCoins]               = useState<number>(initialDom.coins ?? 0);
  const [dominionSeriesPoints, setDominionSeriesPoints] = useState<number>(initialDom.seriesPoints ?? 0);

  // Legacy standings
  type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };
  const [legacyRows, setLegacyRows] = useState<LegacyRow[]>(() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  });
  const [legacySearch, setLegacySearch] = useState("");

  // Placement rewards
  const initialRewards = parseRewards(series.placementRewardsJson);
  const [placementRewards, setPlacementRewards] = useState<PlacementReward[]>(initialRewards.placements);

  // Poll config — read from pollsConfigJson (wizard/create), fall back to pollConfigJson (legacy edit)
  const [polls, setPolls] = useState<PollConfig[]>(() => parsePollConfigs(series.pollsConfigJson ?? series.pollConfigJson));
  const [expandedPoll, setExpandedPoll] = useState<number | null>(null);
  const [propagatePolls, setPropagatePolls] = useState(false);
  const [propagateStatFields, setPropagateStatFields] = useState(false);

  const sortedSeriesEvents = [...(series.events as SeriesEvent[])].sort((a, b) => {
    const aDone = a.status === "finished";
    const bDone = b.status === "finished";
    if (aDone !== bDone) return aDone ? 1 : -1;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  const latestEvent = (series.events as SeriesEvent[]).reduce<SeriesEvent | null>((latest, ev) =>
    !latest || new Date(ev.startAt).getTime() > new Date(latest.startAt).getTime() ? ev : latest
  , null);
  const latestStartAt = latestEvent ? new Date(latestEvent.startAt) : new Date();

  function updatePlacementReward(place: number, key: keyof PlacementReward, value: number) {
    setPlacementRewards(prev => prev.map(r => r.place === place ? { ...r, [key]: value } : r));
  }

  function calcLegacyPoints(participations: number, stats: Record<string, number>): number {
    const statPts  = statRows.filter(sr => sr.field.trim()).reduce((sum, sr) => sum + (stats[sr.field] ?? 0) * sr.pointsPer, 0);
    const pollPts  = polls.filter(p => p.label.trim()).reduce((sum, p) => {
      const wins = stats[p.label] ?? 0;
      return sum + wins * p.winnerRankPoints;
    }, 0);
    const dominionPts = (dominionEnabled && dominionSeriesPoints > 0)
      ? (stats["Dominion Bonus"] ?? 0) * dominionSeriesPoints
      : 0;
    return participations * statParticipationPts + statPts + pollPts + dominionPts;
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
        icon:                 icon || null,
        category:             category || null,
        fixedGame:            fixedGame.trim() || null,
        fixedFormat:          fixedFormat || null,
        discordChannelId:     discordChannelId.trim() || null,
        recurrenceType:       recurrenceType || null,
        recurrenceMonthlyMode: recurrenceType === "monthly" ? recurrenceMonthlyMode : null,
        propagateGame,
        propagateFormat,
        genre:    genre.trim() || null,
        platform: platforms.length > 0 ? platforms.join(", ") : null,
        seriesStatConfig: JSON.stringify({
          participationPoints:          statParticipationPts,
          spectatorParticipationPoints: statSpectatorPts,
          participationCoins:           statParticipationCoins,
          spectatorParticipationCoins:  statSpectatorCoins,
          transferToGlobalRanking:      statTransferToGlobal,
          stats: statRows.filter(r => r.field.trim()),
          winnerStatKeys: statRows.filter(r => r.field.trim() && r.isWinnerStat).map(r => r.field),
          matchWinStatKeys: statRows.filter(r => r.field.trim() && r.isMatchWinStat).map(r => r.field),
          ...(eventStatFields.length > 0 && { eventStatFields }),
          ...(winnerStatField            && { winnerStatField }),
          ...(dominionEnabled && dominionTriggerStats.length > 0 && {
            dominionBonus: {
              enabled:      true,
              triggerStats: dominionTriggerStats,
              threshold:    dominionThreshold,
              coins:        dominionCoins,
              seriesPoints: dominionSeriesPoints,
            },
          }),
        }),
        legacyStandings:     JSON.stringify(legacyRows),
        placementRewardsJson: JSON.stringify({ placements: placementRewards }),
        pollsConfigJson:      JSON.stringify(polls),
        propagatePolls,
        propagateStatFields,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Reihe gespeichert");
      setPropagateGame(false);
      setPropagateFormat(false);
      setPropagatePolls(false);
      setPropagateStatFields(false);
      router.refresh();
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  async function toggleHidden() {
    setHiddenBusy(true);
    const next = !hidden;
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, hidden: next }),
    });
    setHiddenBusy(false);
    if (res.ok) {
      setHidden(next);
      toast.success(next ? "Reihe ausgeblendet" : "Reihe wieder sichtbar");
    } else {
      toast.error("Fehler");
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

  async function deleteSeries() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/series/${series.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revertCoins: deleteRevertCoins, revertRankPoints: deleteRevertRankPoints }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({ deletedEvents: 0 }));
        toast.success(`Eventreihe gelöscht – ${data.deletedEvents ?? 0} Event(s) mit entfernt`);
        router.push("/admin/series");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Fehler beim Löschen");
      }
    } finally {
      setDeleting(false);
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
      <div className="relative flex items-start justify-between gap-4 flex-wrap pl-4">
        <div className="absolute left-0 top-0.5 bottom-0.5 w-1 rounded-r-full" style={{ background: seriesColor }} />
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${seriesColor}1a`, border: `1px solid ${seriesColor}40` }}>
            <SeriesIcon name={icon} className="w-5 h-5" />
          </div>
          <div className="space-y-1">
          <input
            value={name} onChange={e => setName(e.target.value)}
            className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-white/20 focus:border-teal-500/50 outline-none transition-colors w-full max-w-lg"
            style={{ color: seriesColor }}
            placeholder="Reihen-Name"
          />
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            className="text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-white/10 focus:border-teal-500/30 outline-none transition-colors w-full max-w-lg"
            placeholder="Beschreibung hinzufügen…"
          />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleHidden}
            disabled={hiddenBusy}
            title={hidden ? "Reihe einblenden (für alle sichtbar machen)" : "Reihe ausblenden (nur im Admin sichtbar)"}
            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 ${
              hidden
                ? "text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                : "text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300"
            }`}
          >
            {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hidden ? "Ausgeblendet" : "Sichtbar"}
          </button>
          <Link
            href={`/events/series/${series.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/[0.08] hover:border-white/20 rounded-lg px-3 py-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Öffentlich ansehen
          </Link>
          {series.status === "archived" ? (
            <Link
              href={`/admin/series/${series.id}/complete`}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 rounded-lg px-3 py-1.5 transition-all"
            >
              <Vote className="w-3.5 h-3.5" /> Abschluss bearbeiten
            </Link>
          ) : (
            <Link
              href={`/admin/series/${series.id}/complete`}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-lg px-3 py-1.5 transition-all"
            >
              <Archive className="w-3.5 h-3.5" /> Reihe abschließen
            </Link>
          )}
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

          {/* Kategorie */}
          <Section title="Kategorie">
            <Field label="Kategorie">
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option value="">– Keine Kategorie –</option>
                <option value="competitive">🏆 Kompetitiv</option>
                <option value="fun">🎉 Fun</option>
                <option value="casual">🛋️ Casual</option>
                <option value="training">🎓 Training</option>
                <option value="community_event">🤝 Community</option>
                <option value="special">⭐ Special</option>
              </select>
            </Field>
            <Field label="Icon">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {SERIES_ICONS.map(i => {
                  const Icon = i.icon;
                  const selected = icon === i.value;
                  return (
                    <button key={i.value} type="button" title={i.label}
                      onClick={() => setIcon(selected ? "" : i.value)}
                      className="flex items-center justify-center rounded-xl p-2 border transition-all"
                      style={selected
                        ? { borderColor: `${i.color}99`, background: `${i.color}1a` }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                      <Icon className="w-4 h-4" style={{ color: selected ? i.color : "#9ca3af" }} />
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

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
                <option value="liga">Liga</option>
                <option value="ffa">Free for All</option>
                <option value="coop_stats">Kooperativ</option>
                <option value="avg_stats">Durchschnittswerte</option>
              </select>
              <Checkbox checked={propagateFormat} onChange={setPropagateFormat} label="Format, Belohnungen & Stat-Felder auf bestehende Events übertragen" />
            </Field>
            <Field label="Genre">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {GENRES.map(g => (
                  <button key={g.value} type="button" onClick={() => setGenre(genre === g.value ? "" : g.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      genre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                    }`}>
                    <Image src={g.icon} alt={g.label} width={32} height={32} className="object-contain" />
                    <span className={`text-[10px] font-medium leading-tight text-center ${genre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label={<><Monitor className="w-3 h-3" /> Plattform</>}>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => {
                  const active = platforms.includes(p.value);
                  return (
                    <button key={p.value} type="button"
                      onClick={() => setPlatforms(prev => active ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition-all ${
                        active ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                      }`}>
                      <span>{p.icon}</span> {p.label}
                    </button>
                  );
                })}
              </div>
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
          <Section title="Belohnungen (Endplatzierung der Eventreihe)">
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
                    <RankPointsIcon size={12} />
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
              <p className="text-[11px] text-gray-500">
                Wird bei Abschluss der gesamten Eventreihe anhand der finalen Gesamtplatzierung vergeben — nicht mehr pro einzelnem Event.
              </p>
              <p className="text-[11px] text-gray-500 pt-1 border-t border-white/[0.05]">
                Münzen pro Teilnahme (Mitspieler &amp; Zuschauer): siehe „Gesamttabellen-Konfiguration" weiter unten.
              </p>
              <Checkbox
                checked={statTransferToGlobal}
                onChange={setStatTransferToGlobal}
                label="Ligapunkte bei Event-Abschluss auf Gesamtrangliste übertragen"
              />
            </div>
          </Section>

          {/* Poll-Konfiguration */}
          <Section title="Umfragen">
            <div className="space-y-2">
              {polls.map((p, i) => (
                <div key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedPoll(expandedPoll === i ? null : i)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{p.label || `Umfrage ${i + 1}`}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setPolls(prev => prev.filter((_, j) => j !== i)); if (expandedPoll === i) setExpandedPoll(null); }}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      ><X className="w-3.5 h-3.5" /></button>
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expandedPoll === i ? "rotate-90" : ""}`} />
                    </div>
                  </button>
                  {expandedPoll === i && (
                    <div className="px-3 pb-3 space-y-3 border-t border-white/[0.06] pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Label (interner Name)</label>
                          <input type="text" value={p.label}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                            placeholder="z.B. MVP" className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Wer darf abstimmen</label>
                          <select value={p.voterEligibility}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, voterEligibility: e.target.value as PollConfig["voterEligibility"] } : x))}
                            className={inputCls}>
                            <option value="all">Alle App-Mitglieder</option>
                            <option value="participants">Mitspieler + Zuschauer</option>
                            <option value="players">Nur Mitspieler</option>
                            <option value="spectators">Nur Zuschauer</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Frage</label>
                        <input type="text" value={p.question}
                          onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                          placeholder="z.B. Wer war der MVP?" className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Antwort-Typ</label>
                        <select value={p.answerType}
                          onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, answerType: e.target.value as PollConfig["answerType"], customAnswers: [] } : x))}
                          className={inputCls}>
                          <option value="players">Mitspieler des Events</option>
                          <option value="spectators">Zuschauer des Events</option>
                          <option value="custom">Eigene Antworten</option>
                        </select>
                      </div>
                      {p.answerType === "custom" && (
                        <div className="space-y-1.5">
                          {p.customAnswers.map((ans, ai) => (
                            <div key={ai} className="flex gap-2">
                              <input type="text" value={ans}
                                onChange={e => setPolls(prev => prev.map((x, j) => {
                                  if (j !== i) return x;
                                  const ca = [...x.customAnswers]; ca[ai] = e.target.value; return { ...x, customAnswers: ca };
                                }))}
                                placeholder={`Antwort ${ai + 1}`} className={inputCls} />
                              <button type="button"
                                onClick={() => setPolls(prev => prev.map((x, j) => j !== i ? x : { ...x, customAnswers: x.customAnswers.filter((_, k) => k !== ai) }))}
                                className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          <button type="button"
                            onClick={() => setPolls(prev => prev.map((x, j) => j !== i ? x : { ...x, customAnswers: [...x.customAnswers, ""] }))}
                            className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300">
                            <Plus className="w-3 h-3" /> Antwort hinzufügen
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Start (Stunden nach Event)</label>
                          <input type="number" min={0} value={p.startOffsetHours}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, startOffsetHours: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Ende (Stunden nach Event)</label>
                          <input type="number" min={0} value={p.endOffsetHours}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, endOffsetHours: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Teilnahme-Münzen</label>
                          <input type="number" min={0} value={p.participationCoins}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, participationCoins: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={12} /> Teilnahme-Ligapunkte</label>
                          <input type="number" min={0} value={p.participationSeriesPoints}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, participationSeriesPoints: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Sieger-Münzen</label>
                          <input type="number" min={0} value={p.winnerCoins}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, winnerCoins: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={12} /> Sieger-Ligapunkte</label>
                          <input type="number" min={0} value={p.winnerRankPoints}
                            onChange={e => setPolls(prev => prev.map((x, j) => j === i ? { ...x, winnerRankPoints: Number(e.target.value) } : x))}
                            className={inputCls} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {polls.length < 5 && (
                <button type="button"
                  onClick={() => { setPolls(prev => [...prev, { ...DEFAULT_POLL_ITEM }]); setExpandedPoll(polls.length); }}
                  className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300 transition-colors">
                  <Plus className="w-3 h-3" /> Umfrage hinzufügen
                </button>
              )}
              <Checkbox
                checked={propagatePolls}
                onChange={setPropagatePolls}
                label="Umfragen auf alle kommenden Events übertragen (aktualisiert pollsConfigJson der Events)"
              />
            </div>
          </Section>

          {/* Gesamttabellen-Konfiguration */}
          <Section title="Gesamttabellen-Konfiguration">
            <div className="grid grid-cols-2 gap-3">
              <Field label={<><BarChart2 className="w-3 h-3" /> Punkte pro Teilnahme</>}>
                <input type="number" min={0} value={statParticipationPts}
                  onChange={e => setStatParticipationPts(Number(e.target.value))}
                  className={inputCls} />
              </Field>
              <Field label="Punkte pro Zuschauer-Teilnahme">
                <input type="number" min={0} value={statSpectatorPts}
                  onChange={e => setStatSpectatorPts(Number(e.target.value))}
                  className={inputCls} />
              </Field>
              <Field label={<><Coins className="w-3 h-3 text-amber-400" /> Münzen pro Teilnahme</>}>
                <input type="number" min={0} value={statParticipationCoins}
                  onChange={e => setStatParticipationCoins(Number(e.target.value))}
                  className={inputCls} />
              </Field>
              <Field label="Münzen pro Zuschauer-Teilnahme">
                <input type="number" min={0} value={statSpectatorCoins}
                  onChange={e => setStatSpectatorCoins(Number(e.target.value))}
                  className={inputCls} />
              </Field>
            </div>
            <p className="text-[11px] text-gray-500">
              Wird jeweils direkt bei Abschluss des einzelnen Events vergeben, nicht erst am Ende der Reihe.
            </p>
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Stats</p>
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
                  <button
                    type="button"
                    title="Gewinner-Stat"
                    onClick={() => setStatRows(prev => prev.map((r, j) => j === i ? { ...r, isWinnerStat: !r.isWinnerStat } : r))}
                    className={`shrink-0 transition-colors ${row.isWinnerStat ? "text-amber-400" : "text-gray-600 hover:text-amber-400"}`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Match-Win-Stat"
                    onClick={() => setStatRows(prev => prev.map((r, j) => j === i ? { ...r, isMatchWinStat: !r.isMatchWinStat } : r))}
                    className={`shrink-0 transition-colors ${row.isMatchWinStat ? "text-teal-400" : "text-gray-600 hover:text-teal-400"}`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setStatRows(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-gray-600">🏆 = Gewinner-Stat (bestimmt Reihensieger) · ⚔️ = Match-Win-Stat (+1 pro Match Win aus einzelnen Runden)</p>
              <button type="button" onClick={() => setStatRows(prev => [...prev, { field: "", pointsPer: 1, isWinnerStat: false, isMatchWinStat: false }])}
                className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-300 transition-colors">
                <Plus className="w-3 h-3" /> Statistik hinzufügen
              </button>
            </div>

            {/* Dominion Bonus */}
            <div className="pt-2 border-t border-white/[0.05] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={dominionEnabled} onChange={e => setDominionEnabled(e.target.checked)}
                  className="rounded accent-amber-500" />
                <span className="text-sm text-gray-300 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-amber-400" /> Dominion Bonus aktivieren</span>
              </label>
              {dominionEnabled && (
                <div className="space-y-3 pl-1">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Trigger-Stats (mind. eine muss erfüllt sein)</p>
                    <div className="flex flex-wrap gap-2">
                      {statRows.filter(r => r.field.trim()).map(r => (
                        <button key={r.field} type="button"
                          onClick={() => setDominionTriggerStats(prev =>
                            prev.includes(r.field) ? prev.filter(s => s !== r.field) : [...prev, r.field]
                          )}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                            dominionTriggerStats.includes(r.field)
                              ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                              : "text-gray-500 border-white/[0.08] hover:border-white/20"
                          }`}
                        >{r.field}</button>
                      ))}
                      {statRows.filter(r => r.field.trim()).length === 0 && (
                        <p className="text-xs text-gray-600">Erst Stats hinzufügen</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Streak-Schwelle</label>
                      <input type="number" min={1} value={dominionThreshold}
                        onChange={e => setDominionThreshold(Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Münzen</label>
                      <input type="number" min={0} value={dominionCoins}
                        onChange={e => setDominionCoins(Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={12} /> Liga-Pkt.</label>
                      <input type="number" min={0} value={dominionSeriesPoints}
                        onChange={e => setDominionSeriesPoints(Number(e.target.value))} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Event-Format-Einstellungen (für Stats/Durchschnittswerte-Modi) */}
          {(fixedFormat === "ffa" || fixedFormat === "coop_stats" || fixedFormat === "avg_stats" || eventStatFields.length > 0) && (
            <Section title="Event-Einstellungen (Stat-Tracking)">
              <p className="text-xs text-gray-500 mb-1">
                Welche Stats werden pro Event erfasst? Gilt als Vorlage für neue Events und den Abschluss-Assistenten.
              </p>

              <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
                <p className="text-sm font-medium text-amber-300 mb-2">Trackte Statistiken je Event</p>
                <StatFieldEditor
                  fields={eventStatFields}
                  onChange={f => {
                    setEventStatFields(f);
                    if (!f.includes(winnerStatField)) setWinnerStatField("");
                  }}
                  isAvg={fixedFormat === "avg_stats"}
                />
              </div>

              {eventStatFields.length > 0 && (
                <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-3">
                  <p className="text-sm font-medium text-teal-300">🏆 Sieger-Ermittlung</p>
                  <p className="text-[11px] text-gray-500">
                    Welcher Stat bestimmt den Sieger eines Events? Der Spieler mit dem höchsten Wert gewinnt.
                  </p>
                  <select
                    value={winnerStatField}
                    onChange={e => setWinnerStatField(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">– Kein / manuell festlegen –</option>
                    {eventStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {winnerStatField && statRows.filter(r => r.isWinnerStat).length === 0 && (
                    <p className="text-[11px] text-amber-500/80 rounded-lg px-3 py-2 border border-amber-500/20 bg-amber-500/5">
                      Markiere oben unter &quot;Stats&quot; einen Reihen-Stat mit 🏆, damit der Event-Sieger dort +1 bekommt.
                    </p>
                  )}
                </div>
              )}

              <Checkbox
                checked={propagateStatFields}
                onChange={setPropagateStatFields}
                label="Stat-Felder auf alle offenen Events übertragen (überschreibt individuell abweichende Event-Einstellungen)"
              />
            </Section>
          )}

          {/* Legacy-Stand */}
          <Section title="Legacy-Stand" overflowVisible>
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
                              return { ...r, participations: newPart, points: calcLegacyPoints(newPart, r.stats) };
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
                                return { ...r, stats: newStats, points: calcLegacyPoints(r.participations, newStats) };
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
                      {/* Poll-Felder */}
                      {polls.filter(p => p.label.trim()).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1.5 border-t border-white/[0.04] mt-1">
                          {polls.filter(p => p.label.trim()).map(p => (
                            <label key={p.label} className="flex items-center gap-1.5 text-[11px] text-violet-400">
                              {p.label} Siege
                              <input type="number" min={0} value={row.stats[p.label] ?? 0}
                                onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                  if (j !== i) return r;
                                  const newStats = { ...r.stats, [p.label]: Number(e.target.value) };
                                  return { ...r, stats: newStats, points: calcLegacyPoints(r.participations, newStats) };
                                }))}
                                className="w-16 rounded px-1.5 py-0.5 text-[11px] text-white bg-gray-800 border border-gray-700" />
                            </label>
                          ))}
                        </div>
                      )}
                      {/* Dominion Bonus */}
                      {dominionEnabled && (
                        <div className="flex flex-wrap gap-2 pt-1.5 border-t border-white/[0.04] mt-1">
                          <label className="flex items-center gap-1.5 text-[11px] text-amber-400">
                            <Flame className="w-3 h-3" /> Dominion Bonus (Anzahl)
                            <input type="number" min={0} value={row.stats["Dominion Bonus"] ?? 0}
                              onChange={e => setLegacyRows(prev => prev.map((r, j) => {
                                if (j !== i) return r;
                                const newStats = { ...r.stats, "Dominion Bonus": Number(e.target.value) };
                                return { ...r, stats: newStats, points: calcLegacyPoints(r.participations, newStats) };
                              }))}
                              className="w-16 rounded px-1.5 py-0.5 text-[11px] text-white bg-gray-800 border border-gray-700" />
                          </label>
                        </div>
                      )}
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
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
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
              {sortedSeriesEvents.map((ev, i) => {
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
                      <p className="text-sm text-white truncate">
                        {ev.title}
                        <span className="text-gray-500 font-normal"> · {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "numeric" })}</span>
                      </p>
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

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4 space-y-3">
        <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">Danger Zone</p>

        {!deleteConfirm ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-300 font-medium">Eventreihe löschen</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Löscht die Reihe und alle {series.events.length} zugehörigen Event(s) unwiderruflich.
              </p>
            </div>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm text-red-400 border border-red-800/40 hover:border-red-600/60 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Löschen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              Bist du sicher? Die Reihe <span className="font-semibold text-white">„{series.name}“</span> und
              alle <span className="font-semibold text-white">{series.events.length} zugehörigen Events</span> (inkl.
              Anmeldungen, Turniere &amp; Matches) werden unwiderruflich gelöscht.
            </p>
            <div className="space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
              <p className="text-[11px] text-gray-500">
                Bereits vergebene Belohnungen aus abgeschlossenen Events dieser Reihe:
              </p>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRevertCoins}
                  onChange={(e) => setDeleteRevertCoins(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-600/50"
                />
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Vergebene Münzen den Usern wieder abziehen
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRevertRankPoints}
                  onChange={(e) => setDeleteRevertRankPoints(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-600/50"
                />
                <RankPointsIcon size={12} />
                Vergebene Rang-Punkte den Usern wieder abziehen
              </label>
              <p className="text-[11px] text-gray-600">
                Unangeklickt behalten User ihre bisher erhaltenen Münzen/Rang-Punkte aus dieser Reihe.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={deleteSeries}
                disabled={deleting}
                className="text-sm font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Löschen…" : "Ja, endgültig löschen"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small helper components ── */
function Section({ title, children, overflowVisible }: { title: string; children: React.ReactNode; overflowVisible?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-gray-900/50 ${overflowVisible ? "overflow-visible" : "overflow-hidden"}`}>
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
