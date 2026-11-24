"use client";
import { normalizeCategory } from "@/lib/event-category";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { EventCategory, EventGenre } from "@prisma/client";
import { resolveAvgDirection } from "@/lib/avg-stats";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { BLOCKS_GAME, DEFAULT_BLOCKS_EVENT, type BlocksEventConfig } from "@/lib/blocks/event-config";
import { toDatetimeLocalBerlin, fromDatetimeLocalBerlin } from "@/lib/time";
import { lifecycleStep } from "@/lib/event-manage";
import { formToGoal, goalToForm, type CommunityGoalForm } from "@/components/CommunityGoalEditor";
import { eventHasPlacement, eventKindOf, type EventKind } from "@/lib/event-placement";
import { goalFieldsFor, supportsCommunityGoal } from "@/lib/community-goal";
import { resolveEventGoal } from "@/lib/event-goal";
import { applyEventStatOverride, hasEventPoints } from "@/lib/series-event-points";
import { confirmEventTiming } from "@/lib/event-timing-warning";
import { type EventEditProps, type User, type PlacementReward, type PollConfig, parseTmtConfig, deriveStatFieldsFromSeries, seriesEventStatRows, type EventStatConfigForm, parseEventStatConfig, buildEventStatConfig, parseRewards, parsePolls, parseSpectatorReward, type TabKey } from "./edit-shared";

