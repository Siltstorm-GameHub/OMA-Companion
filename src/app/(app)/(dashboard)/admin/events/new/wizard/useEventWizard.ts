// Zustand, abgeleitete Werte und Aktionen des Event-Wizards (aufgeteilt aus EventSetupWizard.tsx).
// Die Schritt-Komponenten unter ./steps bekommen dieses Objekt und lesen nur, was sie brauchen.
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EventCategory, EventGenre } from "@prisma/client";
import { describeMonthlyModes, calcNextDate } from "@/lib/recurrence";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";
import { GEMS_MONSTER_CATALOG } from "@/lib/gems/gems-monster-catalog";
import { fromDatetimeLocalBerlin } from "@/lib/time";
import { DEFAULT_CHECK_IN_MINUTES } from "@/lib/checkin";
import { clearDraft, useInitialDraft, writeDraft } from "./draft";
import { FORMATS, type EventTemplate, type SeriesOption, type SquadOption, type PollConfig, type PlacementReward, type StatRow, type SeasonPrefill } from "./shared";

export type EventWizardProps = {
  series: SeriesOption[];
  squads?: SquadOption[];
  /** true = Aufrufer ist ein reiner Squad-Captain (kein Moderator/Admin) — Event/Reihe muss auf eines
   *  der übergebenen (bereits auf die eigenen Squads gefilterten) squads beschränkt bleiben, "für alle
   *  offen" ist keine Option. */
  forceSquad?: boolean;
  /** Vorausgewähltes Squad (z.B. von der Squad-Seite aus "+ Neues Event" gestartet) — nur eine Vorbelegung,
   *  bleibt bei forceSquad=false änderbar. */
  initialSquadId?: string;
  initialMode?: "select" | "event" | "series";
  seasonPrefill?: SeasonPrefill;
  /** "Event duplizieren": Einstellungen eines bestehenden Events als Vorbelegung */
  eventTemplate?: EventTemplate;
};

