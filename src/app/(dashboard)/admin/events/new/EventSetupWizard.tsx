"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, CalendarDays, Repeat } from "lucide-react";
import { EventCategory, EventGenre } from "@prisma/client";
import GameNameInput from "@/components/GameNameInput";
import StatFieldEditor from "@/components/StatFieldEditor";
import { describeMonthlyModes, calcNextDate } from "@/lib/recurrence";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeriesOption = {
  id: string;
  name: string;
  category: EventCategory | null;
  genre: EventGenre | null;
  placementRewardsJson: string | null;
  _count: { events: number };
};

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

type PlacementReward = { place: number; coins: number; rankPoints: number };
type StatRow = { field: string; pointsPer: number; isWinnerStat?: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS_EVENT  = ["Typ & Kategorie", "Grunddaten", "Turnier", "Belohnungen", "Zusammenfassung"];
const STEP_LABELS_SERIES = ["Typ & Kategorie", "Reihen-Info", "Termine", "Reihen-Belohnungen", "Event-Einstellungen", "Zusammenfassung"];

const CATEGORIES: { value: EventCategory; label: string; emoji: string; color: string; border: string; bg: string }[] = [
  { value: "competitive",     label: "Kompetitiv", emoji: "🏆", color: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/10" },
  { value: "fun",             label: "Fun",        emoji: "🎉", color: "text-amber-400",  border: "border-amber-400/40",  bg: "bg-amber-500/10" },
  { value: "casual",          label: "Casual",     emoji: "🛋️", color: "text-emerald-400",border: "border-emerald-500/40",bg: "bg-emerald-500/10" },
  { value: "training",        label: "Training",   emoji: "🎓", color: "text-indigo-400", border: "border-indigo-500/40", bg: "bg-indigo-500/10" },
  { value: "community_event", label: "Community",  emoji: "🤝", color: "text-violet-400", border: "border-violet-500/40", bg: "bg-violet-500/10" },
  { value: "special",         label: "Special",    emoji: "⭐", color: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-500/10" },
];

const GENRES: { value: EventGenre; label: string; icon: string }[] = [
  { value: "arcade",    label: "Arcade",     icon: "/Arcade Icon.png" },
  { value: "beat_em_up",label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  { value: "sport",     label: "Sport",      icon: "/Sport Icon.png" },
  { value: "racing",    label: "Racing",     icon: "/Racing Icon.png" },
  { value: "shooter",   label: "Shooter",    icon: "/Shooter Icon.png" },
  { value: "community", label: "Community",  icon: "/Community Icon.png" },
];

const PLATFORMS: { value: string; label: string; icon: string }[] = [
  { value: "PC",     label: "PC",     icon: "🖥️" },
  { value: "Xbox",   label: "Xbox",   icon: "🟢" },
  { value: "PS",     label: "PS",     icon: "🔵" },
  { value: "Mobile", label: "Mobile", icon: "📱" },
];

const FORMATS: { value: string; label: string; desc: string; hasStat: boolean }[] = [
  { value: "single_elimination", label: "Single Elimination", desc: "Jede Niederlage scheidet aus", hasStat: false },
  { value: "double_elimination", label: "Double Elimination", desc: "Zweite Chance nach erster Niederlage", hasStat: false },
  { value: "round_robin",        label: "Round Robin",        desc: "Jeder spielt gegen jeden", hasStat: false },
  { value: "liga",               label: "Liga",               desc: "Mehrere Spieltage, Punkte akkumulieren", hasStat: false },
  { value: "ffa",                label: "Free for All",       desc: "Alle gegen alle, Statistiken entscheiden", hasStat: true },
  { value: "coop_stats",         label: "Kooperativ",         desc: "Team gegen Ziel, gemeinsame Stats", hasStat: true },
  { value: "avg_stats",          label: "Durchschnittswerte", desc: "Individuelle Stats werden gemittelt", hasStat: true },
];

const RECURRENCE_OPTS: { value: string; label: string; desc: string }[] = [
  { value: "none",      label: "Keine",          desc: "Manuell Termine hinzufügen" },
  { value: "weekly",    label: "Wöchentlich",    desc: "Jeden Woche am selben Wochentag" },
  { value: "biweekly",  label: "Zweiwöchentlich",desc: "Alle zwei Wochen" },
  { value: "monthly",   label: "Monatlich",      desc: "Einmal pro Monat" },
];

const inputCls   = "w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none";
const inputStyle = { background: "#0b1a17", border: "1px solid rgba(20,184,166,0.18)" };
const labelCls   = "text-xs text-gray-500 mb-1 block";

// ─── Component ────────────────────────────────────────────────────────────────

// ─── LUL-spezifische Types ────────────────────────────────────────────────────

type LulPollDef = {
  statKey: string;
  label:   string;
  points:  number;
};

type LulPointsConfig = {
  game:              number;
  spectator:         number;
  gameWinner:        number;
  vote:              number;
  dominion:          number;
  dominionTriggers:  string[];
  polls:             LulPollDef[];
};

const LUL_DEFAULTS: LulPointsConfig = {
  game:             5,
  spectator:        5,
  gameWinner:       10,
  vote:             2,
  dominion:         20,
  dominionTriggers: ["gameWinner", "communityChamp", "trostpreis"],
  polls: [
    { statKey: "communityChamp", label: "Community Champ", points: 10 },
    { statKey: "trostpreis",     label: "Trostpreis",      points: 10 },
  ],
};

const STEP_LABELS_LUL = ["Season-Info", "Spieltag-Template", "Punktesystem", "Zusammenfassung"];

export default function EventSetupWizard({
  series,
  initialMode = "select",
}: {
  series: SeriesOption[];
  initialMode?: "select" | "event" | "series";
}) {
  const router = useRouter();
  const [wizardMode, setWizardMode] = useState<"select" | "event" | "series">(initialMode as "select" | "event" | "series");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── LUL mode state ────────────────────────────────────────────────────────────
  const [lulSeasonName, setLulSeasonName]       = useState("");
  const [lulPeriod, setLulPeriod]               = useState("");
  const [lulTotalSpieltage, setLulTotalSpieltage] = useState(8);
  const [lulFirstDate, setLulFirstDate]         = useState("");
  const [lulRecurrence, setLulRecurrence]       = useState<"none" | RecurrenceType>("biweekly");
  const [lulMonthlyMode, setLulMonthlyMode]     = useState<MonthlyMode>("dayOfMonth");
  const [lulGame, setLulGame]                   = useState("");
  const [lulGenre, setLulGenre]                 = useState<EventGenre | null>(null);
  const [lulGameType, setLulGameType]           = useState("");
  const [lulPlatforms, setLulPlatforms]         = useState<string[]>([]);
  const [lulFormat, setLulFormat]               = useState("");
  const [lulStatFields, setLulStatFields]       = useState<string[]>([]);
  const [lulMaxPlayers, setLulMaxPlayers]       = useState("");
  const [lulPoints, setLulPoints]               = useState<LulPointsConfig>({ ...LUL_DEFAULTS, polls: LUL_DEFAULTS.polls.map(p => ({ ...p })) });

  // ── Shared (Step 0) ──────────────────────────────────────────────────────────
  const [category, setCategory]       = useState<EventCategory>("casual");
  const [eventType, setEventType]     = useState<"community" | "tournament" | "lul">("community");
  const [spectatorMode, setSpectatorMode] = useState(false);

  // ── Event mode state ─────────────────────────────────────────────────────────
  const [title, setTitle]             = useState("");
  const [startAt, setStartAt]         = useState("");
  const [game, setGame]               = useState("");
  const [genre, setGenre]             = useState<EventGenre | null>(null);
  const [platforms, setPlatforms]     = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers]   = useState("");
  const [description, setDescription] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [seriesMode, setSeriesMode]   = useState<"none" | "existing" | "new">("none");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");
  const [format, setFormat]           = useState("single_elimination");
  const [statFields, setStatFields]   = useState<string[]>([]);
  const [ligaWinCoins, setLigaWinCoins] = useState(50);
  const [ligaDrawCoins, setLigaDrawCoins] = useState(20);

  // ── Series mode state ─────────────────────────────────────────────────────────
  const [seriesName, setSeriesName]     = useState("");
  const [seriesDesc, setSeriesDesc]     = useState("");
  const [variousGames, setVariousGames] = useState(false);
  const [fixedGame, setFixedGame]       = useState("");
  const [fixedGenre, setFixedGenre]     = useState<EventGenre | null>(null);
  const [fixedPlatforms, setFixedPlatforms] = useState<string[]>([]);
  const [seriesDiscordId, setSeriesDiscordId] = useState("");
  const [seriesFormat, setSeriesFormat] = useState("single_elimination");
  const [seriesStartDate, setSeriesStartDate] = useState("");
  const [seriesEndDate, setSeriesEndDate]     = useState("");
  const [recurrenceType, setRecurrenceType]   = useState<"none" | RecurrenceType>("none");
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<MonthlyMode>("dayOfMonth");
  const [statParticipationPts, setStatParticipationPts] = useState(5);
  const [statSpectatorParticipationPts, setStatSpectatorParticipationPts] = useState(3);
  const [statPtsToGlobalRanking, setStatPtsToGlobalRanking] = useState(false);
  const [statRows, setStatRows]         = useState<StatRow[]>([]);
  const [seriesHidden, setSeriesHidden] = useState(false);
  const [eventStatFields, setEventStatFields] = useState<string[]>([]);
  const [winnerStatField, setWinnerStatField] = useState("");
  const [aggregatedStatFields, setAggregatedStatFields] = useState<string[]>([]);

  // ── Dominion Bonus ───────────────────────────────────────────────────────────
  const [dominionEnabled, setDominionEnabled]       = useState(false);
  const [dominionTriggerStat, setDominionTriggerStat] = useState("");
  const [dominionThreshold, setDominionThreshold]   = useState(3);
  const [dominionCoins, setDominionCoins]           = useState(0);
  const [dominionSeriesPoints, setDominionSeriesPoints] = useState(5);

  // ── Shared rewards ───────────────────────────────────────────────────────────
  const [participationCoins, setParticipationCoins] = useState(10);
  const [participationRankPts, setParticipationRankPts] = useState(0);
  const [placements, setPlacements] = useState<PlacementReward[]>([
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ]);
  const [spectatorCoins, setSpectatorCoins]     = useState(5);
  const [spectatorRankPts, setSpectatorRankPts] = useState(0);
  const [polls, setPolls] = useState<PollConfig[]>([]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isEventMode  = wizardMode === "event";
  const isSeriesMode = wizardMode === "series";
  const selectedSeries = series.find(s => s.id === selectedSeriesId);
  const formatObj  = FORMATS.find(f => f.value === format);
  const hasStat    = formatObj?.hasStat ?? false;

  const monthlyDescriptions = useMemo(() => {
    if (!seriesStartDate || recurrenceType !== "monthly") return null;
    try { return describeMonthlyModes(new Date(seriesStartDate)); } catch { return null; }
  }, [seriesStartDate, recurrenceType]);

  const previewDates = useMemo(() => {
    if (!seriesStartDate) return [];
    const start = new Date(seriesStartDate);
    if (isNaN(start.getTime())) return [];
    if (recurrenceType === "none") return [start];
    const endLimit = seriesEndDate ? new Date(seriesEndDate + "T23:59:59") : null;
    const dates: Date[] = [start];
    // With endDate: generate ALL dates (no cap) to show exact count
    // Without endDate: preview only next 5
    const maxIter = endLimit ? 500 : 5;
    for (let i = 0; i < maxIter; i++) {
      const last = dates[dates.length - 1];
      const next = calcNextDate(
        last,
        recurrenceType as RecurrenceType,
        recurrenceMonthlyMode,
        start,
      );
      if (endLimit && next > endLimit) break;
      if (!endLimit && dates.length >= 5) break;
      dates.push(next);
    }
    return dates;
  }, [seriesStartDate, seriesEndDate, recurrenceType, recurrenceMonthlyMode]);

  // ── Step lists ───────────────────────────────────────────────────────────────
  // Event mode: skip tournament step if community
  const eventStepComponents = eventType === "tournament"
    ? [renderStepCategory, renderStepEventData, renderStepTournament, renderStepRewards, renderStepEventSummary]
    : [renderStepCategory, renderStepEventData, renderStepRewards, renderStepEventSummary];

  const isLulMode = isSeriesMode && eventType === "lul";

  const lulSeriesStepComponents = [renderStepCategory, renderLulSeasonInfo, renderLulTemplate, renderLulPoints, renderLulSummary];
  const seriesStepComponents    = isLulMode
    ? lulSeriesStepComponents
    : [renderStepCategory, renderStepSeriesData, renderStepSchedule, renderStepRewards, renderStepSeriesEventSettings, renderStepSeriesSummary];

  const activeSteps = isEventMode ? eventStepComponents : seriesStepComponents;

  function canProceed(): boolean {
    if (wizardMode === "select") return false;
    if (isEventMode) {
      if (step === 0) return true;
      if (step === 1) return title.trim().length > 0 && startAt.length > 0;
      return true;
    }
    // LUL-Modus im Series-Flow
    if (isLulMode) {
      if (step === 0) return true;
      if (step === 1) return lulSeasonName.trim().length > 0;
      return true;
    }
    if (step === 0) return true;
    if (step === 1) return seriesName.trim().length > 0;
    return true;
  }

  // ── Poll helpers ─────────────────────────────────────────────────────────────
  function addPoll() {
    if (polls.length >= 5) return;
    setPolls(p => [...p, {
      label: "", question: "",
      voterEligibility: "all",
      answerType: "players",
      customAnswers: [],
      startOffsetHours: 0,
      endOffsetHours: 24,
      participationCoins: 5,
      participationSeriesPoints: 0,
      winnerCoins: 50,
      winnerRankPoints: 0,
    }]);
  }
  function updatePoll(i: number, patch: Partial<PollConfig>) {
    setPolls(p => p.map((poll, idx) => idx === i ? { ...poll, ...patch } : poll));
  }
  function removePoll(i: number) {
    setPolls(p => p.filter((_, idx) => idx !== i));
  }

  // ── Submit handlers ──────────────────────────────────────────────────────────
  async function handleSubmitEvent() {
    if (!title || !startAt) return;
    setLoading(true);

    let seriesId: string | null = null;
    if (seriesMode === "existing" && selectedSeriesId) {
      seriesId = selectedSeriesId;
    } else if (seriesMode === "new" && newSeriesName.trim()) {
      const sRes = await fetch("/api/events/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim(), description: newSeriesDesc.trim() || null, category }),
      });
      if (!sRes.ok) { toast.error("Fehler beim Erstellen der Eventreihe"); setLoading(false); return; }
      seriesId = (await sRes.json()).id;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      game: game || null,
      genre: genre || null,
      platform: platforms.length > 0 ? platforms.join(", ") : null,
      category,
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      description: description || null,
      type: eventType,
      seriesId,
      discordChannelId: discordChannelId || null,
      spectatorMode,
      spectatorRewardJson: spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
      placementRewardsJson: { participationCoins, participationRankPts, placements },
      pollsConfigJson: polls.length > 0 ? polls : null,
    };

    if (eventType === "tournament") {
      body.format = format;
      if (hasStat) body.statFields = JSON.stringify(statFields);
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Fehler beim Erstellen"); return; }
    const event = await res.json();
    toast.success("Event erfolgreich erstellt!");
    router.push(`/admin/events/${event.id}`);
  }

  async function handleSubmitSeries() {
    // LUL-Modus delegiert an eigenen Handler
    if (isLulMode) { await handleSubmitLul(); return; }
    if (!seriesName.trim()) return;
    setLoading(true);

    const hasStandingsConfig = eventType === "tournament" && (statParticipationPts > 0 || statRows.length > 0);
    const hasEventConfig = eventStatFields.length > 0;
    const winnerStatKeys = statRows.filter(r => r.isWinnerStat).map(r => r.field);
    const seriesStatConfig = (hasStandingsConfig || hasEventConfig || (spectatorMode && statSpectatorParticipationPts > 0) || dominionEnabled)
      ? JSON.stringify({
          participationPoints: statParticipationPts,
          spectatorParticipationPoints: spectatorMode ? statSpectatorParticipationPts : 0,
          transferToGlobalRanking: statPtsToGlobalRanking,
          stats: statRows,
          ...(eventStatFields.length > 0 && { eventStatFields }),
          ...(aggregatedStatFields.length > 0 && { aggregatedStatFields }),
          ...(winnerStatField && { winnerStatField }),
          ...(winnerStatKeys.length > 0 && { winnerStatKeys }),
          ...(dominionEnabled && dominionTriggerStat && {
            dominionBonus: {
              enabled: true,
              triggerStat: dominionTriggerStat,
              threshold: dominionThreshold,
              coins: dominionCoins,
              seriesPoints: dominionSeriesPoints,
            },
          }),
        })
      : null;

    const res = await fetch("/api/events/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: seriesName.trim(),
        description: seriesDesc.trim() || null,
        category,
        genre: fixedGenre || null,
        platform: fixedPlatforms.length > 0 ? fixedPlatforms.join(", ") : null,
        fixedGame: variousGames ? null : (fixedGame || null),
        fixedFormat: (eventType === "tournament" && !variousGames) ? seriesFormat : null,
        discordChannelId: seriesDiscordId || null,
        recurrenceType: recurrenceType !== "none" ? recurrenceType : null,
        recurrenceMonthlyMode: recurrenceType === "monthly" ? recurrenceMonthlyMode : null,
        placementRewardsJson: { participationCoins, participationRankPts, placements },
        pollsConfigJson: polls.length > 0 ? polls : null,
        seriesStatConfig,
        startDate: seriesStartDate ? new Date(seriesStartDate).toISOString() : null,
        endDate: seriesEndDate ? new Date(seriesEndDate + "T23:59:59").toISOString() : null,
        eventType,
        hidden: seriesHidden,
        spectatorMode,
        spectatorRewardJson: spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
      }),
    });

    setLoading(false);
    if (!res.ok) { toast.error("Fehler beim Erstellen der Eventreihe"); return; }
    const created = await res.json();
    toast.success(
      `Eventreihe „${seriesName}" erstellt` +
      (created.eventsCreated > 0 ? ` – ${created.eventsCreated} Termine angelegt` : "") + "!"
    );
    router.push(`/admin/series/${created.id}`);
  }

  // ── LUL helpers ──────────────────────────────────────────────────────────────
  const lulFormatObj = FORMATS.find(f => f.value === lulFormat);
  const lulHasStat   = lulFormatObj?.hasStat ?? false;

  const lulPreviewDates = useMemo(() => {
    if (!lulFirstDate) return [];
    const start = new Date(lulFirstDate);
    if (isNaN(start.getTime())) return [];
    if (lulRecurrence === "none") return [start];
    const dates: Date[] = [start];
    for (let i = 1; i < lulTotalSpieltage; i++) {
      dates.push(calcNextDate(dates[i - 1], lulRecurrence as RecurrenceType, lulMonthlyMode, start));
    }
    return dates;
  }, [lulFirstDate, lulRecurrence, lulMonthlyMode, lulTotalSpieltage]);

  const lulMonthlyDescriptions = useMemo(() => {
    if (!lulFirstDate || lulRecurrence !== "monthly") return null;
    try { return describeMonthlyModes(new Date(lulFirstDate)); } catch { return null; }
  }, [lulFirstDate, lulRecurrence]);

  function addLulPoll() {
    setLulPoints(p => ({ ...p, polls: [...p.polls, { statKey: "", label: "", points: 10 }] }));
  }
  function updateLulPoll(i: number, patch: Partial<LulPollDef>) {
    setLulPoints(p => ({ ...p, polls: p.polls.map((pl, idx) => idx === i ? { ...pl, ...patch } : pl) }));
  }
  function removeLulPoll(i: number) {
    setLulPoints(p => ({ ...p, polls: p.polls.filter((_, idx) => idx !== i) }));
  }

  function lulCanProceed(): boolean {
    if (step === 0) return lulSeasonName.trim().length > 0;
    return true;
  }

  async function handleSubmitLul() {
    if (!lulSeasonName.trim()) return;
    setLoading(true);

    // Nächste freie Saison-Nummer ermitteln
    const seasonsRes = await fetch("/api/lul/seasons");
    const existingSeasons = seasonsRes.ok ? (await seasonsRes.json() as { number: number }[]) : [];
    const maxNumber = existingSeasons.length > 0 ? Math.max(...existingSeasons.map(s => s.number)) : 0;

    const res = await fetch("/api/lul/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number:            maxNumber + 1,
        name:              lulSeasonName.trim(),
        period:            lulPeriod.trim() || null,
        totalSpieltage:    lulTotalSpieltage,
        pointsConfig:      lulPoints,
        firstSpieltagDate: lulFirstDate ? new Date(lulFirstDate).toISOString() : undefined,
        recurrenceType:    lulRecurrence !== "none" ? lulRecurrence : undefined,
        monthlyMode:       lulRecurrence === "monthly" ? lulMonthlyMode : undefined,
        spieltagTemplate:  {
          game:             lulGame || null,
          gameType:         lulGameType || null,
          platform:         lulPlatforms.length > 0 ? lulPlatforms.join(", ") : null,
          tournamentFormat: lulFormat || null,
          statFields:       lulHasStat ? lulStatFields : undefined,
          maxPlayers:       lulMaxPlayers ? Number(lulMaxPlayers) : undefined,
        },
      }),
    });

    setLoading(false);
    if (!res.ok) { toast.error("Fehler beim Erstellen der LUL-Saison"); return; }
    toast.success(`Level-UP-League Saison „${lulSeasonName}" erstellt!`);
    router.push("/admin/lul");
  }

  // ── Render: LUL Steps (eingebettet in Series-Flow) ────────────────────────────
  function renderLulSeasonInfo() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏆</span>
          <h2 className="text-base font-semibold text-white">Season-Info</h2>
        </div>
        <div>
          <label className={labelCls}>Saison-Name *</label>
          <input className={inputCls} style={inputStyle} placeholder="z.B. Saison 3" value={lulSeasonName}
            onChange={e => setLulSeasonName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Zeitraum (optional)</label>
          <input className={inputCls} style={inputStyle} placeholder="z.B. Juli 2026 – Januar 2027" value={lulPeriod}
            onChange={e => setLulPeriod(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Anzahl Spieltage</label>
          <input type="number" min={1} max={24} className={inputCls} style={inputStyle} value={lulTotalSpieltage}
            onChange={e => setLulTotalSpieltage(Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Erster Spieltag</label>
          <input type="datetime-local" className={inputCls} style={inputStyle} value={lulFirstDate}
            onChange={e => setLulFirstDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Wiederkehrendes Muster</label>
          <div className="grid grid-cols-2 gap-2">
            {RECURRENCE_OPTS.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setLulRecurrence(opt.value as "none" | RecurrenceType)}
                className={`rounded-xl px-3 py-2.5 text-left transition-all border text-xs ${
                  lulRecurrence === opt.value
                    ? "border-teal-500/60 bg-teal-500/15 text-teal-300"
                    : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                }`}>
                <p className="font-medium">{opt.label}</p>
                <p className="text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        {lulRecurrence === "monthly" && lulMonthlyDescriptions && (
          <div>
            <label className={labelCls}>Monatliches Muster</label>
            <div className="grid grid-cols-1 gap-2">
              {(["dayOfMonth", "weekdayOfMonth"] as MonthlyMode[]).map(mode => (
                <button key={mode} type="button" onClick={() => setLulMonthlyMode(mode)}
                  className={`rounded-xl px-3 py-2 text-left text-xs border transition-all ${
                    lulMonthlyMode === mode
                      ? "border-teal-500/60 bg-teal-500/15 text-teal-300"
                      : "border-white/10 bg-white/5 text-gray-400"
                  }`}>
                  {lulMonthlyDescriptions[mode]}
                </button>
              ))}
            </div>
          </div>
        )}
        {lulPreviewDates.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.12)" }}>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Vorschau Spieltage</p>
            <div className="space-y-1">
              {lulPreviewDates.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-teal-400 font-mono w-4">{i + 1}.</span>
                  <span className="text-gray-300">{d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              ))}
              {lulPreviewDates.length > 5 && <p className="text-xs text-gray-600">… und {lulPreviewDates.length - 5} weitere</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderLulTemplate() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎮</span>
          <h2 className="text-base font-semibold text-white">Spieltag-Template</h2>
        </div>
        <p className="text-xs text-gray-500">Vorlage für alle auto-generierten Spieltage. Später einzeln anpassbar. Spiel und Format können auch leer gelassen werden.</p>
        <div>
          <label className={labelCls}>Spiel (optional)</label>
          <GameNameInput value={lulGame} onChange={v => { setLulGame(v); if (!v) { setLulGenre(null); setLulFormat(""); } }} placeholder="z.B. Brawlhalla" />
        </div>
        {lulGame && (
          <div>
            <label className={labelCls}>Genre</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GENRES.map(g => (
                <button key={g.value} type="button" onClick={() => setLulGenre(lulGenre === g.value ? null : g.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                    lulGenre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}>
                  <Image src={g.icon} alt={g.label} width={28} height={28} className="object-contain" />
                  <span className={`text-[10px] font-medium leading-tight text-center ${lulGenre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={labelCls}>Plattform</label>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => {
              const active = lulPlatforms.includes(p.value);
              return (
                <button key={p.value} type="button"
                  onClick={() => setLulPlatforms(prev => active ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition-all ${
                    active ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                  }`}>
                  <span>{p.icon}</span> {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Spieltyp (optional)</label>
            <input className={inputCls} style={inputStyle} placeholder="z.B. Beat-em Up" value={lulGameType}
              onChange={e => setLulGameType(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Max. Spieler</label>
            <input type="number" min={2} className={inputCls} style={inputStyle} placeholder="z.B. 8" value={lulMaxPlayers}
              onChange={e => setLulMaxPlayers(e.target.value)} />
          </div>
        </div>
        {lulGame && (
          <div>
            <label className={labelCls}>Turnierformat</label>
            <div className="space-y-1.5">
              {[{ value: "", label: "Noch nicht festgelegt", desc: "Kann später pro Spieltag eingestellt werden", hasStat: false }, ...FORMATS].map(f => (
                <button key={f.value} type="button" onClick={() => setLulFormat(f.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left flex items-start gap-3 border text-xs transition-all ${
                    lulFormat === f.value ? "border-teal-500/60 bg-teal-500/15" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex-shrink-0 ${lulFormat === f.value ? "border-teal-400 bg-teal-400" : "border-gray-600"}`} />
                  <div>
                    <p className={`font-medium ${lulFormat === f.value ? "text-teal-300" : "text-gray-300"}`}>{f.label}</p>
                    <p className="text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {lulHasStat && (
          <div>
            <label className={labelCls}>Stat-Felder</label>
            <StatFieldEditor fields={lulStatFields} onChange={setLulStatFields} />
          </div>
        )}
      </div>
    );
  }

  function renderLulPoints() {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">⚡</span>
          <h2 className="text-base font-semibold text-white">Punktesystem</h2>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Basisteilnahme</p>
          <div className="space-y-3">
            {([
              { key: "game",       label: "Teilnahme Mitspieler" },
              { key: "spectator",  label: "Teilnahme Zuschauer" },
              { key: "gameWinner", label: "Spieltag-Sieg" },
              { key: "vote",       label: "Voting-Teilnahme" },
              { key: "dominion",   label: "Dominion-Bonus (3× Siege in Folge)" },
            ] as { key: keyof Omit<LulPointsConfig, "dominionTriggers" | "polls">, label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-300 flex-1">{label}</span>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={999}
                    className="w-20 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none"
                    style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.18)" }}
                    value={lulPoints[key] as number}
                    onChange={e => setLulPoints(p => ({ ...p, [key]: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-gray-500 w-6">Pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Dominion-Bonus zählt bei</p>
          <p className="text-xs text-gray-600 mb-3">Welche Erfolge zählen als "Sieg" für den 3er-Streak?</p>
          <div className="space-y-1.5">
            {[
              { key: "gameWinner", label: "Spieltag-Sieg (Mitspieler)" },
              ...lulPoints.polls.filter(p => p.statKey).map(p => ({ key: p.statKey, label: p.label || p.statKey })),
            ].map(({ key, label }) => {
              const checked = lulPoints.dominionTriggers.includes(key);
              return (
                <button key={key} type="button"
                  onClick={() => setLulPoints(p => ({
                    ...p,
                    dominionTriggers: checked ? p.dominionTriggers.filter(t => t !== key) : [...p.dominionTriggers, key],
                  }))}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 border text-xs text-left transition-all ${
                    checked ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-white/10 bg-white/5 text-gray-400"
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${checked ? "border-teal-400 bg-teal-500" : "border-gray-600"}`}>
                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Umfrage-Preise</p>
            <button type="button" onClick={addLulPoll}
              className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Hinzufügen
            </button>
          </div>
          <div className="space-y-3">
            {lulPoints.polls.map((poll, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.12)" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Anzeigename</label>
                      <input className={inputCls} style={inputStyle} placeholder="Community Champ" value={poll.label}
                        onChange={e => updateLulPoll(i, { label: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Stat-Key (technisch)</label>
                      <input className={inputCls} style={inputStyle} placeholder="communityChamp" value={poll.statKey}
                        onChange={e => updateLulPoll(i, { statKey: e.target.value.replace(/\s/g, "") })} />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeLulPoll(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors mt-4 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className={labelCls}>Punkte für Gewinner</label>
                  <input type="number" min={0} className={inputCls} style={inputStyle} value={poll.points}
                    onChange={e => updateLulPoll(i, { points: Number(e.target.value) })} />
                </div>
              </div>
            ))}
            {lulPoints.polls.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">Keine Umfrage-Preise konfiguriert</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderLulSummary() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">✅</span>
          <h2 className="text-base font-semibold text-white">Zusammenfassung</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-500">Saison-Name</span>
            <span className="text-white font-medium">{lulSeasonName}</span>
          </div>
          {lulPeriod && (
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Zeitraum</span>
              <span className="text-white">{lulPeriod}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-500">Spieltage</span>
            <span className="text-white">{lulTotalSpieltage}</span>
          </div>
          {lulGame && (
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Spiel</span>
              <span className="text-white">{lulGame}{lulGenre ? ` · ${GENRES.find(g => g.value === lulGenre)?.label}` : ""}</span>
            </div>
          )}
          {lulPlatforms.length > 0 && (
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Plattform</span>
              <span className="text-white">{lulPlatforms.join(", ")}</span>
            </div>
          )}
          {lulFormat && (
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Format</span>
              <span className="text-white">{FORMATS.find(f => f.value === lulFormat)?.label}</span>
            </div>
          )}
          {[
            { label: "Mitspieler-Teilnahme", pts: lulPoints.game },
            { label: "Zuschauer-Teilnahme",  pts: lulPoints.spectator },
            { label: "Spieltag-Sieg",        pts: lulPoints.gameWinner },
            { label: "Voting-Teilnahme",      pts: lulPoints.vote },
            { label: "Dominion-Bonus",        pts: lulPoints.dominion },
            ...lulPoints.polls.map(p => ({ label: p.label || p.statKey, pts: p.points })),
          ].map(({ label, pts }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">{label}</span>
              <span className="text-teal-400 font-mono">{pts} Pts</span>
            </div>
          ))}
          {lulPreviewDates.length > 0 && (
            <div className="mt-2 rounded-xl p-3" style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.12)" }}>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Generierte Spieltage</p>
              <div className="space-y-1">
                {lulPreviewDates.slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-teal-400 font-mono w-4">{i + 1}.</span>
                    <span className="text-gray-300">{d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                ))}
                {lulPreviewDates.length > 8 && <p className="text-xs text-gray-600">… und {lulPreviewDates.length - 8} weitere</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Mode Selection ───────────────────────────────────────────────────
  if (wizardMode === "select") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Neues Event erstellen</h1>
          <p className="text-sm text-gray-500">Wähle, was du erstellen möchtest.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button type="button" onClick={() => setWizardMode("event")}
            className="flex flex-col items-center gap-3 rounded-2xl p-6 border-2 border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 transition-all text-center">
            <span className="text-4xl">📅</span>
            <div>
              <p className="text-base font-semibold text-teal-300">Einzelnes Event</p>
              <p className="text-xs text-gray-500 mt-1">Einmaliger Termin, optional einer bestehenden Reihe zuordnen</p>
            </div>
          </button>
          <button type="button" onClick={() => setWizardMode("series")}
            className="flex flex-col items-center gap-3 rounded-2xl p-6 border-2 border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 transition-all text-center">
            <span className="text-4xl">🔁</span>
            <div>
              <p className="text-base font-semibold text-violet-300">Neue Eventreihe</p>
              <p className="text-xs text-gray-500 mt-1">Wiederkehrende Reihe mit Gesamttabelle und gemeinsamen Belohnungen</p>
            </div>
          </button>

        </div>
      </div>
    );
  }

  // ── Render: Step Indicator ────────────────────────────────────────────────────
  function StepIndicator() {
    const base = isEventMode ? STEP_LABELS_EVENT : isLulMode ? STEP_LABELS_LUL : STEP_LABELS_SERIES;
    const labels = isEventMode && eventType !== "tournament"
      ? base.filter((_, i) => i !== 2)
      : base;
    return (
      <div className="flex items-center gap-1 mb-8 flex-wrap">
        {labels.map((label, i) => {
          const active = i === step;
          const done   = i < step;
          return (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 ${active || done ? "" : "opacity-40"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done   ? "bg-teal-500 text-white"
                  : active ? "bg-teal-500/20 border-2 border-teal-500 text-teal-400"
                  : "bg-white/5 border border-white/10 text-gray-500"
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  active ? "text-teal-300" : done ? "text-gray-400" : "text-gray-600"
                }`}>{label}</span>
              </div>
              {i < labels.length - 1 && (
                <div className={`h-px mx-0.5 ${i < step ? "bg-teal-500/50" : "bg-white/8"}`} style={{ width: 14 }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Step 0: Kategorie (shared) ────────────────────────────────────────────────
  function renderStepCategory() {
    const showSpectatorToggle = category === "competitive" || eventType === "tournament";
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Kategorie</h2>
          <p className="text-xs text-gray-500 mb-4">Was erwartet die Community bei diesem Event?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-all ${
                  category === cat.value ? `${cat.border} ${cat.bg}` : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <span className="text-2xl">{cat.emoji}</span>
                <span className={`text-sm font-semibold ${category === cat.value ? cat.color : "text-gray-400"}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white mb-3">
            {isSeriesMode ? "Typ der Events in der Reihe" : "Event-Typ"}
          </h2>
          <div className={`grid gap-3 ${isSeriesMode ? "grid-cols-1 sm:grid-cols-3" : "flex"}`}>
            {(["community", "tournament"] as const).map(t => (
              <button key={t} type="button" onClick={() => setEventType(t)}
                className={`flex-1 rounded-xl py-3 px-4 text-sm font-medium border-2 transition-all ${
                  eventType === t
                    ? "border-teal-500/60 bg-teal-500/10 text-teal-300"
                    : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                }`}>
                {t === "community" ? "🤝 Community-Event" : "⚔️ Turnier"}
              </button>
            ))}
            {isSeriesMode && (
              <button type="button" onClick={() => setEventType("lul")}
                className={`flex-1 rounded-xl py-3 px-4 text-sm font-medium border-2 transition-all ${
                  eventType === "lul"
                    ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-300"
                    : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                }`}>
                🏆 Level-UP-League
              </button>
            )}
          </div>
          {isSeriesMode && eventType === "lul" && (
            <p className="text-xs text-yellow-500/70 mt-2">
              Erstellt eine neue LUL-Saison mit flexiblem Punktesystem, In-App-Voting und automatischer Spieltag-Generierung.
            </p>
          )}
        </div>

        {showSpectatorToggle && (
          <div className="rounded-xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={() => setSpectatorMode(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${spectatorMode ? "bg-teal-500" : "bg-gray-700"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${spectatorMode ? "translate-x-5" : ""}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {isSeriesMode ? "Zuschauer-Registrierung (Standard für neue Events)" : "Zuschauer-Registrierung aktivieren"}
                </p>
                <p className="text-xs text-gray-500">Community-Mitglieder können sich als Zuschauer anmelden</p>
              </div>
            </label>
          </div>
        )}
      </div>
    );
  }

  // ── Step 1 (Event): Grunddaten ────────────────────────────────────────────────
  function renderStepEventData() {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Titel *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="z.B. OMA Turnier Night" className={inputCls} style={inputStyle} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Datum & Uhrzeit *</label>
            <input type="datetime-local" required value={startAt} onChange={e => setStartAt(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls}>Max. Spieler</label>
            <input type="number" min="2" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
              placeholder="unbegrenzt" className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Spiel</label>
          <GameNameInput value={game} onChange={setGame}
            placeholder="z.B. Rocket League, R6 Siege …" className={inputCls} style={inputStyle} />
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
                  <Image src={g.icon} alt={g.label} width={32} height={32} className="object-contain" />
                  <span className={`text-[10px] font-medium leading-tight text-center ${genre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Plattform</label>
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
        </div>

        <div>
          <label className={labelCls}>Beschreibung (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="Wird in Discord angezeigt"
            className={`${inputCls} resize-none`} style={inputStyle} />
        </div>

        <div>
          <label className={labelCls}>Discord-Textkanal ID (optional)</label>
          <input type="text" value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
            placeholder="Leer = Standardkanal" className={inputCls} style={inputStyle} />
        </div>

        <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.10)" }}>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Eventreihe</p>
          <div className="flex gap-2 flex-wrap">
            {(["none", "existing", "new"] as const).map(m => (
              <button key={m} type="button" onClick={() => setSeriesMode(m)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={seriesMode === m
                  ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                  : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                {m === "none" ? "Einzelevent" : m === "existing" ? "Bestehende Reihe" : "Neue Reihe"}
              </button>
            ))}
          </div>
          {seriesMode === "existing" && (
            <select value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}
              className={inputCls} style={inputStyle}>
              <option value="">– Reihe auswählen –</option>
              {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s._count.events} Events)</option>)}
            </select>
          )}
          {seriesMode === "new" && (
            <div className="space-y-2">
              <input type="text" value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)}
                placeholder="Name der Reihe" className={inputCls} style={inputStyle} />
              <input type="text" value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)}
                placeholder="Kurze Beschreibung (optional)" className={inputCls} style={inputStyle} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 2 (Event): Turnier ───────────────────────────────────────────────────
  function renderStepTournament() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Format</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMATS.map(f => (
              <button key={f.value} type="button" onClick={() => setFormat(f.value)}
                className={`flex flex-col items-start gap-1 rounded-xl p-3 border-2 transition-all text-left ${
                  format === f.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <span className={`text-sm font-semibold ${format === f.value ? "text-amber-300" : "text-gray-300"}`}>{f.label}</span>
                <span className="text-xs text-gray-500">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {hasStat && (
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm font-medium text-amber-300 mb-3">Stat-Felder</p>
            <StatFieldEditor fields={statFields} onChange={setStatFields} />
          </div>
        )}

        {format === "liga" && (
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm font-medium text-amber-300 mb-3">Liga-Belohnungen</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Münzen pro Sieg</label>
                <input type="number" min="0" value={ligaWinCoins} onChange={e => setLigaWinCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Münzen pro Unentschieden</label>
                <input type="number" min="0" value={ligaDrawCoins} onChange={e => setLigaDrawCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step 1 (Series): Reihen-Grunddaten ───────────────────────────────────────
  function renderStepSeriesData() {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Name der Reihe *</label>
          <input type="text" required value={seriesName} onChange={e => setSeriesName(e.target.value)}
            placeholder="z.B. Friday Fights" className={inputCls} style={inputStyle} />
        </div>

        <div>
          <label className={labelCls}>Beschreibung (optional)</label>
          <textarea value={seriesDesc} onChange={e => setSeriesDesc(e.target.value)}
            rows={2} placeholder="Kurze Beschreibung der Reihe"
            className={`${inputCls} resize-none`} style={inputStyle} />
        </div>

        <div>
          <label className={labelCls}>Spiel</label>
          <div className="flex gap-2 mb-2">
            {([false, true] as const).map(v => (
              <button key={String(v)} type="button"
                onClick={() => { setVariousGames(v); if (v) { setFixedGame(""); setFixedGenre(null); } }}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
                  variousGames === v
                    ? "border-teal-500/60 bg-teal-500/10 text-teal-300"
                    : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                }`}>
                {v ? "🎲 Verschiedene Spiele" : "🎮 Festes Spiel"}
              </button>
            ))}
          </div>
          {!variousGames && (
            <GameNameInput value={fixedGame} onChange={setFixedGame}
              placeholder="z.B. Rocket League" className={inputCls} style={inputStyle} />
          )}
          {variousGames && (
            <p className="text-[11px] text-gray-500 px-1">
              Jedes Event kann ein eigenes Spiel und Format haben. Format-Vorlage für die Reihe entfällt.
            </p>
          )}
        </div>

        {!variousGames && fixedGame && (
          <div>
            <label className={labelCls}>Genre</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GENRES.map(g => (
                <button key={g.value} type="button" onClick={() => setFixedGenre(fixedGenre === g.value ? null : g.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                    fixedGenre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}>
                  <Image src={g.icon} alt={g.label} width={32} height={32} className="object-contain" />
                  <span className={`text-[10px] font-medium leading-tight text-center ${fixedGenre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Plattform</label>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => {
              const active = fixedPlatforms.includes(p.value);
              return (
                <button key={p.value} type="button"
                  onClick={() => setFixedPlatforms(prev => active ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition-all ${
                    active ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                  }`}>
                  <span>{p.icon}</span> {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>Discord-Textkanal ID (optional)</label>
          <input type="text" value={seriesDiscordId} onChange={e => setSeriesDiscordId(e.target.value)}
            placeholder="Leer = Standardkanal" className={inputCls} style={inputStyle} />
        </div>

        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={seriesHidden} onChange={e => setSeriesHidden(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-violet-500 shrink-0" />
            <div>
              <p className="text-sm text-gray-200">Unsichtbar erstellen</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Die Reihe wird angelegt, aber noch nicht veröffentlicht. Sichtbarkeit kann jederzeit in den Reihen-Einstellungen geändert werden.
              </p>
            </div>
          </label>
        </div>
      </div>
    );
  }

  // ── Step 2 (Series): Termine & Wiederholung ───────────────────────────────────
  function renderStepSchedule() {
    return (
      <div className="space-y-5">
        {eventType === "tournament" && !variousGames && (
          <div>
            <h2 className="text-base font-semibold text-white mb-1">Format</h2>
            <p className="text-xs text-gray-500 mb-3">Standard-Format für alle Events dieser Reihe</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FORMATS.map(f => (
                <button key={f.value} type="button" onClick={() => setSeriesFormat(f.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl p-3 border-2 transition-all text-left ${
                    seriesFormat === f.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}>
                  <span className={`text-sm font-semibold ${seriesFormat === f.value ? "text-amber-300" : "text-gray-300"}`}>{f.label}</span>
                  <span className="text-xs text-gray-500">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {eventType === "tournament" && variousGames && (
          <div className="rounded-xl px-4 py-3 border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-400">⚠️ Format wird pro Event einzeln festgelegt, da verschiedene Spiele ausgewählt sind.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Startdatum (optional)</label>
            <input type="datetime-local" value={seriesStartDate} onChange={e => setSeriesStartDate(e.target.value)}
              className={inputCls} style={inputStyle} />
            <p className="text-[10px] text-gray-600 mt-1">Datum des ersten Events</p>
          </div>
          <div>
            <label className={labelCls}>Enddatum (optional)</label>
            <input type="date" value={seriesEndDate} onChange={e => setSeriesEndDate(e.target.value)}
              className={inputCls} style={inputStyle} />
            <p className="text-[10px] text-gray-600 mt-1">Alle Termine bis hierhin werden direkt erstellt</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Wiederholung</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RECURRENCE_OPTS.map(r => (
              <button key={r.value} type="button"
                onClick={() => setRecurrenceType(r.value as "none" | RecurrenceType)}
                className={`flex flex-col items-start gap-0.5 rounded-xl p-3 border-2 transition-all text-left ${
                  recurrenceType === r.value
                    ? "border-teal-500/60 bg-teal-500/10"
                    : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <span className={`text-sm font-semibold ${recurrenceType === r.value ? "text-teal-300" : "text-gray-300"}`}>{r.label}</span>
                <span className="text-[10px] text-gray-500">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {recurrenceType === "monthly" && monthlyDescriptions && (
          <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-3">
            <p className="text-sm font-medium text-teal-300">Monatlicher Rhythmus</p>
            <p className="text-xs text-gray-500">Aus dem Startdatum erkannte Optionen:</p>
            <div className="space-y-2">
              {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="monthlyMode" value={mode}
                    checked={recurrenceMonthlyMode === mode}
                    onChange={() => setRecurrenceMonthlyMode(mode)}
                    className="accent-teal-500" />
                  <span className="text-sm text-gray-200">{monthlyDescriptions[mode]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {previewDates.length > 0 && (
          <div className="rounded-xl p-4 border border-white/8 bg-white/2">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-teal-400" />
              <p className="text-sm font-medium text-gray-200">
                {seriesEndDate
                  ? `${previewDates.length} Termine werden erstellt`
                  : `Vorschau (nächste ${previewDates.length})`}
              </p>
              {!seriesEndDate && recurrenceType !== "none" && (
                <span className="text-[10px] text-gray-600 ml-auto">ohne Enddatum: nur Reihe, keine Events</span>
              )}
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {previewDates.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-teal-500 text-xs w-5 text-right shrink-0">#{i + 1}</span>
                  <span>{d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!seriesStartDate && (
          <p className="text-xs text-gray-600 italic">
            Ohne Startdatum wird nur die Reihe angelegt. Termine können später einzeln hinzugefügt werden.
          </p>
        )}
      </div>
    );
  }

  // ── Step 3: Belohnungen (shared, with stat config for series tournament) ──────
  function renderStepRewards() {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <div className="flex items-center gap-2 mb-3">
            <Image src="/Muenze Icon.png" alt="Münzen" width={20} height={20} />
            <p className="text-sm font-medium text-gray-200">Teilnahme-Belohnung</p>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">Wird erst nach Event-Abschluss vergeben</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Münzen</label>
              <input type="number" min="0" value={participationCoins}
                onChange={e => setParticipationCoins(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Rang-Punkte <span className="text-gray-500 font-normal">(→ Gesamtrangliste)</span></label>
              <input type="number" min="0" value={participationRankPts}
                onChange={e => setParticipationRankPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <p className="text-sm font-medium text-gray-200 mb-3">Platzierungs-Belohnungen</p>
          <div className="space-y-2">
            {placements.map((p, i) => (
              <div key={p.place} className="flex items-center gap-3">
                <span className="text-sm w-5 shrink-0">{["🥇","🥈","🥉"][i]}</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Münzen</label>
                    <input type="number" min="0" value={p.coins}
                      onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, coins: Number(e.target.value) } : pp))}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Rang-Punkte</label>
                    <input type="number" min="0" value={p.rankPoints}
                      onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, rankPoints: Number(e.target.value) } : pp))}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {spectatorMode && (
          <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5">
            <p className="text-sm font-medium text-teal-300 mb-3">👁️ Zuschauer-Basis-Belohnung</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Münzen</label>
                <input type="number" min="0" value={spectatorCoins}
                  onChange={e => setSpectatorCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Rang-Punkte <span className="text-gray-500 font-normal">(→ Gesamtrangliste)</span></label>
                <input type="number" min="0" value={spectatorRankPts}
                  onChange={e => setSpectatorRankPts(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {isSeriesMode && (eventType === "tournament" || spectatorMode) && (
          <div className="rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5 space-y-3">
            <p className="text-sm font-medium text-indigo-300">📊 Gesamttabelle</p>
            <div>
              <label className={labelCls}>Punkte pro Mitspieler-Teilnahme <span className="text-gray-500 font-normal">(Ligatabelle)</span></label>
              <input type="number" min="0" value={statParticipationPts}
                onChange={e => setStatParticipationPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            {spectatorMode && (
              <div>
                <label className={labelCls}>Punkte pro Zuschauer-Teilnahme <span className="text-gray-500 font-normal">(Ligatabelle)</span></label>
                <input type="number" min="0" value={statSpectatorParticipationPts}
                  onChange={e => setStatSpectatorParticipationPts(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={statPtsToGlobalRanking}
                onChange={e => setStatPtsToGlobalRanking(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500" />
              <span className="text-xs text-gray-300">Tabellenpunkte bei Event-Abschluss auf Gesamtrangliste übertragen</span>
            </label>
            <div className="space-y-2">
              <p className="text-[11px] text-gray-500">Stat-Felder — Feldname → Punkte pro Einheit — 🏆 = +1 bei Event-Sieg</p>
              {statRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={row.field}
                    onChange={e => setStatRows(prev => prev.map((r, ri) => ri === i ? { ...r, field: e.target.value } : r))}
                    placeholder="z.B. Kills" className={`${inputCls} flex-1`} style={inputStyle} />
                  <input type="number" min="0" value={row.pointsPer}
                    onChange={e => setStatRows(prev => prev.map((r, ri) => ri === i ? { ...r, pointsPer: Number(e.target.value) } : r))}
                    placeholder="Pkt" className="w-16 rounded-xl px-2.5 py-2.5 text-sm text-white text-center outline-none shrink-0"
                    style={inputStyle} />
                  <button type="button"
                    title="Dieser Stat bekommt +1 wenn ein Spieler ein Event in dieser Reihe gewinnt"
                    onClick={() => setStatRows(prev => prev.map((r, ri) => ri === i ? { ...r, isWinnerStat: !r.isWinnerStat } : r))}
                    className={`shrink-0 text-base transition-colors ${row.isWinnerStat ? "opacity-100" : "opacity-30 hover:opacity-60"}`}>
                    🏆
                  </button>
                  <button type="button" onClick={() => setStatRows(prev => prev.filter((_, ri) => ri !== i))}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setStatRows(prev => [...prev, { field: "", pointsPer: 0 }])}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" /> Stat hinzufügen
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-200">Umfragen</p>
            {polls.length < 5 && (
              <button type="button" onClick={addPoll}
                className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Hinzufügen
              </button>
            )}
          </div>
          {polls.length === 0 && <p className="text-xs text-gray-600">Keine Umfragen konfiguriert.</p>}
          <div className="space-y-3">
            {polls.map((poll, i) => (
              <div key={i} className="rounded-xl p-4 border border-violet-500/20 bg-violet-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-violet-300">Umfrage {i + 1}</p>
                  <button type="button" onClick={() => removePoll(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Label (z.B. MVP)</label>
                    <input type="text" value={poll.label} onChange={e => updatePoll(i, { label: e.target.value })}
                      placeholder="MVP" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Frage</label>
                    <input type="text" value={poll.question} onChange={e => updatePoll(i, { question: e.target.value })}
                      placeholder="Wer war der MVP?" className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Wer darf abstimmen?</label>
                    <select value={poll.voterEligibility} onChange={e => updatePoll(i, { voterEligibility: e.target.value as PollConfig["voterEligibility"] })}
                      className={inputCls} style={inputStyle}>
                      <option value="all">Alle App-Mitglieder</option>
                      <option value="participants">Mitspieler + Zuschauer</option>
                      <option value="players">Nur Mitspieler</option>
                      <option value="spectators">Nur Zuschauer</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Antwortoptionen</label>
                    <select value={poll.answerType} onChange={e => updatePoll(i, { answerType: e.target.value as PollConfig["answerType"], customAnswers: [] })}
                      className={inputCls} style={inputStyle}>
                      <option value="players">Mitspieler des Events</option>
                      <option value="spectators">Zuschauer des Events</option>
                      <option value="custom">Eigene Antworten</option>
                    </select>
                  </div>
                </div>
                {poll.answerType === "custom" && (
                  <div>
                    <label className={labelCls}>Antworten (eine pro Zeile)</label>
                    <textarea rows={3}
                      value={poll.customAnswers.join("\n")}
                      onChange={e => updatePoll(i, { customAnswers: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                      placeholder={"Option A\nOption B\nOption C"}
                      className={`${inputCls} resize-none`} style={inputStyle} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Start (Std. nach Event-Start)</label>
                    <input type="number" min="0" value={poll.startOffsetHours}
                      onChange={e => updatePoll(i, { startOffsetHours: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Ende (Std. nach Event-Start)</label>
                    <input type="number" min="1" value={poll.endOffsetHours}
                      onChange={e => updatePoll(i, { endOffsetHours: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Belohnung Abstimmung — Münzen</label>
                    <input type="number" min="0" value={poll.participationCoins}
                      onChange={e => updatePoll(i, { participationCoins: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Belohnung Abstimmung — Ligapunkte</label>
                    <input type="number" min="0" value={poll.participationSeriesPoints}
                      onChange={e => updatePoll(i, { participationSeriesPoints: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Sieger-Belohnung — Münzen</label>
                    <input type="number" min="0" value={poll.winnerCoins}
                      onChange={e => updatePoll(i, { winnerCoins: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Sieger-Belohnung — Ligapunkte</label>
                    <input type="number" min="0" value={poll.winnerRankPoints}
                      onChange={e => updatePoll(i, { winnerRankPoints: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4 (Series): Event-Einstellungen ─────────────────────────────────────
  function renderStepSeriesEventSettings() {
    const winnerStatKeys = statRows.filter(r => r.isWinnerStat).map(r => r.field);
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📋</span>
            <h2 className="text-base font-semibold text-white">Event-Einstellungen</h2>
          </div>
          <p className="text-xs text-gray-500">
            Vorlage für die einzelnen Events dieser Reihe. Diese Einstellungen werden beim Anlegen
            neuer Events und beim Abschluss automatisch vorausgefüllt.
          </p>
        </div>

        {variousGames && (
          <div className="rounded-xl px-4 py-3 border border-blue-500/20 bg-blue-500/5">
            <p className="text-xs text-blue-300">
              Bei verschiedenen Spielen wird die Sieger-Ermittlung pro Event konfiguriert.
              Stat-Tracking und Sieger-Ermittlung entfallen als Vorlage.
            </p>
          </div>
        )}

        {!variousGames && (
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm font-medium text-amber-300 mb-1">Trackte Statistiken je Event</p>
            <p className="text-[11px] text-gray-500 mb-3">
              Diese Stats werden pro Event erfasst. „Teilnahme" wird für jeden Mitspieler automatisch +1 getrackt.
            </p>
            <StatFieldEditor fields={eventStatFields} onChange={f => {
              setEventStatFields(f);
              setAggregatedStatFields(prev => prev.filter(s => f.includes(s)));
              if (!f.includes(winnerStatField)) setWinnerStatField("");
            }} />
          </div>
        )}

        {!variousGames && eventStatFields.length > 0 && (
          <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5 space-y-3">
            <p className="text-sm font-medium text-teal-300">🏆 Sieger-Ermittlung</p>
            <p className="text-[11px] text-gray-500">
              Welcher Stat bestimmt den Sieger eines Events? Der Spieler mit dem höchsten Wert gewinnt.
            </p>
            <div>
              <label className={labelCls}>Sieger-Stat</label>
              <select value={winnerStatField} onChange={e => setWinnerStatField(e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">– Kein / manuell festlegen –</option>
                {eventStatFields.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {winnerStatField && winnerStatKeys.length === 0 && (
              <p className="text-[11px] text-amber-500/80 rounded-lg px-3 py-2 border border-amber-500/20 bg-amber-500/5">
                Markiere in Schritt 4 einen Reihen-Stat mit 🏆, um +1 für den Event-Sieger zu tracken.
              </p>
            )}
            {winnerStatKeys.length > 0 && (
              <p className="text-[10px] text-teal-600 mt-1">
                Reihen-Stats bei Event-Sieg +1: {winnerStatKeys.join(", ")}
              </p>
            )}
          </div>
        )}

        {!variousGames && eventStatFields.length > 0 && (
          <div className="rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5 space-y-3">
            <p className="text-sm font-medium text-indigo-300">📈 Summierte Reihen-Stats</p>
            <p className="text-[11px] text-gray-500">
              Diese Stats werden über alle Events hinweg aufsummiert und in die Gesamttabelle der Reihe eingetragen (z.B. Tore, Kills).
            </p>
            <div className="space-y-1.5">
              {eventStatFields.map(f => {
                const checked = aggregatedStatFields.includes(f);
                return (
                  <button key={f} type="button"
                    onClick={() => setAggregatedStatFields(prev =>
                      checked ? prev.filter(s => s !== f) : [...prev, f]
                    )}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 border text-xs text-left transition-all ${
                      checked ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300" : "border-white/10 bg-white/5 text-gray-400"
                    }`}>
                    <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${checked ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {f}
                  </button>
                );
              })}
            </div>
            {aggregatedStatFields.length === 0 && (
              <p className="text-[10px] text-gray-600">Keine Stats ausgewählt – nur Teilnahme und Siege werden getrackt.</p>
            )}
          </div>
        )}

        {/* Dominion Bonus */}
        <div className="rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-300">⚡ Dominion Bonus</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Bonus für Spieler, die eine Stat X-mal in Folge erreichen (z.B. 3× MVP hintereinander).
              </p>
            </div>
            <button type="button" onClick={() => setDominionEnabled(p => !p)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${dominionEnabled ? "bg-yellow-500" : "bg-gray-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${dominionEnabled ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          {dominionEnabled && (
            <div className="space-y-3 pt-1">
              <div>
                <label className={labelCls}>Trigger-Stat <span className="text-gray-600 font-normal">(was muss X-mal in Folge eintreten?)</span></label>
                {(() => {
                  const allTracked = [
                    "Teilnahmen",
                    ...(spectatorMode ? ["Zuschauer-Teilnahmen"] : []),
                    ...winnerStatKeys,
                    ...aggregatedStatFields,
                    ...polls.filter(p => p.label).map(p => p.label),
                  ].filter((v, i, a) => a.indexOf(v) === i);
                  return allTracked.length > 0 ? (
                    <select value={dominionTriggerStat} onChange={e => setDominionTriggerStat(e.target.value)}
                      className={inputCls} style={inputStyle}>
                      <option value="">– Bitte wählen –</option>
                      {allTracked.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  ) : (
                    <p className="text-[11px] text-amber-500/80 rounded-lg px-3 py-2 border border-amber-500/20 bg-amber-500/5">
                      Noch keine summierten Stats konfiguriert. Füge zuerst Stats (oben) oder Umfragen (Schritt 4) hinzu.
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className={labelCls}>Schwellenwert (wie viele Male in Folge?)</label>
                <input type="number" min="2" max="20" value={dominionThreshold}
                  onChange={e => setDominionThreshold(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Bonus — Münzen</label>
                  <input type="number" min="0" value={dominionCoins}
                    onChange={e => setDominionCoins(Number(e.target.value))}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Bonus — Ligapunkte</label>
                  <input type="number" min="0" value={dominionSeriesPoints}
                    onChange={e => setDominionSeriesPoints(Number(e.target.value))}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
              {dominionTriggerStat && (
                <p className="text-[10px] text-yellow-600">
                  Bei {dominionThreshold}× „{dominionTriggerStat}" in Folge: +{dominionSeriesPoints} Ligapunkte{dominionCoins > 0 ? ` + ${dominionCoins} Münzen` : ""}. Wird in der Ligatabelle als „Dominion Bonus" gezählt.
                </p>
              )}
            </div>
          )}
        </div>

        {!variousGames && eventStatFields.length === 0 && !dominionEnabled && (
          <p className="text-xs text-gray-600 italic">
            Ohne Stat-Felder werden keine Statistiken je Event getrackt. Du kannst dies auch später
            in den Reihen-Einstellungen konfigurieren.
          </p>
        )}
      </div>
    );
  }

  // ── Step 4 (Event): Zusammenfassung ───────────────────────────────────────────
  function renderStepEventSummary() {
    const catCfg  = CATEGORIES.find(c => c.value === category);
    const genreCfg = genre ? GENRES.find(g => g.value === genre) : null;
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{catCfg?.emoji}</span>
            <div>
              <p className={`text-lg font-bold ${catCfg?.color}`}>{title}</p>
              <p className="text-xs text-gray-500">{catCfg?.label} · {eventType === "tournament" ? "Turnier" : "Community-Event"}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            {startAt && <p>📅 {new Date(startAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>}
            {game && <p>🎮 {game}{genreCfg ? ` · ${genreCfg.label}` : ""}</p>}
            {maxPlayers && <p>👥 Max. {maxPlayers} Spieler</p>}
            {spectatorMode && <p>👁️ Zuschauer-Modus aktiv</p>}
            {eventType === "tournament" && <p>⚔️ Format: {FORMATS.find(f => f.value === format)?.label}</p>}
            {seriesMode === "existing" && selectedSeries && <p>🔁 Reihe: {selectedSeries.name}</p>}
            {seriesMode === "new" && newSeriesName && <p>🔁 Neue Reihe: {newSeriesName}</p>}
            {discordChannelId && <p>📢 Kanal: {discordChannelId}</p>}
          </div>
        </div>
        <div className="rounded-xl p-4 border border-white/8 bg-white/2 text-sm space-y-1.5 text-gray-400">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Belohnungen</p>
          <p>✅ Teilnahme: {participationCoins} Münzen{participationRankPts > 0 ? ` + ${participationRankPts} RP` : ""}</p>
          {placements.map(p => (
            <p key={p.place}>🏅 {p.place}. Platz: {p.coins} Münzen{p.rankPoints > 0 ? ` + ${p.rankPoints} RP` : ""}</p>
          ))}
          {spectatorMode && <p>👁️ Zuschauer: {spectatorCoins} Münzen{spectatorRankPts > 0 ? ` + ${spectatorRankPts} RP` : ""}</p>}
          {polls.map((poll, i) => (
            <p key={i}>📊 {poll.label || `Poll ${i + 1}`}: Abstimmung ({poll.winnerCoins > 0 ? `Sieger: ${poll.winnerCoins} Münzen` : ""})</p>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 4 (Series): Zusammenfassung ──────────────────────────────────────────
  function renderStepSeriesSummary() {
    const catCfg   = CATEGORIES.find(c => c.value === category);
    const genreCfg = fixedGenre ? GENRES.find(g => g.value === fixedGenre) : null;
    const recLabel = RECURRENCE_OPTS.find(r => r.value === recurrenceType)?.label ?? "Keine";
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔁</span>
            <span className="text-3xl">{catCfg?.emoji}</span>
            <div>
              <p className={`text-lg font-bold ${catCfg?.color}`}>{seriesName || "Eventreihe"}</p>
              <p className="text-xs text-gray-500">{catCfg?.label} · {eventType === "tournament" ? "Turnier-Reihe" : "Community-Reihe"}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            {fixedGame && <p>🎮 {fixedGame}{genreCfg ? ` · ${genreCfg.label}` : ""}</p>}
            {eventType === "tournament" && <p>⚔️ Format: {FORMATS.find(f => f.value === seriesFormat)?.label}</p>}
            <p>🔄 Wiederholung: {recLabel}</p>
            {seriesStartDate && <p>📅 Start: {new Date(seriesStartDate).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>}
            {seriesEndDate && <p>⏹️ Ende: {new Date(seriesEndDate).toLocaleDateString("de-DE", { dateStyle: "medium" })}</p>}
            {previewDates.length > 0 && seriesEndDate && (
              <p>📋 {previewDates.length} Termine werden direkt angelegt</p>
            )}
            {seriesDiscordId && <p>📢 Kanal: {seriesDiscordId}</p>}
            {spectatorMode && <p>👁️ Zuschauer-Standard aktiv</p>}
            {seriesHidden && <p className="text-violet-400">🔒 Unsichtbar – wird nicht veröffentlicht</p>}
          </div>
        </div>
        <div className="rounded-xl p-4 border border-white/8 bg-white/2 text-sm space-y-1.5 text-gray-400">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Standard-Belohnungen</p>
          <p>✅ Teilnahme: {participationCoins} Münzen{participationRankPts > 0 ? ` + ${participationRankPts} RP` : ""}</p>
          {placements.map(p => (
            <p key={p.place}>🏅 {p.place}. Platz: {p.coins} Münzen{p.rankPoints > 0 ? ` + ${p.rankPoints} RP` : ""}</p>
          ))}
          {spectatorMode && <p>👁️ Zuschauer: {spectatorCoins} Münzen{spectatorRankPts > 0 ? ` + ${spectatorRankPts} RP` : ""}</p>}
          {polls.map((poll, i) => (
            <p key={i}>📊 {poll.label || `Poll ${i + 1}`}: Abstimmung ({poll.winnerCoins > 0 ? `Sieger: ${poll.winnerCoins} Münzen` : ""})</p>
          ))}
          {isSeriesMode && eventType === "tournament" && statRows.length > 0 && (
            <p>📊 Gesamttabelle: {statRows.map(r => `${r.field} (${r.pointsPer} Pkt/Einheit)`).join(", ")}</p>
          )}
          {eventStatFields.length > 0 && (
            <p>📋 Event-Stats: {eventStatFields.join(", ")}</p>
          )}
          {aggregatedStatFields.length > 0 && (
            <p>📈 Summiert in Reihe: {aggregatedStatFields.join(", ")}</p>
          )}
          {winnerStatField && (
            <p>🏆 Sieger via: {winnerStatField}{statRows.filter(r => r.isWinnerStat && r.field).length > 0 ? ` → Reihenstat(s) „${statRows.filter(r => r.isWinnerStat && r.field).map(r => r.field).join(", ")}" +1` : ""}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  const CurrentStep = activeSteps[step];
  const isLastStep  = step === activeSteps.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button type="button"
          onClick={() => { setWizardMode("select"); setStep(0); }}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          Zurück zur Auswahl
        </button>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          {isSeriesMode
            ? <Repeat className="w-4 h-4 text-violet-400" />
            : <CalendarDays className="w-4 h-4 text-teal-400" />}
          <h1 className="text-xl font-bold text-white">
            {isSeriesMode ? "Neue Eventreihe" : "Neues Event"}
          </h1>
        </div>
      </div>

      <StepIndicator />

      <div className="rounded-2xl p-6 mb-6"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {CurrentStep()}
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Zurück
          </button>
        )}
        <button
          type="button"
          disabled={!canProceed() || loading}
          onClick={() => {
            if (!isLastStep) setStep(s => s + 1);
            else if (isEventMode) handleSubmitEvent();
            else handleSubmitSeries();
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{
            background: isSeriesMode
              ? "linear-gradient(135deg, #7c3aed, #8b5cf6)"
              : "linear-gradient(135deg, #0d9488, #14b8a6)",
          }}>
          {loading
            ? "Wird erstellt…"
            : isLastStep
            ? (<><Check className="w-4 h-4" /> {isSeriesMode ? "Eventreihe erstellen" : "Event erstellen"}</>)
            : (<>Weiter <ChevronRight className="w-4 h-4" /></>)}
        </button>
      </div>
    </div>
  );
}