/** Zustand, abgeleitete Werte und Aktionen von EventEditClient (aufgeteilt in Hook + Reiter-Komponenten). */
export function useEventEdit({ event, registeredUsers, squads = [], rewardLimits = null, goalStatus = null }: EventEditProps) {
  const router        = useRouter();
  const { data: session } = useSession();
  const isAdmin       = session?.user?.role === "admin";
  // Community-Ersteller und Squad-Captains (keine Mod-Rolle) wählen Cover nur aus den Vorlagen
  const isModerator   = session?.user?.role === "moderator" || isAdmin;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const { confirm, ConfirmDialogElement } = useConfirm();

  /* ── Details state ── */
  const [status, setStatus]           = useState<string>(event.status);
  const [title, setTitle]             = useState<string>(event.title);
  const [description, setDescription] = useState<string>(event.description ?? "");
  const [rules, setRules]             = useState<string>(event.rules ?? "");
  const [game, setGame]               = useState<string>(event.game ?? "");
  const [genre, setGenre]             = useState<EventGenre | null>(event.genre ?? null);
  const [category, setCategory]       = useState<EventCategory>(normalizeCategory(event.category) ?? "fun");
  const [startAt, setStartAt]         = useState<string>(toDatetimeLocalBerlin(event.startAt));
  // Generisches, optionales Event-Ende — für alle Event-Typen sichtbar.
  const [endAt, setEndAt] = useState<string>(event.endAt ? toDatetimeLocalBerlin(event.endAt) : "");
  const [maxPlayers, setMaxPlayers]   = useState<string>(event.maxPlayers?.toString() ?? "");
  // Optionaler Anmeldeschluss vor dem Start (leer = Anmeldung bis zum Start)
  const [registrationClosesAt, setRegistrationClosesAt] = useState<string>(event.registrationClosesAt ? toDatetimeLocalBerlin(event.registrationClosesAt) : "");
  const [discordChannelId, setDiscordChannelId] = useState<string>(event.discordChannelId ?? "");
  const [propagateTitleDesc, setPropagateTitleDesc] = useState(false);

  /* ── OMA Blocks (nur bei game === "OMA Blocks"): Live-Turnier oder Community-Challenge ── */
  const isBlocksEvent = game === BLOCKS_GAME;
  const [blocks, setBlocks] = useState<BlocksEventConfig>(() => ({
    ...DEFAULT_BLOCKS_EVENT,
    ...(event.blocksTournament && {
      kind: "tournament" as const,
      groupRounds: event.blocksTournament.groupRounds,
      finalRounds: event.blocksTournament.finalRounds,
      advancePerGroup: event.blocksTournament.advancePerGroup,
    }),
    ...(event.blocksChallenge && {
      kind: "challenge" as const,
      metric: event.blocksChallenge.metric === "score" ? ("score" as const) : ("lines" as const),
      goal: event.blocksChallenge.goal,
      minContribution: event.blocksChallenge.minContribution,
      rewardCoins: event.blocksChallenge.rewardCoins,
      rewardRankPoints: event.blocksChallenge.rewardRankPoints,
    }),
  }));
  const blocksKindLocked = !!(event.blocksTournament || event.blocksChallenge);
  const blocksLockedReason: string | null =
    event.blocksTournament && event.blocksTournament.stage !== "pending"
      ? "Das Turnier läuft bereits — Runden und Aufsteiger sind festgeschrieben."
      : event.blocksChallenge?.finalizedAt
        ? "Die Challenge ist abgerechnet — die Einstellungen sind festgeschrieben."
        : null;

  const titleDescChanged = title !== event.title || description !== (event.description ?? "");

  /* ── Rewards state ── */
  const initialRewards = parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson);
  const [participationCoins, setParticipationCoins] = useState<number>(
    event.placementRewardsJson ? parseRewards(event.placementRewardsJson).participationCoins : (event.pointReward ?? initialRewards.participationCoins)
  );
  const [placements, setPlacements] = useState<PlacementReward[]>(initialRewards.placements);
  const [participationRankPts, setParticipationRankPts] = useState<number>(
    event.placementRewardsJson ? (parseRewards(event.placementRewardsJson).participationRankPts ?? 0) : 0
  );
  // Event-Typ: änderbar, solange das Event nicht abgeschlossen ist (Server prüft das ebenfalls)
  const [eventKind, setEventKind] = useState<EventKind>(eventKindOf(event));
  const kindLocked = !!event.completionData;
  // Community-Events haben keine Platzierung (lib/event-placement.ts) — keine Platzierungs-Belohnungen
  const hasPlacement = eventHasPlacement({ type: eventKind });
  const [polls, setPolls] = useState<PollConfig[]>(parsePolls(event.pollsConfigJson ?? event.pollConfigJson));
  const initialSpectatorReward = parseSpectatorReward(event.spectatorRewardJson);
  const [spectatorCoins, setSpectatorCoins] = useState(initialSpectatorReward.coins);
  const [spectatorRankPts, setSpectatorRankPts] = useState(initialSpectatorReward.rankPoints);

  /* ── Tournament state (übernimmt Format/Punkte/Stats der Eventreihe, falls am Event selbst noch nichts gesetzt ist) ── */
  const initialTmtFormat = event.format ?? event.series?.fixedFormat ?? "single_elimination";
  // "liga" ist kein eigenständiger Auswahlwert mehr (siehe TMT_FORMATS) — intern bleibt es aber
  // weiterhin der gespeicherte Format-String für Hin-/Rückrunde-Turniere (unverändertes Backend).
  const [tmtFormat, setTmtFormat]       = useState<string>(initialTmtFormat === "liga" ? "round_robin" : initialTmtFormat);
  const [tmtPlayHomeAway, setTmtPlayHomeAway] = useState<boolean>(initialTmtFormat === "liga");
  const [tmtPointsMode, setTmtPointsMode] = useState<"placement" | "matchResult">(initialTmtFormat === "liga" ? "matchResult" : "placement");
  const [tmtPoints, setTmtPoints]       = useState(() =>
    parseTmtConfig(event.pointsConfig)
  );
  // Reihen-Stats sind in jedem Event der Reihe fest dabei; das Event kann nur Zusatz-Stats ergänzen
  const seriesStatRows = seriesEventStatRows(event.series);
  const seriesStatFieldSet = new Set(seriesStatRows.map(r => r.field));
  const [tmtStatFields, setTmtStatFields] = useState<string[]>(() => {
    let own: string[] | null = null;
    if (event.statFields) {
      try { own = JSON.parse(event.statFields) as string[]; } catch { /* fällt durch */ }
    }
    if (seriesStatRows.length > 0) {
      return [...seriesStatRows.map(r => r.field), ...(own ?? []).filter(f => !seriesStatFieldSet.has(f))];
    }
    return own ?? deriveStatFieldsFromSeries(event.series) ?? ["Kills", "Assists", "Punkte"];
  });
  const tmtExtraStatFields = tmtStatFields.filter(f => !seriesStatFieldSet.has(f));
  /* Event-eigene Stat-Punkte-Konfiguration (nur relevant bei coop_stats) — überschreibt für dieses
   * Event die Reihen-weite seriesStatConfig, siehe schema.prisma statConfigJson. */
  const [tmtStatConfig, setTmtStatConfig] = useState<EventStatConfigForm>(() => parseEventStatConfig(event.statConfigJson));
  // Ziel des Events: eigenes, von der Reihe geerbtes oder abgeschaltetes (lib/event-goal.ts)
  const resolvedGoal = resolveEventGoal({ format: event.format, statConfigJson: event.statConfigJson, series: event.series });
  /* ── Community-Ziel (Reiter "Ziel") ──
   * goalMode: "inherit" = Ziel der Reihe (bei Einzel-Events: kein Ziel), "override" = eigenes Ziel,
   * "off" = bewusst kein Ziel (nur Reihen-Termine). Gespeichert über die Speicherleiste mit
   * PATCH /api/events/[id]/goal — die Spielplan-Einstellungen lassen das Ziel unangetastet. */
  const [goalMode, setGoalMode] = useState<"inherit" | "override" | "off">(
    resolvedGoal.source === "event" ? "override" : resolvedGoal.source === "off" ? "off" : "inherit");
  const [goalForm, setGoalForm] = useState<CommunityGoalForm>(() => ({ ...goalToForm(resolvedGoal.ownGoal ?? resolvedGoal.seriesGoal), enabled: true }));
  const goalCapable = supportsCommunityGoal(event.format);
  // Wertung der Live-Tabelle im Reiter "Turnier" — dieselbe wie beim Abschluss (lib/series-event-points)
  const tmPointsCfg = (() => {
    let raw: { stats?: { field: string; pointsPer: number }[]; placementPoints?: Record<string, number>; winnerStatKeys?: string[]; matchWinStatKeys?: string[] } | null = null;
    try { raw = event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : null; } catch { raw = null; }
    const cfg = applyEventStatOverride({ ...(raw ?? {}), stats: raw?.stats ?? [] }, event.statConfigJson);
    return hasEventPoints(cfg) ? cfg : null;
  })();
  const tmAvgDirection = resolveAvgDirection(null, event.statConfigJson);
  const [tmtLoading, setTmtLoading] = useState(false);
  const hasTournament = !!event.format;
  const hasStat       = ["ffa", "coop_stats", "avg_stats"].includes(tmtFormat);
  const isRoundRobinFamily = tmtFormat === "round_robin";
  const isLiga        = isRoundRobinFamily && tmtPlayHomeAway;
  const usesMatchResultPoints = isRoundRobinFamily && tmtPointsMode === "matchResult";
  const resolvedTmtFormat = isLiga ? "liga" : tmtFormat;

  // Sichtbarkeit, Selbst-Anmeldung, Squad und OMA Original laufen (wie alle Formularfelder) über
  // EINEN Speichern-Weg — die Speicherleiste unten (früher wurden diese sofort einzeln gespeichert)
  const [hidden, setHidden] = useState<boolean>(event.hidden ?? false);
  const [registrationLocked, setRegistrationLocked] = useState<boolean>(event.registrationLocked ?? false);
  // Zuschauer erlauben — vorher nur beim Anlegen einstellbar
  const [spectatorMode, setSpectatorMode] = useState<boolean>(event.spectatorMode ?? false);
  const [omaOriginal, setOmaOriginal] = useState<boolean>(event.omaOriginal ?? false);
  const [squadId, setSquadId] = useState<string>(event.squadId ?? "");

  /* ── Series config state ── */
  const initialSeriesCfg = (() => {
    try { return event.seriesEventConfigJson ? JSON.parse(event.seriesEventConfigJson) as { winnerMode?: string; winnerStatField?: string } : null; }
    catch { return null; }
  })();
  const [seriesWinnerMode, setSeriesWinnerMode] = useState<"manual" | "bracket" | "stat">(
    (initialSeriesCfg?.winnerMode as "manual" | "bracket" | "stat") ?? "manual"
  );
  const [seriesWinnerStatField, setSeriesWinnerStatField] = useState<string>(initialSeriesCfg?.winnerStatField ?? "");

  // ── Check-in vor Turnierstart ──
  const [checkInEnabled, setCheckInEnabled] = useState<boolean>(event.checkInEnabled ?? false);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(() => new Set(
    (event.registrations as { userId: string; checkedInAt?: string | Date | null }[])
      .filter(r => r.checkedInAt).map(r => r.userId),
  ));

  async function setPlayerCheckIn(userId: string, checkedIn: boolean) {
    const res = await fetch(`/api/events/${event.id}/checkin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, checkedIn }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler"); return; }
    setCheckedInIds(prev => {
      const next = new Set(prev);
      if (checkedIn) next.add(userId); else next.delete(userId);
      return next;
    });
  }

    /* ── Clip URL state ── */
  const [twitchClipUrl, setTwitchClipUrl] = useState<string>(event.twitchClipUrl ?? "");

  /* ── Eigenes Event-Cover ── */
  const [coverImageUrl, setCoverImageUrl] = useState<string>(event.coverImageUrl ?? "");

  /* ── Partners state ── */
  const [allPartners, setAllPartners] = useState<{ id: string; name: string; twitchLogin: string; logoUrl: string }[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>(
    (event.streamingPartners ?? []).map((ep: { partnerId: string }) => ep.partnerId)
  );
  const [partnersLoaded, setPartnersLoaded] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);

  /* ── Participants state ──
   * Geladen sind nur die Angemeldeten (registeredUsers). Weitere Mitglieder findet die Suche über
   * /api/events/[id]/member-search — früher kam mit jeder Bearbeiten-Seite die komplette Mitgliederliste. */
  const [search, setSearch]             = useState("");
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkSelectedSpectators, setBulkSelectedSpectators] = useState<string[]>([]);
  // Namen der ausgewählten Mitglieder (für die Auswahl-Leiste, auch wenn sie nicht mehr im Suchergebnis stehen)
  const [knownUsers, setKnownUsers] = useState<Record<string, User>>({});
  // Letztes Suchergebnis samt Suchtext — passt der Text nicht mehr, läuft gerade eine neue Suche
  const [searchState, setSearchState] = useState<{ q: string; rows: User[] }>({ q: "", rows: [] });
  // Liste von Namen/Usernamen einfügen (z.B. aus Discord kopiert) statt jeden einzeln zu suchen
  const [pasteImportOpen, setPasteImportOpen] = useState(false);
  const [pasteImportText, setPasteImportText] = useState("");
  const [pasteImportResult, setPasteImportResult] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const registeredIds  = new Set<string>(event.registrations.filter((r: { role: string }) => r.role !== "spectator").map((r: { userId: string }) => r.userId));
  const spectatorIds   = new Set<string>(event.registrations.filter((r: { role: string }) => r.role === "spectator").map((r: { userId: string }) => r.userId));
  const userName = (u: User) => u.username ?? u.name ?? "?";
  // Angemeldete (Spieler und Zuschauer), gefiltert nach der Suche
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return registeredUsers;
    const q = search.toLowerCase();
    return registeredUsers.filter(u => userName(u).toLowerCase().includes(q));
  }, [registeredUsers, search]);
  const searchQuery = search.trim();
  const searchActive = searchQuery.length >= 2;
  const searchResults = searchState.q === searchQuery ? searchState.rows : [];
  const searching = searchActive && searchState.q !== searchQuery;
  // Suchergebnis ohne die schon Angemeldeten
  const addableUsers = searchResults.filter(u => !registeredIds.has(u.id) && !spectatorIds.has(u.id));

  // Mitglieder suchen (kurz verzögert, ab 2 Zeichen)
  useEffect(() => {
    if (searchQuery.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/events/${event.id}/member-search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => (res.ok ? res.json() : []))
        .then((rows: User[]) => { if (!cancelled) setSearchState({ q: searchQuery, rows }); })
        .catch(() => { if (!cancelled) setSearchState({ q: searchQuery, rows: [] }); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [searchQuery, event.id]);

  /** Auswahl für "N hinzufügen" umschalten (Spieler bzw. Zuschauer) */
  function toggleSelected(u: User, role: "player" | "spectator", on: boolean) {
    setKnownUsers(prev => ({ ...prev, [u.id]: u }));
    const set = role === "spectator" ? setBulkSelectedSpectators : setBulkSelected;
    set(prev => on ? [...new Set([...prev, u.id])] : prev.filter(id => id !== u.id));
  }

  const seriesGame    = event.series?.fixedGame;
  const seriesDiscord = event.series?.discordChannelId;

  // Partnerliste einmal beim Öffnen der Seite laden (für Namen in der Zusammenfassung und die Auswahl)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners")
      .then(res => (res.ok ? res.json() : []))
      .then((rows: { id: string; name: string; twitchLogin: string; logoUrl: string }[]) => { if (!cancelled) { setAllPartners(rows); setPartnersLoaded(true); } })
      .catch(() => { if (!cancelled) setPartnersLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  function updatePlacement(place: number, key: keyof PlacementReward, value: number) {
    setPlacements(prev => prev.map(p => p.place === place ? { ...p, [key]: value } : p));
  }
  function addPoll() {
    if (polls.length >= 3) return;
    setPolls(p => [...p, {
      label: "", question: "",
      voterEligibility: "participants",
      answerType: "players",
      customAnswers: [],
      startOffsetHours: 0,
      endOffsetHours: 24,
      participationCoins: 0,
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

  /* ── Ungespeicherte Änderungen ──
   * Alle Einstellungen (Details, Belohnungen, Check-in, Sieger-Ermittlung der Reihe, Sichtbarkeit,
   * Anmeldung, Squad, OMA Original, Streaming-Partner) als ein Schnappschuss — weicht er vom zuletzt
   * gespeicherten ab, erscheint die Speicherleiste. Sofort wirksam sind nur Aktionen: Teilnehmer
   * eintragen/entfernen und im Spielplan das Format anlegen bzw. das Turnier starten. */
  const formSnapshot = JSON.stringify({
    status, title, description, rules, game, genre, category, startAt, endAt, maxPlayers, registrationClosesAt, discordChannelId,
    eventKind, participationCoins, participationRankPts, placements, polls, spectatorCoins, spectatorRankPts, twitchClipUrl, coverImageUrl,
    blocks: isBlocksEvent ? blocks : null, hidden, registrationLocked, spectatorMode, squadId, omaOriginal,
    partners: [...selectedPartnerIds].sort(),
    checkInEnabled, seriesWinnerMode, seriesWinnerStatField,
    goal: goalCapable ? { mode: goalMode, form: goalMode === "override" ? goalForm : null } : null,
  });
  const [savedSnapshot, setSavedSnapshot] = useState(formSnapshot);
  const dirty = formSnapshot !== savedSnapshot;
  const changedCount = useMemo(() => {
    if (!dirty) return 0;
    const a = JSON.parse(formSnapshot) as Record<string, unknown>;
    const b = JSON.parse(savedSnapshot) as Record<string, unknown>;
    return Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).length;
  }, [dirty, formSnapshot, savedSnapshot]);
  const savedRef = useRef(JSON.parse(savedSnapshot) as Record<string, unknown>);
  useEffect(() => { savedRef.current = JSON.parse(savedSnapshot); }, [savedSnapshot]);

  // Beim Verlassen der Seite mit ungespeicherten Änderungen warnen
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Änderungen verwerfen: zurück auf den zuletzt gespeicherten Stand */
  function discardChanges() {
    const s = savedRef.current as Record<string, never>;
    setStatus(s.status); setTitle(s.title); setDescription(s.description); setRules(s.rules); setGame(s.game);
    setEventKind(s.eventKind); setParticipationRankPts(s.participationRankPts);
    setGenre(s.genre); setCategory(s.category); setStartAt(s.startAt); setEndAt(s.endAt); setMaxPlayers(s.maxPlayers); setRegistrationClosesAt(s.registrationClosesAt);
    setDiscordChannelId(s.discordChannelId); setParticipationCoins(s.participationCoins); setPlacements(s.placements);
    setPolls(s.polls); setSpectatorCoins(s.spectatorCoins); setSpectatorRankPts(s.spectatorRankPts);
    setTwitchClipUrl(s.twitchClipUrl); setCoverImageUrl(s.coverImageUrl); if (s.blocks) setBlocks(s.blocks);
    setHidden(s.hidden); setRegistrationLocked(s.registrationLocked); setSpectatorMode(s.spectatorMode); setSquadId(s.squadId); setOmaOriginal(s.omaOriginal);
    setSelectedPartnerIds(s.partners); setPropagateTitleDesc(false);
    setCheckInEnabled(s.checkInEnabled); setSeriesWinnerMode(s.seriesWinnerMode); setSeriesWinnerStatField(s.seriesWinnerStatField);
    const g = s.goal as { mode: "inherit" | "override" | "off"; form: CommunityGoalForm | null } | null;
    if (g) { setGoalMode(g.mode); if (g.form) setGoalForm(g.form); }
  }

  /* ── Save handlers ── */
  async function handleSave() {
    const before = savedRef.current;
    // Ziel zuerst prüfen — ein unvollständiges Ziel soll nichts halb speichern
    const goalChanged = goalCapable && JSON.stringify(JSON.parse(formSnapshot).goal) !== JSON.stringify(before.goal);
    const goalToSave = goalMode === "override" ? formToGoal({ ...goalForm, enabled: true }, goalFieldsFor(event.format, tmtStatFields)) : null;
    if (goalChanged && goalMode === "override" && !goalToSave) {
      toast.error("Ziel unvollständig: wähle mindestens ein Feld und eine Zielmarke über 0 (Reiter „Ziel“)");
      setActiveTab("goal");
      return;
    }
    setLoading(true);
    const scope = (event.series && titleDescChanged && propagateTitleDesc) ? "all" : "single";
    const partnersChanged = JSON.stringify([...selectedPartnerIds].sort()) !== JSON.stringify(before.partners);
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        ...(hidden !== before.hidden && { hidden }),
        ...(registrationLocked !== before.registrationLocked && { registrationLocked }),
        ...(spectatorMode !== before.spectatorMode && { spectatorMode }),
        ...(squadId !== before.squadId && { squadId: squadId || null }),
        ...(isModerator && omaOriginal !== before.omaOriginal && { omaOriginal }),
        ...(eventKind !== before.eventKind && { type: eventKind }),
        ...(checkInEnabled !== before.checkInEnabled && { checkInEnabled }),
        ...((seriesWinnerMode !== before.seriesWinnerMode || seriesWinnerStatField !== before.seriesWinnerStatField) && {
          seriesEventConfigJson: JSON.stringify({ winnerMode: seriesWinnerMode, ...(seriesWinnerMode === "stat" ? { winnerStatField: seriesWinnerStatField } : {}) }),
        }),
        status,
        title,
        description: description || null,
        rules: rules || null,
        game: game.trim() || null,
        genre: genre || null,
        category,
        startAt: fromDatetimeLocalBerlin(startAt).toISOString(),
        endAt: endAt ? fromDatetimeLocalBerlin(endAt).toISOString() : null,
        maxPlayers: maxPlayers ? Number(maxPlayers) : null,
        registrationClosesAt: registrationClosesAt ? fromDatetimeLocalBerlin(registrationClosesAt).toISOString() : null,
        discordChannelId: discordChannelId.trim() || null,
        placementRewardsJson: JSON.stringify({
          participationCoins,
          participationRankPts,
          placements: hasPlacement ? placements : [],
        }),
        pollsConfigJson: polls.length > 0 ? polls : null,
        spectatorRewardJson: spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
        twitchClipUrl: twitchClipUrl.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        seriesScope: scope,
        ...(isBlocksEvent && !blocksLockedReason && { blocks }),
      }),
    });
    if (!res.ok) {
      setLoading(false);
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Fehler beim Speichern");
      return;
    }
    // Community-Ziel hat eine eigene Route (lässt die übrige statConfigJson unangetastet) — nur bei Änderung
    if (goalChanged) {
      const gr = await fetch(`/api/events/${event.id}/goal`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: goalMode, goal: goalToSave }),
      });
      if (!gr.ok) toast.error((await gr.json().catch(() => null))?.error ?? "Das Ziel konnte nicht gespeichert werden");
    }
    // Streaming-Partner haben eine eigene Route — nur bei Änderung
    if (partnersChanged) {
      const pr = await fetch(`/api/admin/events/${event.id}/partners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerIds: selectedPartnerIds }),
      });
      if (!pr.ok) toast.error("Streaming-Partner konnten nicht gespeichert werden");
    }
    setLoading(false);
    setSavedSnapshot(formSnapshot);
    setPropagateTitleDesc(false);
    toast.success(
      before.hidden === true && !hidden ? "Gespeichert — das Event ist jetzt sichtbar, Discord-Post und Push laufen"
        : scope === "all" ? "Für die gesamte Reihe gespeichert" : "Gespeichert",
    );
    router.refresh();
  }

  /** Event ohne Spielplan (v.a. "Ohne Platzierung"): Ziel einrichten = Werte-Erfassung (Format
   *  Punktewertung/coop_stats) mit diesen Stat-Feldern und dem Ziel anlegen. Der Event-Typ bleibt
   *  (keepType) — es gibt weiter keine Platzierung. Sofort wirksam, wie das Anlegen eines Formats. */
  const [goalSetupLoading, setGoalSetupLoading] = useState(false);
  async function createGoalTracking(fields: string[]) {
    const goal = formToGoal({ ...goalForm, enabled: true }, fields);
    if (!goal) { toast.error("Wähle mindestens ein Feld und eine Zielmarke über 0"); return; }
    setGoalSetupLoading(true);
    const res = await fetch("/api/tournaments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, format: "coop_stats", statFields: fields, keepType: true,
        statConfig: { stats: [], placementPoints: {}, goal }, status: "pending" }),
    });
    setGoalSetupLoading(false);
    if (res.ok) { toast.success("Ziel angelegt. Die Werte trägst du im Reiter „Spielplan“ ein."); setSavedSnapshot(formSnapshot); router.refresh(); }
    else toast.error((await res.json().catch(() => null))?.error ?? "Das Ziel konnte nicht angelegt werden");
  }

  /** "Neu auswerten": ausgezahlte Ziel-Münzen zurückbuchen und mit den aktuellen Werten neu prüfen */
  const [reevaluating, setReevaluating] = useState(false);
  async function reevaluateGoal() {
    if (!(await confirm({
      title: "Ziel neu auswerten",
      description: "Die bisher für dieses Ziel ausgezahlten Münzen werden zurückgebucht und mit den aktuellen Werten neu vergeben. Sinnvoll, nachdem du einen falschen Wert korrigiert hast. Die Teilnehmer bekommen dabei keine Meldung.",
      confirmLabel: "Neu auswerten",
    }))) return;
    setReevaluating(true);
    const res = await fetch(`/api/events/${event.id}/goal/reevaluate`, { method: "POST" });
    setReevaluating(false);
    if (res.ok) {
      const d = await res.json() as { reverted: number; rewarded: number };
      toast.success(`Neu ausgewertet: ${d.reverted} Rückbuchung(en), ${d.rewarded} Person(en) belohnt`);
      router.refresh();
    } else toast.error("Neu auswerten hat nicht geklappt");
  }

  /** Abschluss aufheben: alle Belohnungen zurückbuchen, Event wieder "läuft"/"Anmeldung offen" */
  async function undoCompletion() {
    if (!(await confirm({
      title: "Abschluss aufheben",
      description: `Alle Belohnungen aus dem Abschluss von „${event.title}“ werden zurückgebucht: Teilnahme, Platzierung, Zuschauer, Umfragen und Reihentabelle. Danach kannst du das Event neu abschließen.`,
      variant: "danger",
      confirmLabel: "Aufheben und zurückbuchen",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/events/${event.id}/complete`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) { toast.success("Abschluss aufgehoben, Belohnungen zurückgebucht"); setSavedSnapshot(formSnapshot); router.refresh(); }
    else toast.error((await res.json().catch(() => null))?.error ?? "Aufheben hat nicht geklappt");
  }

  /** Start/Ende aus dem Formular (ungespeicherte Änderungen zählen schon), sonst aus dem Event. */
  function formTiming() {
    try {
      return {
        startAt: startAt ? fromDatetimeLocalBerlin(startAt) : event.startAt,
        endAt: endAt ? fromDatetimeLocalBerlin(endAt) : null,
      };
    } catch {
      return { startAt: event.startAt, endAt: event.endAt ?? null };
    }
  }

  /** Status wählen — warnt vor "aktiv" vor dem Start bzw. "Umfrage"/"Beendet" vor Start/Ende. */
  async function pickStatus(s: string) {
    if (s !== status && s !== event.status) {
      const action = s === "active" ? "activate" : (s === "umfrage" || s === "finished") ? "complete" : null;
      if (action && !(await confirmEventTiming(confirm, action, formTiming()))) return;
    }
    setStatus(s);
  }

  /** startStatus: "pending" legt das Turnier nur an (noch nicht gestartet), "active" startet es direkt. */
  async function saveTmtSettings(startStatus: "pending" | "active" = "active") {
    if (startStatus === "active" && event.tournamentStatus !== "active"
      && !(await confirmEventTiming(confirm, "activate", formTiming()))) return;
    setTmtLoading(true);
    // pointsConfig nur noch für Sieg/Unentschieden-Münzen pro Match — Platzierungen zahlt der
    // Event-Abschluss aus dem Reiter "Belohnungen"
    const config = usesMatchResultPoints ? { win: tmtPoints.win, draw: tmtPoints.draw } : null;
    // Event-eigene Stat-Punkte-Konfiguration nur bei coop_stats — überschreibt für dieses Event die
    // Reihen-weite seriesStatConfig (nötig, wenn sich das Spiel/die Stat-Felder von Event zu Event
    // ändern und daher kein seriesweit fixes Punktesystem greifen kann).
    const builtStatConfig = ["ffa", "coop_stats", "avg_stats"].includes(tmtFormat)
      ? buildEventStatConfig(tmtStatFields, tmtStatConfig, tmtFormat === "avg_stats", null) : null;
    // Das Ziel gehört dem Reiter "Ziel" und darf beim Speichern der Spielplan-Einstellungen nicht verloren
    // gehen — gespeicherten Stand (eigenes Ziel / "kein Ziel") übernehmen (lib/event-goal.ts)
    const keptGoalKeys: Record<string, unknown> = supportsCommunityGoal(tmtFormat)
      ? {
          ...(resolvedGoal.ownGoal && resolvedGoal.source === "event" && { goal: resolvedGoal.ownGoal }),
          ...(resolvedGoal.source === "off" && { goalOff: true }),
        }
      : {};
    const statConfig = builtStatConfig || Object.keys(keptGoalKeys).length > 0
      ? { ...(builtStatConfig ?? { stats: [], placementPoints: {} }), ...keptGoalKeys }
      : null;
    if (!hasTournament) {
      const res = await fetch("/api/tournaments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, format: resolvedTmtFormat, pointsConfig: config,
          statFields: hasStat ? tmtStatFields : null, statConfig, status: startStatus }),
      });
      if (res.ok) { toast.success(startStatus === "pending" ? "Einstellungen gespeichert — Turnier noch nicht gestartet" : "Turnier erstellt"); router.refresh(); }
      else { const e = await res.json(); toast.error(e.error ?? "Fehler"); }
    } else {
      const res = await fetch(`/api/tournaments/${event.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: resolvedTmtFormat, pointsConfig: config,
          statFields: hasStat ? tmtStatFields : null, statConfig }),
      });
      if (res.ok) { toast.success("Turnier-Einstellungen gespeichert"); router.refresh(); }
      else { toast.error("Fehler beim Speichern"); }
    }
    setTmtLoading(false);
  }

  async function startTournament() {
    if (!(await confirmEventTiming(confirm, "activate", formTiming()))) return;
    setTmtLoading(true);
    const res = await fetch(`/api/tournaments/${event.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    setTmtLoading(false);
    if (res.ok) { toast.success("Turnier gestartet"); router.refresh(); }
    else toast.error("Fehler beim Starten");
  }

  async function removeUser(userId: string, name: string, role: "player" | "spectator" = "player") {
    if (!(await confirm({ title: "Teilnehmer entfernen", description: `"${name}" wirklich entfernen?`, variant: "danger" }))) return;
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
    // Hinweise vom Server: über der Höchstzahl bzw. nicht im Squad eingetragen
    if (data.overCapacity > 0) toast.warning(`Jetzt ${data.overCapacity} über der Höchstzahl von ${event.maxPlayers} Spielern`);
    if (data.notInSquad > 0) toast.warning(`${data.notInSquad} davon ${data.notInSquad === 1 ? "ist" : "sind"} nicht im Squad, für das das Event gedacht ist`);
    setLoading(false);
    router.refresh();
  }

  /** Namen/Usernamen (z.B. aus Discord kopiert, per Zeile/Komma getrennt) auf dem Server abgleichen und
   *  Treffer in die Auswahl übernehmen. Das eigentliche Hinzufügen läuft weiter über bulkAdd(). */
  async function applyPasteImport() {
    const names = pasteImportText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    const res = await fetch(`/api/events/${event.id}/member-search`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ names }),
    });
    if (!res.ok) { toast.error("Abgleich hat nicht geklappt"); return; }
    const data = await res.json() as { matched: User[]; unmatched: string[] };
    const fresh = data.matched.filter(u => !registeredIds.has(u.id));
    setKnownUsers(prev => ({ ...prev, ...Object.fromEntries(fresh.map(u => [u.id, u])) }));
    setBulkSelected(prev => [...new Set([...prev, ...fresh.map(u => u.id)])]);
    setPasteImportResult({ matched: fresh.length, unmatched: data.unmatched });
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
    // Hinweise vom Server: über der Höchstzahl bzw. nicht im Squad eingetragen
    if (data.overCapacity > 0) toast.warning(`Jetzt ${data.overCapacity} über der Höchstzahl von ${event.maxPlayers} Spielern`);
    if (data.notInSquad > 0) toast.warning(`${data.notInSquad} davon ${data.notInSquad === 1 ? "ist" : "sind"} nicht im Squad, für das das Event gedacht ist`);
    setBulkSelected([]);
    setLoading(false);
    router.refresh();
  }

  async function bulkAddSpectators() {
    if (!bulkSelectedSpectators.length) return;
    setLoading(true);
    const res = await fetch(`/api/events/${event.id}/bulk-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: bulkSelectedSpectators, role: "spectator" }),
    });
    const data = await res.json();
    toast.success(`${data.added} Zuschauer hinzugefügt${data.skipped ? `, ${data.skipped} bereits dabei` : ""}`);
    setBulkSelectedSpectators([]);
    setLoading(false);
    router.refresh();
  }

  // Vor dem Start heißt Löschen "Absagen" (Angemeldete werden benachrichtigt, siehe DELETE in
  // api/admin/events). Abgeschlossene Events löschen nur Mods (Belohnungen müssten zurückgebucht werden).
  // Zeitpunkt einmal beim Laden festhalten (Render bleibt rein; nach Speichern lädt router.refresh neu)
  const [loadedAt] = useState(() => Date.now());
  const isUpcoming = new Date(event.startAt).getTime() > loadedAt;
  const canDelete = isModerator || !event.completionData;
  async function deleteEvent() {
    const regs = event._count.registrations;
    if (!(await confirm(isUpcoming ? {
      title: "Event absagen",
      description: `„${event.title}“ absagen?\n\n${regs > 0 ? `${regs} Angemeldete bekommen eine Benachrichtigung. ` : ""}Das Event und die Discord-Ankündigung werden entfernt. Das lässt sich nicht rückgängig machen.`,
      variant: "danger",
      confirmLabel: "Absagen",
    } : {
      title: "Event löschen",
      description: `„${event.title}“ unwiderruflich löschen?\n\nDies entfernt ${regs} Anmeldung(en)${event.format ? " und das Turnier" : ""}.`,
      variant: "danger",
      typedConfirmText: "LÖSCHEN",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/events?eventId=${event.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setSavedSnapshot(formSnapshot); // keine Verlassen-Warnung mehr
      toast.success(isUpcoming ? `„${event.title}“ wurde abgesagt` : `„${event.title}“ wurde gelöscht`);
      router.push(event.series ? `/events/verwalten/reihen/${event.series.id}` : "/events/verwalten");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Fehler beim Löschen");
    }
  }

  /* Wenn die Eventreihe ein festes Spiel hat, werden Belohnungen/Turnier/Reihe zentral in der
     Reihe verwaltet — das Einzelevent zeigt nur noch Details + Teilnehmer. */
  const isSeriesEvent = !!event.series?.fixedGame;

  /* ── Tab definitions ── einheitlich: Details · Belohnungen · Teilnehmer · Turnier (· Reihe) */
  const bracketTab = event.format
    ? [{ key: "bracket" as TabKey, label: "Spielplan" }]
    : [];
  // Community-Ziel: eigener Reiter für alle Events (außer OMA Blocks — die Challenge hat ihr eigenes Ziel)
  const goalTab = isBlocksEvent ? [] : [{ key: "goal" as TabKey, label: "🎯 Ziel" }];
  const tabs: { key: TabKey; label: string }[] = isSeriesEvent
    ? [
        { key: "details",      label: "Details" },
        { key: "participants", label: `Teilnehmer (${event._count.registrations})` },
        ...bracketTab,
        ...goalTab,
      ]
    : [
        { key: "details",     label: "Details" },
        // Reihen-Termine: Teilnahme/Platzierung legt die Reihe fest, hier nur die Umfragen
        { key: "rewards",     label: "Belohnungen" },
        { key: "participants", label: `Teilnehmer (${event._count.registrations})` },
        // Turnier-Einstellungen und Turnierbaum sind ein gemeinsamer Reiter
        ...(hasTournament || event.type === "tournament" ? [{ key: "tournament" as TabKey, label: "Spielplan" }] : []),
        ...goalTab,
        // Sieger-Ermittlung ist nur bei Bracket-Formaten relevant — bei allen anderen Reihen
        // gewinnt am Ende schlicht, wer die meisten Rang-Punkte gesammelt hat.
        ...(event.series && (event.format === "single_elimination" || event.format === "double_elimination" || event.format === "group_knockout")
          ? [{ key: "series" as TabKey, label: "Reihe" }]
          : []),
      ];

  /* ── Turnierbaum-Daten (für Inline-Tab, analog zur admin/events/[id]/bracket-Seite) ── */
  const bracketWinnerStatKeys: string[] = (() => {
    if (!event.series?.seriesStatConfig) return [];
    try {
      const cfg = JSON.parse(event.series.seriesStatConfig) as { winnerStatKeys?: string[] };
      return cfg.winnerStatKeys ?? [];
    } catch { return []; }
  })();

  const bracketMatchWinStatKeys: string[] = (() => {
    if (!event.series?.seriesStatConfig) return [];
    try {
      const cfg = JSON.parse(event.series.seriesStatConfig) as { matchWinStatKeys?: string[] };
      return cfg.matchWinStatKeys ?? [];
    } catch { return []; }
  })();

  // Punkte je Platz — ausschließlich aus der Event-eigenen statConfigJson (Reiter "Turnier"), NIE aus
  // der Reihen-weiten seriesStatConfig: die Platzierungs-Erfassung pro Runde ist bewusst pro Event
  // konfigurierbar (siehe buildEventStatConfig/parseEventStatConfig oben).
  const bracketPlacementPoints: Record<string, number> | null = (() => {
    if (!event.statConfigJson) return null;
    try {
      const cfg = JSON.parse(event.statConfigJson) as { placementPoints?: Record<string, number> };
      return cfg.placementPoints && Object.keys(cfg.placementPoints).length > 0 ? cfg.placementPoints : null;
    } catch { return null; }
  })();

  const bracketTournament = event.format ? {
    id: event.id,
    status: event.tournamentStatus ?? "active",
    format: event.format,
    pointsConfig: event.pointsConfig,
    statFields: event.statFields,
    finalRankingJson: event.finalRankingJson,
    finalRankingNote: event.finalRankingNote,
    groupStageJson: event.groupStageJson,
    participants: event.participants,
    matches: event.matches,
  } : null;
  const bracketRegisteredUsers = registeredUsers.filter(u => registeredIds.has(u.id));

  /* ── Render ── */
  const nowDate = new Date(loadedAt);
  const savedStart = new Date(event.startAt);
  const savedEnd = event.endAt ? new Date(event.endAt) : null;
  const step = lifecycleStep({ status: event.status, startAt: savedStart, endAt: savedEnd }, nowDate);
  const playerCount = registeredIds.size;
  const completeHref = `/events/verwalten/${event.id}/complete`;
  const tournamentTab: TabKey = isSeriesEvent ? "bracket" : "tournament";
  const relTime = (d: Date) => {
    const ms = d.getTime() - nowDate.getTime();
    const abs = Math.abs(ms);
    const h = Math.round(abs / 3_600_000);
    const txt = h < 1 ? `${Math.max(1, Math.round(abs / 60_000))} Min` : h < 48 ? `${h} Std` : `${Math.round(h / 24)} Tagen`;
    return ms >= 0 ? `in ${txt}` : `seit ${txt}`;
  };
  // Spielwahl (Reihen-Termin): Stand und ggf. nächster Schritt — vorher sah man davon hier nichts,
  // erst beim Auslosen kam die Fehlermeldung
  const gv = event.gameVote as { status: string; opensAt: string | Date; closesAt: string | Date; winnerGameId: string | null; ballots: { userId: string }[] } | null | undefined;
  const fmtShort = (d: string | Date) => new Date(d).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const gameVoteLine = !gv ? null
    : gv.status === "prepared" ? `Spielwahl startet ${fmtShort(gv.opensAt)}`
    : gv.status === "open" ? `Spielwahl läuft bis ${fmtShort(gv.closesAt)} · ${gv.ballots.length} abgestimmt`
    : event.gameRulesPending ? (gv.winnerGameId ? "Spielwahl beendet, Regeln noch nicht freigegeben" : "Spielwahl ohne Ergebnis, Spiel noch festlegen")
    : null;
  const gameVoteStep = !gv ? null
    : event.gameRulesPending && gv.status === "closed" ? { label: gv.winnerGameId ? "Spiel und Regeln freigeben" : "Spiel festlegen", href: `/tournament/${event.id}#spielwahl` }
    : gv.status !== "closed" ? { label: "Zur Spielwahl", href: `/tournament/${event.id}#spielwahl` }
    : null;
  const statusLine = [
    gameVoteLine,
    step === 0 && `${playerCount}${event.maxPlayers ? ` von ${event.maxPlayers}` : ""} angemeldet`,
    step === 0 && `startet ${relTime(savedStart)}`,
    step === 1 && `läuft ${relTime(savedStart)}`,
    step === 1 && `${playerCount} dabei`,
    step === 2 && (event.status === "umfrage" ? "Umfragephase läuft" : `vorbei ${relTime(savedEnd ?? savedStart)}, noch nicht abgeschlossen`),
    step === 3 && (event.completionData ? "abgeschlossen, Belohnungen vergeben" : "beendet, ohne Abschluss"),
    step < 3 && (event.hidden ? "ausgeblendet"
      : event.discordMessageId ? "im Discord angekündigt"
      : event.approvalStatus === "pending" || event.series?.approvalStatus === "pending" ? "Discord-Ankündigung nach der Freigabe"
      : "noch nicht im Discord angekündigt"),
  ].filter(Boolean).join(" · ");
  const nextStep: { label: string; href?: string; tab?: TabKey } | null =
    step < 2 && gameVoteStep ? gameVoteStep
    : step === 2 ? { label: event.completionData ? "Abschluss bearbeiten" : "Event abschließen", href: completeHref }
    : step === 3 && event.completionData ? { label: "Ergebnisse ansehen", href: completeHref }
    : step === 1 && event.format ? { label: "Zum Spielplan", tab: tournamentTab }
    : step === 1 ? { label: "Event abschließen", href: completeHref }
    : null;
  const selectedPartners = allPartners.filter(p => selectedPartnerIds.includes(p.id));
  const backHref = event.series ? `/events/verwalten/reihen/${event.series.id}` : "/events/verwalten";

  return {
    event, squads, rewardLimits, router, session, isAdmin, isModerator, loading, setLoading, activeTab, setActiveTab, confirm, ConfirmDialogElement, status, setStatus, title, setTitle, description, setDescription, rules, setRules, game, setGame, genre, setGenre, category, setCategory, startAt, setStartAt, endAt, setEndAt, maxPlayers, setMaxPlayers, discordChannelId, setDiscordChannelId, propagateTitleDesc, setPropagateTitleDesc, isBlocksEvent, blocks, setBlocks, blocksKindLocked, blocksLockedReason, titleDescChanged, initialRewards, participationCoins, setParticipationCoins, placements, setPlacements, participationRankPts, setParticipationRankPts, eventKind, setEventKind, kindLocked, hasPlacement, polls, setPolls, initialSpectatorReward, spectatorCoins, setSpectatorCoins, spectatorRankPts, setSpectatorRankPts, initialTmtFormat, tmtFormat, setTmtFormat, tmtPlayHomeAway, setTmtPlayHomeAway, tmtPointsMode, setTmtPointsMode, tmtPoints, setTmtPoints, seriesStatRows, seriesStatFieldSet, tmtStatFields, setTmtStatFields, tmtExtraStatFields, tmtStatConfig, setTmtStatConfig, resolvedGoal, tmPointsCfg, tmAvgDirection, tmtLoading, setTmtLoading, hasTournament, hasStat, isRoundRobinFamily, isLiga, usesMatchResultPoints, resolvedTmtFormat, hidden, setHidden, registrationLocked, setRegistrationLocked, spectatorMode, setSpectatorMode, omaOriginal, setOmaOriginal, squadId, setSquadId, initialSeriesCfg, seriesWinnerMode, setSeriesWinnerMode, seriesWinnerStatField, setSeriesWinnerStatField, checkInEnabled, setCheckInEnabled, checkedInIds, setCheckedInIds, setPlayerCheckIn, twitchClipUrl, setTwitchClipUrl, coverImageUrl, setCoverImageUrl, allPartners, setAllPartners, selectedPartnerIds, setSelectedPartnerIds, partnersLoaded, setPartnersLoaded, partnersOpen, setPartnersOpen, registeredUsers, knownUsers, setKnownUsers, searchResults, searching, addableUsers, searchActive, toggleSelected, search, setSearch, bulkSelected, setBulkSelected, bulkSelectedSpectators, setBulkSelectedSpectators, pasteImportOpen, setPasteImportOpen, pasteImportText, setPasteImportText, pasteImportResult, setPasteImportResult, registeredIds, spectatorIds, userName, filteredUsers, seriesGame, seriesDiscord, updatePlacement, addPoll, updatePoll, removePoll, formSnapshot, savedSnapshot, setSavedSnapshot, dirty, changedCount, savedRef, discardChanges, handleSave, formTiming, pickStatus, saveTmtSettings, startTournament, removeUser, addSingleUser, applyPasteImport, bulkAdd, bulkAddSpectators, loadedAt, isUpcoming, canDelete, deleteEvent, isSeriesEvent, bracketTab, tabs, bracketWinnerStatKeys, bracketMatchWinStatKeys, bracketPlacementPoints, bracketTournament, bracketRegisteredUsers, nowDate, savedStart, savedEnd, step, playerCount, completeHref, tournamentTab, relTime, statusLine, nextStep, selectedPartners, backHref, goalStatus, goalMode, setGoalMode, goalForm, setGoalForm, goalCapable, goalSetupLoading, createGoalTracking, reevaluating, reevaluateGoal, undoCompletion, registrationClosesAt, setRegistrationClosesAt,
  };
}

export type EventEdit = ReturnType<typeof useEventEdit>;