export function useEventWizard({
  series,
  squads = [],
  forceSquad = false,
  initialSquadId,
  initialMode = "select",
  seasonPrefill,
  eventTemplate,
}: EventWizardProps) {
  const tpl = eventTemplate;
  const router = useRouter();
  const [wizardMode, setWizardMode] = useState<"select" | "event" | "series">(initialMode as "select" | "event" | "series");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Shared (Step 0) ──────────────────────────────────────────────────────────
  const [category, setCategory]       = useState<EventCategory>(seasonPrefill?.category ?? tpl?.category ?? "casual");
  const [eventType, setEventType]     = useState<"community" | "tournament">(seasonPrefill?.eventType ?? tpl?.eventType ?? "community");
  const [spectatorMode, setSpectatorMode] = useState(seasonPrefill?.spectatorMode ?? tpl?.spectatorMode ?? false);

  // ── Event mode state ─────────────────────────────────────────────────────────
  const [title, setTitle]             = useState(tpl?.title ?? "");
  const [startAt, setStartAt]         = useState(tpl?.startAt ?? "");
  // Generisches, optionales Event-Ende — für alle Event-Typen sichtbar, bei OMA-Gems-Turnieren
  // wie bisher genutzt (siehe isGemsTournament unten), schreibt aber auf Event.endAt.
  const [endAt, setEndAt]             = useState(tpl?.endAt ?? "");
  const [game, setGame]               = useState(tpl?.game ?? "");
  const [genre, setGenre]             = useState<EventGenre | null>(tpl?.genre ?? null);
  const [maxPlayers, setMaxPlayers]   = useState(tpl?.maxPlayers ?? "");
  const [description, setDescription] = useState(tpl?.description ?? "");
  const [discordChannelId, setDiscordChannelId] = useState(tpl?.discordChannelId ?? "");
  const [seriesMode, setSeriesMode]   = useState<"none" | "existing" | "new">(tpl?.seriesId && series.some(s => s.id === tpl.seriesId) ? "existing" : "none");
  const [selectedSeriesId, setSelectedSeriesId] = useState(tpl?.seriesId && series.some(s => s.id === tpl.seriesId) ? tpl.seriesId : "");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");
  const [format, setFormat]           = useState(tpl?.format ?? "single_elimination");
  const [statFields, setStatFields]   = useState<string[]>(tpl?.statFields ?? []);
  const [statPointsByField, setStatPointsByField] = useState<Record<string, number>>(tpl?.statPointsByField ?? {});
  // Veröffentlichung: sofort (sichtbar + angekündigt), unsichtbar, oder geplant zu publishAt
  const [publishMode, setPublishMode] = useState<"now" | "hidden" | "scheduled">("now");
  const [publishAt, setPublishAt]     = useState("");
  // Turnier-Optionen direkt im Wizard (vorher erst nachträglich im Reiter "Turnier")
  const [playHomeAway, setPlayHomeAway] = useState(tpl?.playHomeAway ?? false);
  const [pointsMode, setPointsMode]     = useState<"placement" | "matchResult">(tpl?.matchResultPoints ? "matchResult" : "placement");
  const [coinsWin, setCoinsWin]         = useState(tpl?.matchResultPoints?.win ?? 30);
  const [coinsDraw, setCoinsDraw]       = useState(tpl?.matchResultPoints?.draw ?? 10);
  const [checkInEnabled, setCheckInEnabled] = useState(tpl?.checkInEnabled ?? false);
  const [checkInMinutes, setCheckInMinutes] = useState(tpl?.checkInMinutes ?? DEFAULT_CHECK_IN_MINUTES);
  const [eventRegistrationLocked, setEventRegistrationLocked] = useState(tpl?.registrationLocked ?? false);
  const [eventSquadId, setEventSquadId] = useState(initialSquadId ?? (forceSquad ? (squads[0]?.id ?? "") : ""));

  // ── OMA-Gems-Turnier (nur bei game === "OMA Gems") ────────────────────────────
  const [gemsDifficulty, setGemsDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [gemsMaxAttempts, setGemsMaxAttempts] = useState("3");
  // Leer = weiterhin die bisherige zufällige Boss-Team-Auswahl (siehe generateGemsTournamentBossTeam).
  const [gemsMonsterIds, setGemsMonsterIds] = useState<string[]>([]);
  const [gemsMonsterPick, setGemsMonsterPick] = useState(GEMS_MONSTER_CATALOG[0]?.cardId ?? "");
  // Optionale Karten-Pack-Belohnung on top der Münzen/Rang-Punkte (siehe Schritt "Belohnungen").
  const [gemsParticipationPack, setGemsParticipationPack] = useState<"" | "STANDARD" | "PREMIUM" | "COMMUNITY">("");
  const [gemsPlacementPacks, setGemsPlacementPacks] = useState<("" | "STANDARD" | "PREMIUM" | "COMMUNITY")[]>(["", "", ""]);
  const isGemsTournament = game === "OMA Gems";

  // ── Series mode state ─────────────────────────────────────────────────────────
  const [seriesName, setSeriesName]     = useState(seasonPrefill?.name ?? "");
  const [seriesDesc, setSeriesDesc]     = useState(seasonPrefill?.description ?? "");
  const [variousGames, setVariousGames] = useState(seasonPrefill?.variousGames ?? false);
  const [fixedGame, setFixedGame]       = useState(seasonPrefill?.fixedGame ?? "");
  const [fixedGenre, setFixedGenre]     = useState<EventGenre | null>(seasonPrefill?.fixedGenre ?? null);
  const [fixedPlatforms, setFixedPlatforms] = useState<string[]>(seasonPrefill?.platforms ?? []);
  const [seriesDiscordId, setSeriesDiscordId] = useState(seasonPrefill?.seriesDiscordId ?? "");
  const [seriesFormat, setSeriesFormat] = useState(seasonPrefill?.seriesFormat ?? "single_elimination");
  // Start-/Enddatum werden nie vorausgefüllt — die alte Saison speichert kein eigenes Datum, das
  // muss der Admin für die neue Saison bewusst neu festlegen.
  const [seriesStartDate, setSeriesStartDate] = useState("");
  const [seriesEndDate, setSeriesEndDate]     = useState("");
  // Ende (Datum/Uhrzeit) des ERSTEN Termins — optional, ergibt die Dauer, die pro Serientermin
  // beibehalten wird (siehe calcNextDate durationMs in recurrence.ts). Nicht zu verwechseln mit
  // seriesEndDate (Kalendertag, bis zu dem die Serie überhaupt neue Termine generiert).
  const [seriesFirstEventEndAt, setSeriesFirstEventEndAt] = useState("");
  const [recurrenceType, setRecurrenceType]   = useState<"none" | RecurrenceType>(seasonPrefill?.recurrenceType ?? "none");
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<MonthlyMode>(seasonPrefill?.recurrenceMonthlyMode ?? "dayOfMonth");
  const [statParticipationPts, setStatParticipationPts] = useState(seasonPrefill?.statParticipationPts ?? 5);
  const [statSpectatorParticipationPts, setStatSpectatorParticipationPts] = useState(seasonPrefill?.statSpectatorParticipationPts ?? 3);
  const [statPtsToGlobalRanking, setStatPtsToGlobalRanking] = useState(seasonPrefill?.statPtsToGlobalRanking ?? false);
  const [statRows, setStatRows]         = useState<StatRow[]>(seasonPrefill?.statRows ?? []);
  const [seriesHidden, setSeriesHidden] = useState(seasonPrefill?.seriesHidden ?? false);
  const [seriesRegistrationLocked, setSeriesRegistrationLocked] = useState(seasonPrefill?.seriesRegistrationLocked ?? false);
  const [seriesSquadId, setSeriesSquadId] = useState(seasonPrefill?.seriesSquadId ?? initialSquadId ?? (forceSquad ? (squads[0]?.id ?? "") : ""));
  const [eventStatFields, setEventStatFields] = useState<string[]>(seasonPrefill?.eventStatFields ?? []);
  const [winnerStatField, setWinnerStatField] = useState(seasonPrefill?.winnerStatField ?? "");

  // ── Dominion Bonus ───────────────────────────────────────────────────────────
  const [dominionEnabled, setDominionEnabled]       = useState(seasonPrefill?.dominion.enabled ?? false);
  const [dominionTriggerStats, setDominionTriggerStats] = useState<string[]>(seasonPrefill?.dominion.triggerStats ?? []);
  const [dominionThreshold, setDominionThreshold]   = useState(seasonPrefill?.dominion.threshold ?? 3);
  const [dominionCoins, setDominionCoins]           = useState(seasonPrefill?.dominion.coins ?? 0);
  const [dominionSeriesPoints, setDominionSeriesPoints] = useState(seasonPrefill?.dominion.seriesPoints ?? 5);

  // ── Shared rewards ───────────────────────────────────────────────────────────
  const [participationCoins, setParticipationCoins] = useState(seasonPrefill?.participationCoins ?? tpl?.participationCoins ?? 10);
  const [participationRankPts, setParticipationRankPts] = useState(seasonPrefill?.participationRankPts ?? tpl?.participationRankPts ?? 0);
  const [placements, setPlacements] = useState<PlacementReward[]>(seasonPrefill?.placements ?? tpl?.placements ?? [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ]);
  const [spectatorCoins, setSpectatorCoins]     = useState(seasonPrefill?.spectatorCoins ?? tpl?.spectatorCoins ?? 5);
  const [spectatorRankPts, setSpectatorRankPts] = useState(seasonPrefill?.spectatorRankPts ?? tpl?.spectatorRankPts ?? 0);
  const [polls, setPolls] = useState<PollConfig[]>(seasonPrefill?.polls ?? tpl?.polls ?? []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isEventMode  = wizardMode === "event";
  const isSeriesMode = wizardMode === "series";
  // Wird dieses Event Teil einer Reihe? Dann kommen Teilnahme-/Zuschauer-Münzen seriesweit
  // fest aus der Gesamttabellen-Konfiguration der Reihe, nicht aus den Event-Belohnungen hier.
  const belongsToSeries = isSeriesMode || (isEventMode && seriesMode !== "none");
  const selectedSeries = series.find(s => s.id === selectedSeriesId);
  // Bestehende Reihe mit festem Turnierformat: das Format der Reihe gilt (der Server überschreibt es)
  const seriesFixedFormat = seriesMode === "existing" ? (selectedSeries?.fixedFormat ?? null) : null;
  const formatObj  = FORMATS.find(f => f.value === (seriesFixedFormat ?? format));
  const hasStat    = formatObj?.hasStat ?? false;
  const isRoundRobinFamily = (seriesFixedFormat ?? format) === "round_robin" || (seriesFixedFormat ?? format) === "liga";

  const monthlyDescriptions = useMemo(() => {
    if (!seriesStartDate || recurrenceType !== "monthly") return null;
    try { return describeMonthlyModes(fromDatetimeLocalBerlin(seriesStartDate)); } catch { return null; }
  }, [seriesStartDate, recurrenceType]);

  const previewDates = useMemo(() => {
    if (!seriesStartDate) return [];
    let start: Date;
    try { start = fromDatetimeLocalBerlin(seriesStartDate); } catch { return []; }
    if (isNaN(start.getTime())) return [];
    if (recurrenceType === "none") return [start];
    let endLimit: Date | null = null;
    if (seriesEndDate) {
      try { endLimit = fromDatetimeLocalBerlin(seriesEndDate + "T23:59:59"); } catch { endLimit = null; }
    }
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
  // Event mode: skip tournament step if community ODER OMA Gems (Format/Bracket
  // sind dort irrelevant — die Turnier-Einstellungen kommen stattdessen aus dem
  // eigenen Block in renderStepEventData, siehe isGemsTournament oben).
  const showsTournamentStep = eventType === "tournament" && !isGemsTournament;
  // Start in der Vergangenheit: Anmeldung wäre sofort geschlossen, die Ankündigung käme zu spät
  const startInPast = !!startAt && fromDatetimeLocalBerlin(startAt) < new Date();


  // ── Entwurf (lokal im Browser) ──────────────────────────────────────────────
  // Alle Eingaben werden laufend gespeichert und beim nächsten Öffnen zur Wiederherstellung
  // angeboten (nicht bei Vorlage/neuer Saison — dort ist die Vorbelegung gewollt).
  const draftEnabled = !eventTemplate && !seasonPrefill;
  const initialDraft = useInitialDraft();
  const [draftHandled, setDraftHandled] = useState(false);
  const pendingDraft = draftEnabled && !draftHandled && initialDraft && initialDraft.values.wizardMode !== "select" ? initialDraft : null;
  const draftDone = useRef(false);
  const draftValues: Record<string, unknown> = {
    wizardMode,
    step,
    category,
    eventType,
    spectatorMode,
    title,
    startAt,
    endAt,
    game,
    genre,
    maxPlayers,
    description,
    discordChannelId,
    seriesMode,
    selectedSeriesId,
    newSeriesName,
    newSeriesDesc,
    format,
    statFields,
    statPointsByField,
    publishMode,
    publishAt,
    playHomeAway,
    pointsMode,
    coinsWin,
    coinsDraw,
    checkInEnabled,
    checkInMinutes,
    eventRegistrationLocked,
    eventSquadId,
    gemsDifficulty,
    gemsMaxAttempts,
    gemsMonsterIds,
    gemsParticipationPack,
    gemsPlacementPacks,
    seriesName,
    seriesDesc,
    variousGames,
    fixedGame,
    fixedGenre,
    fixedPlatforms,
    seriesDiscordId,
    seriesFormat,
    seriesStartDate,
    seriesEndDate,
    seriesFirstEventEndAt,
    recurrenceType,
    recurrenceMonthlyMode,
    statParticipationPts,
    statSpectatorParticipationPts,
    statPtsToGlobalRanking,
    statRows,
    seriesHidden,
    seriesRegistrationLocked,
    seriesSquadId,
    eventStatFields,
    winnerStatField,
    dominionEnabled,
    dominionTriggerStats,
    dominionThreshold,
    dominionCoins,
    dominionSeriesPoints,
    participationCoins,
    participationRankPts,
    placements,
    spectatorCoins,
    spectatorRankPts,
    polls,
  };
  const draftSetters: Record<string, (value: never) => void> = {
    wizardMode: setWizardMode,
    step: setStep,
    category: setCategory,
    eventType: setEventType,
    spectatorMode: setSpectatorMode,
    title: setTitle,
    startAt: setStartAt,
    endAt: setEndAt,
    game: setGame,
    genre: setGenre,
    maxPlayers: setMaxPlayers,
    description: setDescription,
    discordChannelId: setDiscordChannelId,
    seriesMode: setSeriesMode,
    selectedSeriesId: setSelectedSeriesId,
    newSeriesName: setNewSeriesName,
    newSeriesDesc: setNewSeriesDesc,
    format: setFormat,
    statFields: setStatFields,
    statPointsByField: setStatPointsByField,
    publishMode: setPublishMode,
    publishAt: setPublishAt,
    playHomeAway: setPlayHomeAway,
    pointsMode: setPointsMode,
    coinsWin: setCoinsWin,
    coinsDraw: setCoinsDraw,
    checkInEnabled: setCheckInEnabled,
    checkInMinutes: setCheckInMinutes,
    eventRegistrationLocked: setEventRegistrationLocked,
    eventSquadId: setEventSquadId,
    gemsDifficulty: setGemsDifficulty,
    gemsMaxAttempts: setGemsMaxAttempts,
    gemsMonsterIds: setGemsMonsterIds,
    gemsParticipationPack: setGemsParticipationPack,
    gemsPlacementPacks: setGemsPlacementPacks,
    seriesName: setSeriesName,
    seriesDesc: setSeriesDesc,
    variousGames: setVariousGames,
    fixedGame: setFixedGame,
    fixedGenre: setFixedGenre,
    fixedPlatforms: setFixedPlatforms,
    seriesDiscordId: setSeriesDiscordId,
    seriesFormat: setSeriesFormat,
    seriesStartDate: setSeriesStartDate,
    seriesEndDate: setSeriesEndDate,
    seriesFirstEventEndAt: setSeriesFirstEventEndAt,
    recurrenceType: setRecurrenceType,
    recurrenceMonthlyMode: setRecurrenceMonthlyMode,
    statParticipationPts: setStatParticipationPts,
    statSpectatorParticipationPts: setStatSpectatorParticipationPts,
    statPtsToGlobalRanking: setStatPtsToGlobalRanking,
    statRows: setStatRows,
    seriesHidden: setSeriesHidden,
    seriesRegistrationLocked: setSeriesRegistrationLocked,
    seriesSquadId: setSeriesSquadId,
    eventStatFields: setEventStatFields,
    winnerStatField: setWinnerStatField,
    dominionEnabled: setDominionEnabled,
    dominionTriggerStats: setDominionTriggerStats,
    dominionThreshold: setDominionThreshold,
    dominionCoins: setDominionCoins,
    dominionSeriesPoints: setDominionSeriesPoints,
    participationCoins: setParticipationCoins,
    participationRankPts: setParticipationRankPts,
    placements: setPlacements,
    spectatorCoins: setSpectatorCoins,
    spectatorRankPts: setSpectatorRankPts,
    polls: setPolls,
  };
  const draftJson = JSON.stringify(draftValues);
  useEffect(() => {
    // Erst speichern, wenn ein vorgefundener Entwurf übernommen oder verworfen wurde
    if (!draftEnabled || pendingDraft || draftDone.current || wizardMode === "select") return;
    const t = setTimeout(() => writeDraft(JSON.parse(draftJson)), 600);
    return () => clearTimeout(t);
  }, [draftJson, draftEnabled, pendingDraft, wizardMode]);

  function restoreDraft() {
    if (!pendingDraft) return;
    for (const [key, value] of Object.entries(pendingDraft.values)) draftSetters[key]?.(value as never);
    setDraftHandled(true);
  }
  function discardDraft() {
    clearDraft();
    setDraftHandled(true);
  }

  /** Warum es im Schritt "Grunddaten" nicht weitergeht (null = alles ok) — als Hinweis unter dem Formular. */
  function eventDataProblem(): string | null {
    if (!title.trim()) return "Titel fehlt.";
    if (!startAt) return "Start-Datum fehlt.";
    if (isGemsTournament && !endAt) return "Ein OMA-Gems-Turnier braucht ein Ende (Turnierschluss).";
    if (endAt && fromDatetimeLocalBerlin(endAt) <= fromDatetimeLocalBerlin(startAt)) return "Das Ende muss nach dem Start liegen.";
    if (maxPlayers && (!Number.isInteger(Number(maxPlayers)) || Number(maxPlayers) < 2)) return "Max. Spieler muss eine ganze Zahl ab 2 sein.";
    if (seriesMode === "existing" && !selectedSeriesId) return "Bitte eine bestehende Eventreihe auswählen — oder „Einzelevent“ wählen.";
    if (seriesMode === "new" && !newSeriesName.trim()) return "Bitte einen Namen für die neue Eventreihe eingeben.";
    if (publishMode === "scheduled") {
      if (!publishAt) return "Bitte den Zeitpunkt der Veröffentlichung wählen.";
      const at = fromDatetimeLocalBerlin(publishAt);
      if (at <= new Date()) return "Der Veröffentlichungszeitpunkt liegt in der Vergangenheit — dann „Sofort veröffentlichen“ wählen.";
      if (at >= fromDatetimeLocalBerlin(startAt)) return "Die Veröffentlichung muss vor dem Event-Start liegen.";
    }
    return null;
  }

  function canProceed(): boolean {
    if (wizardMode === "select") return false;
    if (isEventMode) {
      if (step === 0) return true;
      if (step === 1) return eventDataProblem() === null;
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
    const problem = eventDataProblem();
    if (problem) { toast.error(problem); return; }
    setLoading(true);

    // Neue Reihe wird serverseitig zusammen mit dem Event angelegt (eine Transaktion), damit bei einem
    // Fehler keine leere Reihe zurückbleibt.
    const seriesId = seriesMode === "existing" ? selectedSeriesId : null;
    const newSeries = seriesMode === "new"
      ? { name: newSeriesName.trim(), description: newSeriesDesc.trim() || null }
      : null;

    const effectiveParticipationRankPts = eventType === "community" ? 0 : participationRankPts;
    const effectivePlacementsBase = eventType === "community"
      ? placements.map(p => ({ ...p, rankPoints: 0 }))
      : placements;
    // Karten-Pack-Belohnungen sind nur bei OMA-Gems-Turnieren wählbar (siehe gems-tournament.ts:
    // finalizeDueGemsTournaments liest packKind/participationPackKind, alle anderen Event-Typen
    // ignorieren diese Zusatzfelder einfach).
    const effectivePlacements = isGemsTournament
      ? effectivePlacementsBase.map((p, i) => gemsPlacementPacks[i] ? { ...p, packKind: gemsPlacementPacks[i] } : p)
      : effectivePlacementsBase;

    const body: Record<string, unknown> = {
      title: title.trim(),
      startAt: fromDatetimeLocalBerlin(startAt).toISOString(),
      endAt: endAt ? fromDatetimeLocalBerlin(endAt).toISOString() : null,
      game: game || null,
      genre: genre || null,
      category,
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      description: description || null,
      type: eventType,
      seriesId,
      newSeries,
      discordChannelId: discordChannelId || null,
      hidden: publishMode === "hidden",
      publishAt: publishMode === "scheduled" && publishAt ? fromDatetimeLocalBerlin(publishAt).toISOString() : null,
      registrationLocked: eventRegistrationLocked,
      squadId: eventSquadId || null,
      spectatorMode,
      spectatorRewardJson: spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
      placementRewardsJson: {
        participationCoins,
        participationRankPts: effectiveParticipationRankPts,
        placements: effectivePlacements,
        ...(isGemsTournament && gemsParticipationPack && { participationPackKind: gemsParticipationPack }),
      },
      pollsConfigJson: polls.length > 0 ? polls : null,
    };

    if (eventType === "tournament") {
      const chosenFormat = seriesFixedFormat ?? format;
      // "liga" bleibt intern der gespeicherte Wert für Liga mit Hin-/Rückrunde
      body.format = !seriesFixedFormat && format === "round_robin" && playHomeAway ? "liga" : chosenFormat;
      if (isRoundRobinFamily && pointsMode === "matchResult") body.matchResultPoints = { win: coinsWin, draw: coinsDraw };
      if (checkInEnabled && !isGemsTournament) {
        body.checkInEnabled = true;
        body.checkInMinutes = checkInMinutes;
      }
      if (hasStat) {
        body.statFields = JSON.stringify(statFields);
        const stats = statFields
          .filter(f => (statPointsByField[f] ?? 0) !== 0)
          .map(f => ({ field: f, pointsPer: statPointsByField[f] }));
        if (stats.length) body.statConfig = { stats };
      }
    }

    if (isGemsTournament && endAt) {
      body.gemsDifficulty = gemsDifficulty;
      body.gemsMaxAttempts = Number(gemsMaxAttempts) || 3;
      if (gemsMonsterIds.length > 0) body.gemsMonsterIds = gemsMonsterIds;
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Fehler beim Erstellen");
      return;
    }
    const event = await res.json();
    draftDone.current = true;
    clearDraft();
    toast.success(publishMode === "scheduled" ? "Event erstellt — Veröffentlichung ist geplant" : "Event erfolgreich erstellt!");
    router.push(`/admin/events/${event.id}`);
  }

  async function handleSubmitSeries() {
    if (!seriesName.trim()) return;
    setLoading(true);

    const hasStandingsConfig = eventType === "tournament" && (statParticipationPts > 0 || statRows.length > 0);
    const hasEventConfig = eventStatFields.length > 0;
    const hasParticipationConfig = statParticipationPts > 0 || participationCoins > 0;
    const hasSpectatorConfig = spectatorMode && (statSpectatorParticipationPts > 0 || spectatorCoins > 0);
    const winnerStatKeys = statRows.filter(r => r.isWinnerStat).map(r => r.field);
    const matchWinStatKeys = statRows.filter(r => r.isMatchWinStat).map(r => r.field);
    const seriesStatConfig = (hasStandingsConfig || hasEventConfig || hasParticipationConfig || hasSpectatorConfig || dominionEnabled)
      ? JSON.stringify({
          participationPoints: statParticipationPts,
          participationCoins,
          spectatorParticipationPoints: spectatorMode ? statSpectatorParticipationPts : 0,
          spectatorParticipationCoins: spectatorMode ? spectatorCoins : 0,
          transferToGlobalRanking: statPtsToGlobalRanking,
          stats: statRows,
          ...(eventStatFields.length > 0 && { eventStatFields }),
          ...(winnerStatField && { winnerStatField }),
          ...(winnerStatKeys.length > 0 && { winnerStatKeys }),
          ...(matchWinStatKeys.length > 0 && { matchWinStatKeys }),
          ...(dominionEnabled && dominionTriggerStats.length > 0 && {
            dominionBonus: {
              enabled: true,
              triggerStats: dominionTriggerStats,
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
        placementRewardsJson: { placements: eventType === "community" ? placements.map(p => ({ ...p, rankPoints: 0 })) : placements },
        pollsConfigJson: polls.length > 0 ? polls : null,
        seriesStatConfig,
        startDate: seriesStartDate ? fromDatetimeLocalBerlin(seriesStartDate).toISOString() : null,
        endDate: seriesEndDate ? fromDatetimeLocalBerlin(seriesEndDate + "T23:59:59").toISOString() : null,
        firstEventEndAt: (seriesStartDate && seriesFirstEventEndAt) ? fromDatetimeLocalBerlin(seriesFirstEventEndAt).toISOString() : null,
        eventType,
        hidden: seriesHidden,
        registrationLocked: seriesRegistrationLocked,
        squadId: seriesSquadId || null,
        spectatorMode,
        spectatorRewardJson: spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
        groupId: seasonPrefill?.groupId,
        seasonNumber: seasonPrefill?.seasonNumber,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Fehler beim Erstellen der Eventreihe");
      return;
    }
    const created = await res.json();
    draftDone.current = true;
    clearDraft();
    toast.success(
      (seasonPrefill ? `Saison „${seriesName}" gestartet` : `Eventreihe „${seriesName}" erstellt`) +
      (created.eventsCreated > 0 ? ` – ${created.eventsCreated} Termine angelegt` : "") + "!"
    );
    router.push(`/admin/series/${created.id}`);
  }

  return {
    eventTemplate,
    publishMode, setPublishMode, publishAt, setPublishAt,
    playHomeAway, setPlayHomeAway, pointsMode, setPointsMode, coinsWin, setCoinsWin, coinsDraw, setCoinsDraw,
    checkInEnabled, setCheckInEnabled, checkInMinutes, setCheckInMinutes,
    isRoundRobinFamily, startInPast, pendingDraft, restoreDraft, discardDraft,
    series,
    squads,
    forceSquad,
    initialSquadId,
    initialMode,
    seasonPrefill,
    router,
    wizardMode,
    setWizardMode,
    step,
    setStep,
    loading,
    setLoading,
    category,
    setCategory,
    eventType,
    setEventType,
    spectatorMode,
    setSpectatorMode,
    title,
    setTitle,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    game,
    setGame,
    genre,
    setGenre,
    maxPlayers,
    setMaxPlayers,
    description,
    setDescription,
    discordChannelId,
    setDiscordChannelId,
    seriesMode,
    setSeriesMode,
    selectedSeriesId,
    setSelectedSeriesId,
    newSeriesName,
    setNewSeriesName,
    newSeriesDesc,
    setNewSeriesDesc,
    format,
    setFormat,
    statFields,
    setStatFields,
    statPointsByField,
    setStatPointsByField,
    eventRegistrationLocked,
    setEventRegistrationLocked,
    eventSquadId,
    setEventSquadId,
    gemsDifficulty,
    setGemsDifficulty,
    gemsMaxAttempts,
    setGemsMaxAttempts,
    gemsMonsterIds,
    setGemsMonsterIds,
    gemsMonsterPick,
    setGemsMonsterPick,
    gemsParticipationPack,
    setGemsParticipationPack,
    gemsPlacementPacks,
    setGemsPlacementPacks,
    isGemsTournament,
    seriesName,
    setSeriesName,
    seriesDesc,
    setSeriesDesc,
    variousGames,
    setVariousGames,
    fixedGame,
    setFixedGame,
    fixedGenre,
    setFixedGenre,
    fixedPlatforms,
    setFixedPlatforms,
    seriesDiscordId,
    setSeriesDiscordId,
    seriesFormat,
    setSeriesFormat,
    seriesStartDate,
    setSeriesStartDate,
    seriesEndDate,
    setSeriesEndDate,
    seriesFirstEventEndAt,
    setSeriesFirstEventEndAt,
    recurrenceType,
    setRecurrenceType,
    recurrenceMonthlyMode,
    setRecurrenceMonthlyMode,
    statParticipationPts,
    setStatParticipationPts,
    statSpectatorParticipationPts,
    setStatSpectatorParticipationPts,
    statPtsToGlobalRanking,
    setStatPtsToGlobalRanking,
    statRows,
    setStatRows,
    seriesHidden,
    setSeriesHidden,
    seriesRegistrationLocked,
    setSeriesRegistrationLocked,
    seriesSquadId,
    setSeriesSquadId,
    eventStatFields,
    setEventStatFields,
    winnerStatField,
    setWinnerStatField,
    dominionEnabled,
    setDominionEnabled,
    dominionTriggerStats,
    setDominionTriggerStats,
    dominionThreshold,
    setDominionThreshold,
    dominionCoins,
    setDominionCoins,
    dominionSeriesPoints,
    setDominionSeriesPoints,
    participationCoins,
    setParticipationCoins,
    participationRankPts,
    setParticipationRankPts,
    placements,
    setPlacements,
    spectatorCoins,
    setSpectatorCoins,
    spectatorRankPts,
    setSpectatorRankPts,
    polls,
    setPolls,
    isEventMode,
    isSeriesMode,
    belongsToSeries,
    selectedSeries,
    seriesFixedFormat,
    formatObj,
    hasStat,
    monthlyDescriptions,
    previewDates,
    showsTournamentStep,
    eventDataProblem,
    canProceed,
    addPoll,
    updatePoll,
    removePoll,
    handleSubmitEvent,
    handleSubmitSeries,
  };
}

export type EventWizard = ReturnType<typeof useEventWizard>;
