import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, Clock, Swords, StickyNote, Vote, Tv2, Eye, EyeOff, Clapperboard, CheckCircle2 } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import WinIcon from "@/components/WinIcon";
import CoinIcon from "@/components/CoinIcon";
import ClientTime from "@/components/ClientTime";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import EventLiveBadge from "./EventLiveBadge";
import EventSummarySection from "@/components/EventSummarySection";
import RegisterButton from "@/app/(dashboard)/events/RegisterButton";
import SpectatorRegisterButton from "./SpectatorRegisterButton";
import ClipSubmitter from "./ClipSubmitter";
import PollsSection from "./PollsSection";
import EventWinnerPredictionWidget from "./EventWinnerPredictionWidget";
import EventTippsList from "./EventTippsList";
import { EventCategory } from "@prisma/client";

const GENRE_MAP: Record<string, { label: string; icon: string }> = {
  arcade:    { label: "Arcade",     icon: "/Arcade Icon.png" },
  beat_em_up:{ label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  sport:     { label: "Sport",      icon: "/Sport Icon.png" },
  racing:    { label: "Racing",     icon: "/Racing Icon.png" },
  shooter:   { label: "Shooter",    icon: "/Shooter Icon.png" },
  community: { label: "Community",  icon: "/Community Icon.png" },
};
import StreamRegisterButton from "@/components/StreamRegisterButton";
import BracketView from "./BracketView";
import RoundRobinView from "./RoundRobinView";
import FfaView from "./FfaView";
import LigaView from "./LigaView";
import { getWanderpocalHoldersMap } from "@/lib/get-wanderpocal-holders";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { PREDICTION_MIN_WAGER } from "@/lib/predictions";
import { computeEventPoints, type StatConfig } from "@/lib/series-event-points";

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

const STATUS_STYLES: Record<string, { label: string; style: string; dot: string }> = {
  open:     { label: "Anmeldung offen", style: "bg-blue-900/50 text-blue-300",   dot: "bg-blue-400" },
  active:   { label: "Turnier läuft",   style: "bg-green-900/50 text-green-300", dot: "bg-green-400 animate-pulse" },
  closed:   { label: "Geschlossen",     style: "bg-amber-900/50 text-amber-300", dot: "bg-amber-400" },
  finished: { label: "Beendet",         style: "bg-gray-800 text-gray-500",      dot: "bg-gray-600" },
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "K.O.-System",
  double_elimination: "Double Elimination",
  round_robin:        "Jeder gegen Jeden",
  liga:               "Liga",
  ffa:                "Free for All",
  coop_stats:         "Kooperativ (Stats)",
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { id: eventId } = await params;
  const me    = await getSessionUser();
  const isMod = me?.role === "moderator" || me?.role === "admin";
  const isAdmin = me?.role === "admin";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      series: { select: { id: true, name: true, icon: true, hidden: true, seriesStatConfig: true, discordChannelId: true, pollConfigJson: true } },
      streamingPartners: { include: { partner: { include: { user: { select: { id: true } } } } } },
      communityStreamers: { include: { user: { select: { id: true, name: true, username: true, image: true, twitchLogin: true } } } },
      registrations: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true, points: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      participants: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { entries: true },
      },
      polls: {
        include: {
          votes: {
            include: { voter: { select: { id: true, name: true, username: true, image: true } } },
          },
        },
        orderBy: { startAt: "asc" },
      },
      clipSubmissions: true,
    },
  });

  if (!event) notFound();
  const isHidden = event.hidden || !!event.series?.hidden;
  if (isHidden && !isMod) notFound();

  const allRegistrations = event.registrations.map(r => ({ userId: r.userId, role: r.role, user: r.user }));
  const myClipSubmission = event.clipSubmissions.find(c => c.userId === userId) ?? null;

  const [holdersMap, myEventPrediction, minigamesConfig, allEventPredictions] = await Promise.all([
    getWanderpocalHoldersMap(),
    prisma.eventWinnerPrediction.findUnique({
      where: { userId_eventId: { userId, eventId } },
      include: { predictedUser: { select: { id: true, username: true, name: true, image: true } } },
    }),
    getMinigamesConfig(),
    // Tipps aller User (ohne Einsatz/Auszahlung — nur wer auf wen tippt, plus Pott-Gesamtsumme)
    prisma.eventWinnerPrediction.findMany({
      where: { eventId },
      select: {
        wager: true,
        correct: true,
        resolved: true,
        user: { select: { id: true, username: true, name: true, image: true } },
        predictedUser: { select: { id: true, username: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const holdersList = [...holdersMap.values()];
  const isPredictionLocked = event.status === "finished" || event.startAt < new Date();
  const predictionPot = allEventPredictions.reduce((sum, p) => sum + p.wager, 0);
  const eventTipps = allEventPredictions.map(p => ({
    user: p.user,
    predictedUser: p.predictedUser,
    resolved: p.resolved,
    correct: p.correct,
  }));

  const myReg         = event.registrations.find((r) => r.userId === userId);
  const isRegistered  = !!myReg && myReg.role !== "spectator";
  const isSpectator    = !!myReg && myReg.role === "spectator";
  const isFullEvent    = !!(event.maxPlayers && event.registrations.filter(r => r.role !== "spectator").length >= event.maxPlayers);
  const canRegister    = event.status === "open" || event.status === "active";
  const discordEventUrl = event.discordEventId && GUILD_ID
    ? `https://discord.com/events/${GUILD_ID}/${event.discordEventId}` : null;
  const discordChannelId = event.discordChannelId ?? event.series?.discordChannelId ?? null;
  const discordChannelUrl = discordChannelId && GUILD_ID
    ? `https://discord.com/channels/${GUILD_ID}/${discordChannelId}` : null;
  // Legacy Single-Poll-Konfiguration (nur für den "auf Discord abstimmen"-Link, falls keine
  // In-App-Umfrage (EventPoll) existiert)
  const legacyPollConfig: { enabled: boolean; question: string } | null = (() => {
    const raw = event.pollConfigJson ?? event.series?.pollConfigJson;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();
  const s = STATUS_STYLES[event.status] ?? STATUS_STYLES.finished;
  const hasTournament = !!event.format;

  // Alle bekannten Spieler: Turnier-Teilnehmer + Event-Registrierungen zusammenführen,
  // damit Match-Spieler auch dann aufgelöst werden wenn sie nicht als TournamentParticipant eingetragen sind
  type KnownUser = { id: string; name: string | null; username: string | null; image: string | null };
  type KnownParticipant = { userId: string; user: KnownUser; role?: string };
  const roleByUserId = new Map(event.registrations.map(r => [r.userId, r.role]));
  const mergedParticipants: KnownParticipant[] = hasTournament
    ? [
        ...event.participants.map(p => ({ userId: p.userId, user: p.user as KnownUser, role: roleByUserId.get(p.userId) ?? "player" })),
        ...event.registrations
          .filter(r => !event.participants.some(p => p.userId === r.userId))
          .map(r => ({ userId: r.user.id, user: r.user as KnownUser, role: r.role })),
      ]
    : [];

  // Teilnehmerliste: Mitspieler zuerst, dann Zuschauer, jeweils getrennt voneinander
  const sortedRegistrations = [...event.registrations].sort((a, b) => {
    const ra = a.role === "spectator" ? 1 : 0;
    const rb = b.role === "spectator" ? 1 : 0;
    return ra - rb;
  });

  // ── Umfragen (EventPoll) deduplizieren ──────────────────────────────────────
  // Ohne DB-Constraint auf (eventId, label) können durch doppelte Anlage-Aufrufe versehentlich
  // mehrere EventPoll-Zeilen mit demselben Label für ein Event entstehen. Für die Anzeige werden
  // solche Duplikate zu einer Umfrage zusammengeführt (Stimmen vereint), statt sie mehrfach zu zeigen.
  type RawPoll = (typeof event.polls)[number];
  function mergePollDuplicates(polls: RawPoll[]): RawPoll[] {
    const groups = new Map<string, RawPoll[]>();
    for (const p of polls) {
      const key = p.label.trim();
      const g = groups.get(key);
      if (g) g.push(p); else groups.set(key, [p]);
    }
    return [...groups.values()].map(group => {
      if (group.length === 1) return group[0];
      const base = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      const rewardsPaid = group.some(g => g.rewardsPaid);
      const winnerSource = group.find(g => g.rewardsPaid && g.winnerIds);
      const votesByVoter = new Map<string, RawPoll["votes"][number]>();
      for (const g of group) {
        for (const v of g.votes) {
          const existing = votesByVoter.get(v.voterId);
          if (!existing || v.updatedAt.getTime() > existing.updatedAt.getTime()) votesByVoter.set(v.voterId, v);
        }
      }
      return {
        ...base,
        startAt: new Date(Math.min(...group.map(g => g.startAt.getTime()))),
        endAt: new Date(Math.max(...group.map(g => g.endAt.getTime()))),
        rewardsPaid,
        winnerIds: winnerSource?.winnerIds ?? null,
        votes: [...votesByVoter.values()],
      };
    });
  }
  const mergedPolls = mergePollDuplicates(event.polls);

  // Wer hat in mindestens einer Umfrage abgestimmt? Auch Nicht-Teilnehmende können abstimmen
  // (bei voterEligibility "all"), daher separat als "Externe Wähler" auflisten.
  const registeredUserIds = new Set(event.registrations.map(r => r.userId));
  const voterUserMap = new Map<string, KnownUser>();
  for (const poll of mergedPolls) {
    for (const v of poll.votes) {
      if (v.voter && !voterUserMap.has(v.voterId)) voterUserMap.set(v.voterId, v.voter as KnownUser);
    }
  }
  const votedUserIds = new Set(voterUserMap.keys());
  const externalVoters = [...voterUserMap.values()].filter(u => !registeredUserIds.has(u.id));
  // Ligapunkte (Reihenpunkte) für die reine Stimmabgabe — wenn vorhanden, sollen externe Wähter
  // auch im Gesamtranking auftauchen, da sie dafür Punkte für die Reihen-Tabelle erhalten
  const hasVoteSeriesPoints = mergedPolls.some(p => p.participationSeriesPoints > 0);
  const format = event.format ?? "single_elimination";
  const isFfa         = format === "ffa" || format === "coop_stats" || format === "avg_stats";
  const isElimination = format === "single_elimination" || format === "double_elimination";
  const isRoundRobin  = format === "round_robin";
  const isLiga        = format === "liga";

  const userName = (u: { name: string | null; username: string | null }) =>
    u.username ?? u.name ?? "Unbekannt";

  // Turnersieger ermitteln
  let winner: { name: string | null; username: string | null; image: string | null } | null = null;
  if (hasTournament) {
    if (isElimination) {
      const maxRound = event.matches.length ? Math.max(...event.matches.map(m => m.round)) : 0;
      const finalMatch = event.matches.find(m => m.round === maxRound);
      winner = finalMatch?.winnerId
        ? (mergedParticipants.find(p => p.userId === finalMatch.winnerId)?.user ?? null)
        : null;
    } else if (isLiga) {
      const winsMap = new Map<string, number>();
      for (const m of event.matches) {
        if (m.winnerId) winsMap.set(m.winnerId, (winsMap.get(m.winnerId) ?? 0) + 1);
      }
      const topId = [...winsMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      winner = topId ? (mergedParticipants.find(p => p.userId === topId)?.user ?? null) : null;
    } else if (isFfa) {
      const winnerEntry = event.matches
        .flatMap(m => m.entries)
        .find(e => e.placement === 1);
      winner = winnerEntry?.userId
        ? (mergedParticipants.find(p => p.userId === winnerEntry.userId)?.user ?? null)
        : null;
    }
  }

  // Completion-Daten (Poll-Gewinner etc.)
  type CompletionData = {
    pollWinnerId?: string | null;
    pollWinnerIds?: string[] | null;
    pollLabel?: string | null;
    pollBonusPoints?: number | null;
    pollBonusCoins?: number | null;
    pollBonusRankPoints?: number | null;
    pollExcludedUserIds?: string[] | null;
    finalRankingGroups?: string[][] | null;
    gamePhaseComplete?: boolean;
    pollPhaseComplete?: boolean;
  };
  const completionData: CompletionData = (() => {
    try { return event.completionData ? JSON.parse(event.completionData as string) : {}; } catch { return {}; }
  })();
  const pollWinnerIds: string[] = completionData.pollWinnerIds ??
    (completionData.pollWinnerId ? [completionData.pollWinnerId] : []);
  const pollLabel         = completionData.pollLabel ?? null;
  const pollBonusCoins    = completionData.pollBonusCoins ?? completionData.pollBonusPoints ?? null;
  const pollBonusRankPts  = completionData.pollBonusRankPoints ?? null;
  const rankingGroups     = completionData.finalRankingGroups ?? null;
  const gamePhaseComplete   = completionData.gamePhaseComplete === true;
  const pollPhaseComplete   = completionData.pollPhaseComplete === true;
  const hasPendingPoll      = gamePhaseComplete && !pollPhaseComplete && !!pollLabel;
  const pollExcludedUserIds = new Set(completionData.pollExcludedUserIds ?? []);

  // Umfragen fürs Rendern aufbereiten: Stimmenzahl, eigene Stimme, Kandidatenliste sowie das
  // Ergebnis — offiziell vom Admin bestätigt (rewardsPaid + winnerIds), sonst sobald die Umfrage
  // beendet ist aus den Stimmen ermittelt (auch bei Gleichstand mit mehreren Siegern), damit der/die
  // Sieger auch angezeigt werden wenn die Belohnung noch nicht manuell ausgezahlt wurde.
  type PollDisplay = {
    id: string; label: string; question: string; voterEligibility: string; answerType: string;
    customAnswers: string[]; startAt: Date; endAt: Date; rewardsPaid: boolean;
    participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number;
    voteCounts: Record<string, number>; myVote: string | null;
    answerOptions: { id: string; name: string | null; username: string | null; image: string | null }[] | null;
    excludedUserIds: string[];
    effectiveWinnerIds: string[];
  };
  const pollDisplays: PollDisplay[] = mergedPolls.map(poll => {
    let excludedUserIds: string[] = [];
    if (poll.excludedUserIds) { try { excludedUserIds = JSON.parse(poll.excludedUserIds); } catch { /* ignore */ } }
    const excludedSet = new Set(excludedUserIds);

    const voteCounts: Record<string, number> = {};
    let myVote: string | null = null;
    for (const v of poll.votes) {
      if (excludedSet.has(v.targetId)) continue;
      voteCounts[v.targetId] = (voteCounts[v.targetId] ?? 0) + 1;
      if (v.voterId === userId) myVote = v.targetId;
    }
    let customAnswers: string[] = [];
    if (poll.customAnswers) { try { customAnswers = JSON.parse(poll.customAnswers); } catch { /* ignore */ } }

    let effectiveWinnerIds: string[] = [];
    if (poll.rewardsPaid && poll.winnerIds) {
      try { effectiveWinnerIds = JSON.parse(poll.winnerIds); } catch { /* ignore */ }
    }
    if (effectiveWinnerIds.length === 0 && poll.endAt <= new Date()) {
      const entries = Object.entries(voteCounts).filter(([, c]) => c > 0);
      if (entries.length > 0) {
        const max = Math.max(...entries.map(([, c]) => c));
        effectiveWinnerIds = entries.filter(([, c]) => c === max).map(([uid]) => uid);
      }
    }

    let answerOptions: PollDisplay["answerOptions"] = null;
    if (poll.answerType === "players") {
      answerOptions = allRegistrations.filter(r => r.role === "player" && !excludedSet.has(r.user.id)).map(r => r.user);
    } else if (poll.answerType === "spectators") {
      answerOptions = allRegistrations.filter(r => r.role === "spectator" && !excludedSet.has(r.user.id)).map(r => r.user);
    }

    return {
      id: poll.id, label: poll.label, question: poll.question,
      voterEligibility: poll.voterEligibility, answerType: poll.answerType,
      customAnswers, startAt: poll.startAt, endAt: poll.endAt,
      rewardsPaid: poll.rewardsPaid,
      participationCoins: poll.participationCoins, participationSeriesPoints: poll.participationSeriesPoints,
      winnerCoins: poll.winnerCoins, winnerRankPoints: poll.winnerRankPoints,
      voteCounts, myVote, answerOptions, excludedUserIds, effectiveWinnerIds,
    };
  });

  // Neue DB-basierte Umfragen (EventPoll): pro Gewinner alle gewonnenen Umfrage-Labels sammeln,
  // und je Umfrage die (ggf. aus den Stimmen abgeleiteten) Gewinner-IDs fürs Ergebnis-Badge auflösen
  const pollWinsByUser: Record<string, string[]> = {};
  const completedPolls: { id: string; label: string; winnerIds: string[] }[] = [];
  for (const p of pollDisplays) {
    if (p.effectiveWinnerIds.length === 0) continue;
    for (const uid of p.effectiveWinnerIds) (pollWinsByUser[uid] ??= []).push(p.label);
    completedPolls.push({ id: p.id, label: p.label, winnerIds: p.effectiveWinnerIds });
  }
  // Umfragen mit Ergebnis werden bereits oben als Gewinner-Karte angezeigt —
  // daher aus der Abstimmungs-Übersicht (PollsSection) ausschließen, um Doppelanzeige zu vermeiden
  const completedPollIds = new Set(completedPolls.map(p => p.id));

  // Teilnahme-Münzen (aus placementRewardsJson oder Fallback auf pointReward)
  const participationCoins: number = (() => {
    if (event.placementRewardsJson) {
      try {
        const r = JSON.parse(event.placementRewardsJson) as { participationCoins?: number };
        if (r.participationCoins != null) return r.participationCoins;
      } catch { /* ignore */ }
    }
    return event.pointReward ?? 0;
  })();

  // Ligapunkte pro Stat-Einheit aus der Reihen-Tabellenkonfiguration (für die Punkte-Anzeige je Stat)
  const seriesStatCfg: StatConfig = (() => {
    if (!event.series?.seriesStatConfig) return { participationPoints: 0, stats: [] };
    try { return JSON.parse(event.series.seriesStatConfig) as StatConfig; }
    catch { return { participationPoints: 0, stats: [] }; }
  })();
  const statPointsPer: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    for (const s of seriesStatCfg.stats ?? []) if (s.field) map[s.field] = s.pointsPer;
    return map;
  })();
  // Ligapunkte, die dieses Event je Spieler beigesteuert hat — identische Berechnung wie in der
  // Gesamttabelle der Eventreihe (Teilnahme + Stats + Umfrage-Belohnungen alt & neu)
  const ligaPunkteByUser: Record<string, number> = event.series
    ? computeEventPoints(
        { completionData: event.completionData, registrations: event.registrations, matches: event.matches },
        seriesStatCfg,
      ).pointsByUser
    : {};

  // Punkte pro Platzierung aus pointsConfig
  type PcVal = number | { coins?: number; points?: number };
  const pcRaw: Record<string, PcVal> = (() => {
    try { return event.pointsConfig ? JSON.parse(event.pointsConfig) : {}; } catch { return {}; }
  })();
  function placementCoins(place: number): number {
    const v = pcRaw[String(place)];
    if (!v) return 0;
    return typeof v === "number" ? v : (v.coins ?? 0);
  }
  function placementRankPts(place: number): number {
    if (place > 3) return 0;
    const v = pcRaw[String(place)];
    if (!v) return 0;
    return typeof v === "number" ? v : (v.points ?? v.coins ?? 0);
  }

  // Genre + Streaming-Partner + Community-Streamer + 1st-place reward
  const genre = (event as unknown as Record<string, unknown>).genre as string | null | undefined;
  const genreInfo = genre ? (GENRE_MAP[genre] ?? null) : null;
  type PartnerEntry = { partner: { id: string; name: string; twitchLogin: string; logoUrl: string; user?: { id: string } | null } };
  type CommunityStreamerEntry = { user: { id: string; name: string | null; username: string | null; image: string | null; twitchLogin: string | null } };
  const streamingPartners = (event as unknown as { streamingPartners?: PartnerEntry[] }).streamingPartners ?? [];
  const communityStreamers = (event as unknown as { communityStreamers?: CommunityStreamerEntry[] }).communityStreamers ?? [];

  const isPartnerStreamer = streamingPartners.some(sp => sp.partner.user?.id === userId);
  const isCommunityStreamer = communityStreamers.some(cs => cs.user.id === userId);
  const canStreamRegister = canRegister && !isPartnerStreamer;
  const partnerUserIds = new Set(streamingPartners.map(sp => sp.partner.user?.id).filter(Boolean));
  const filteredCommunityStreamers = communityStreamers.filter(cs => !partnerUserIds.has(cs.user.id));
  const rewardsData: { placements?: { place: number; coins: number; rankPoints: number }[] } | null = (() => {
    const raw = (event as unknown as Record<string, unknown>).placementRewardsJson;
    if (!raw) return null;
    try { return (typeof raw === "string" ? JSON.parse(raw) : raw) as { placements?: { place: number; coins: number; rankPoints: number }[] }; } catch { return null; }
  })();
  const firstPlace = rewardsData?.placements?.find(p => p.place === 1) ?? null;
  // Turnier-Formate (ffa/coop_stats/avg_stats/…) speichern ihre Platzierungsbelohnungen in
  // pointsConfig statt placementRewardsJson — hier beide Quellen zusammenführen, damit die
  // Hero-Section für jedes Turnierformat den echten 1.-Platz-Preis zeigt.
  const heroFirstPlaceCoins    = firstPlace?.coins      ?? placementCoins(1);
  const heroFirstPlaceRankPts  = firstPlace?.rankPoints ?? placementRankPts(1);
  const hasHeroFirstPlace      = heroFirstPlaceCoins > 0 || heroFirstPlaceRankPts > 0;
  const date = new Date(event.startAt);
  const serverTimeFallback = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  // Stats für Header
  const playedMatches = event.matches.filter(m =>
    isElimination ? !!m.winnerId : !!m.playedAt
  ).length;
  const totalMatches = event.matches.length;

  // Umfragen ohne (bestätigtes oder abgeleitetes) Ergebnis fürs Voting-Widget aufbereiten —
  // Umfragen mit Ergebnis laufen bereits oben in die Gewinner-Karte (completedPolls)
  type InitialPoll = {
    id: string; label: string; question: string; voterEligibility: string; answerType: string;
    customAnswers: string[]; startAt: string; endAt: string; rewardsPaid: boolean;
    winnerIds: string[] | null; participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number;
    voteCounts: Record<string, number>; myVote: string | null;
    answerOptions: { id: string; name: string | null; username: string | null; image: string | null }[] | null;
    excludedUserIds: string[];
  };
  const initialPolls: InitialPoll[] = pollDisplays
    .filter(p => !completedPollIds.has(p.id))
    .map((p): InitialPoll => ({
      id: p.id, label: p.label, question: p.question,
      voterEligibility: p.voterEligibility, answerType: p.answerType,
      customAnswers: p.customAnswers, startAt: p.startAt.toISOString(), endAt: p.endAt.toISOString(),
      rewardsPaid: p.rewardsPaid, winnerIds: null,
      participationCoins: p.participationCoins, participationSeriesPoints: p.participationSeriesPoints,
      winnerCoins: p.winnerCoins, winnerRankPoints: p.winnerRankPoints,
      voteCounts: p.voteCounts, myVote: p.myVote, answerOptions: p.answerOptions, excludedUserIds: p.excludedUserIds,
    }));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href="/events" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit group">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        {event.series && (
          <Link
            href={`/events/series/${event.series.id}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500/20 transition-colors font-medium"
          >
            <SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" />
            {event.series.name} – Gesamttabelle
          </Link>
        )}
      </div>

      {/* ── Ausgeblendet-Banner (nur für Admins/Mods sichtbar) ────────────── */}
      {isHidden && isMod && (
        <div className="glass rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 border border-rose-500/20 bg-rose-500/[0.04]">
          <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">
            <span className="font-semibold">Ausgeblendet</span> — {event.series?.hidden ? "die Eventreihe" : "dieses Event"} ist für normale Nutzer nicht sichtbar. Nur Admins/Mods können diese Seite über den Link aufrufen.
          </p>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold text-white">{event.title}</h1>
              {hasTournament && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/30 text-rose-300 border border-rose-800/30">
                  {FORMAT_LABELS[format] ?? format}
                </span>
              )}
              {event.category && (
                <EventCategoryBadge category={event.category as EventCategory} />
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {(event.game || genreInfo) && (
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  {event.game && <span>{event.game}</span>}
                  {genreInfo && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Image src={genreInfo.icon} alt={genreInfo.label} width={12} height={12} className="object-contain" />
                      {genreInfo.label}
                    </span>
                  )}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                <ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /> Uhr
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.style}`}>{s.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="glass-heavy rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{event.registrations.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Teilnehmer</p>
          </div>
          <div className="glass-heavy rounded-xl p-3 text-center">
            {hasHeroFirstPlace ? (
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <span className="text-sm">🥇</span>
                {heroFirstPlaceCoins > 0 && (
                  <span className="flex items-center gap-0.5 text-sm font-semibold text-amber-400">
                    <Image src="/Muenze Icon.png" alt="Münzen" width={14} height={14} className="object-contain" />
                    {heroFirstPlaceCoins}
                  </span>
                )}
                {heroFirstPlaceRankPts > 0 && (
                  <span className="flex items-center gap-0.5 text-sm font-semibold text-teal-400">
                    <RankPointsIcon size={14} />
                    {heroFirstPlaceRankPts}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-lg font-semibold text-rose-400">+{participationCoins}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{hasHeroFirstPlace ? "1. Platz" : "Münzen"}</p>
          </div>
          <div className="glass-heavy rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">
              {hasTournament ? `${playedMatches}/${totalMatches}` : "–"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Matches gespielt</p>
          </div>
        </div>

        {event.description && (
          <p className="mt-4 text-sm text-gray-400 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        )}

        {winner && (
          <div className="mt-4 flex items-center gap-3 bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
            <WinIcon size={20} />
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Turniersieger</p>
              <p className="text-white font-semibold">{userName(winner)}</p>
            </div>
          </div>
        )}

        {(streamingPartners.length > 0 || filteredCommunityStreamers.length > 0) && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Tv2 className="w-3.5 h-3.5 text-[#9146ff] shrink-0" />
              <span className="text-xs text-gray-500 font-medium">Live übertragen von:</span>
              {streamingPartners.map(({ partner: p }) => (
                <a
                  key={p.id}
                  href={`https://twitch.tv/${p.twitchLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                  style={{ background: "rgba(145,70,255,0.12)", border: "1px solid rgba(145,70,255,0.25)", color: "#c4a3ff" }}
                >
                  <Image src={p.logoUrl} alt={p.name} width={16} height={16} className="rounded-full shrink-0" />
                  {p.name}
                  <span className="opacity-50 text-[10px]">↗</span>
                </a>
              ))}
              {filteredCommunityStreamers.map(({ user: u }) => (
                u.twitchLogin ? (
                  <a
                    key={u.id}
                    href={`https://twitch.tv/${u.twitchLogin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                    style={{ background: "rgba(145,70,255,0.08)", border: "1px solid rgba(145,70,255,0.18)", color: "#c4a3ff" }}
                  >
                    {u.image && <Image src={u.image} alt={u.name ?? u.username ?? ""} width={16} height={16} className="rounded-full shrink-0" />}
                    {u.name ?? u.username}
                    <span className="opacity-50 text-[10px]">↗</span>
                  </a>
                ) : (
                  <span
                    key={u.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
                  >
                    {u.image && <Image src={u.image} alt={u.name ?? u.username ?? ""} width={16} height={16} className="rounded-full shrink-0" />}
                    {u.name ?? u.username}
                  </span>
                )
              ))}
            </div>
            {streamingPartners.length > 0 && (
              <EventLiveBadge
                twitchLogins={streamingPartners.map(sp => sp.partner.twitchLogin.toLowerCase())}
              />
            )}
          </div>
        )}
        {canStreamRegister && (
          <div className="mt-3">
            <StreamRegisterButton eventId={eventId} isStreaming={isCommunityStreamer} />
          </div>
        )}

        {userId && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {canRegister && (
              <RegisterButton eventId={event.id} isRegistered={isRegistered} isFull={isFullEvent && !isRegistered} discordEventUrl={discordEventUrl} />
            )}
            {canRegister && event.spectatorMode && !isRegistered && (
              <SpectatorRegisterButton eventId={event.id} isSpectator={isSpectator} />
            )}
            {event.status === "umfrage" && discordChannelUrl && initialPolls.length === 0 && (
              <a href={discordChannelUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/20 hover:border-amber-500/40 px-3 py-1.5 rounded-xl font-medium">
                <Vote className="w-3.5 h-3.5" />
                {legacyPollConfig?.question ? `Jetzt für „${legacyPollConfig.question}" abstimmen` : "Jetzt abstimmen"} ↗
              </a>
            )}
            {discordEventUrl && (
              <a href={discordEventUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-teal-400 transition-colors">
                In Discord ansehen ↗
              </a>
            )}
          </div>
        )}

        {!isRegistered && (
          <div className="mt-4 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-xl px-3 py-2">
            Du bist bei diesem Event nicht angemeldet.
          </div>
        )}
      </div>

      {/* ── Event-Gesamtsieger-Vorhersage ─────────────────────────────── */}
      <div className="mb-5 space-y-3">
        <EventWinnerPredictionWidget
          eventId={event.id}
          locked={isPredictionLocked}
          minWager={PREDICTION_MIN_WAGER}
          maxWager={minigamesConfig.predictionMaxWager}
          initialPrediction={myEventPrediction}
        />
        <EventTippsList pot={predictionPot} tipps={eventTipps} />
      </div>

      {/* ── Laufende Umfrage ───────────────────────────────────────────── */}
      {hasPendingPoll && (
        <div className="glass rounded-2xl p-5 mb-5 space-y-3 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <Vote className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Abstimmung läuft</h2>
          </div>
          <p className="text-xs text-violet-300/80">
            Thema: <span className="font-medium text-violet-200">{pollLabel}</span>
          </p>
          {(pollBonusCoins ?? 0) > 0 || (pollBonusRankPts ?? 0) > 0 ? (
            <div className="flex items-center gap-3">
              {(pollBonusCoins ?? 0) > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  Gewinner erhält +{pollBonusCoins} <CoinIcon size={13} />
                </span>
              )}
              {(pollBonusRankPts ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  +{pollBonusRankPts} <RankPointsIcon size={13} />
                </span>
              )}
            </div>
          ) : null}
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">Kandidaten</p>
            {event.registrations.filter(({ user }) => !pollExcludedUserIds.has(user.id)).map(({ user }) => {
              const isMe = user.id === userId;
              const name = user.username ?? user.name ?? "Unbekannt";
              return (
                <div key={user.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-violet-500/[0.04] border border-violet-500/10 ${isMe ? "ring-1 ring-teal-500/30" : ""}`}>
                  {user.image
                    ? <img src={user.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                    : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                  }
                  <span className={`text-sm ${isMe ? "text-teal-300 font-medium" : "text-gray-200"}`}>
                    {name}{isMe && <span className="text-xs text-gray-500 ml-1.5">(du)</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Umfrage-Übersicht ──────────────────────────────────────────── */}
      {pollWinnerIds.length > 0 && pollLabel && (() => {
        return (
          <div className="glass rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">{pollLabel}</h2>
            </div>
            <div className="space-y-1.5">
              {pollWinnerIds.map(uid => {
                const participant = mergedParticipants.find(p => p.userId === uid);
                const user = participant?.user;
                const name = user ? (user.name || user.username || "Unbekannt") : "Unbekannt";
                const isMe = uid === userId;
                return (
                  <div key={uid} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 ${isMe ? "ring-1 ring-teal-500/30" : ""}`}>
                    <span className="text-base shrink-0">🏆</span>
                    {user?.image
                      ? <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isMe ? "text-teal-300" : "text-violet-200"}`}>
                        {name}{isMe && <span className="text-xs text-gray-500 ml-1.5">(du)</span>}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(pollBonusCoins ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-violet-400/80">+{pollBonusCoins} <CoinIcon size={11} /></span>
                        )}
                        {(pollBonusRankPts ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-violet-400/80">
                            +{pollBonusRankPts} <RankPointsIcon size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pollWinnerIds.length > 1 && (
                <p className="text-[11px] text-gray-600 px-1">
                  Alle {pollWinnerIds.length} Gewinner erhalten dieselbe Belohnung (Gleichstand).
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Umfrage-Übersicht (neue DB-basierte Umfragen) ─────────────────── */}
      {completedPolls.length > 0 && (
        <div className="space-y-3 mb-5">
          {completedPolls.map(poll => {
            const winnerIds = poll.winnerIds;
            return (
              <div key={poll.id} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white">{poll.label}</h2>
                </div>
                <div className="space-y-1.5">
                  {winnerIds.map(uid => {
                    const participant = mergedParticipants.find(p => p.userId === uid);
                    const user = participant?.user;
                    const name = user ? (user.name || user.username || "Unbekannt") : "Unbekannt";
                    const isMe = uid === userId;
                    return (
                      <div key={uid} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 ${isMe ? "ring-1 ring-teal-500/30" : ""}`}>
                        <span className="text-base shrink-0">🏆</span>
                        {user?.image
                          ? <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                          : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                              {name[0]?.toUpperCase() ?? "?"}
                            </div>
                        }
                        <span className={`text-sm font-medium ${isMe ? "text-teal-300" : "text-violet-200"}`}>
                          {name}{isMe && <span className="text-xs text-gray-500 ml-1.5">(du)</span>}
                        </span>
                      </div>
                    );
                  })}
                  {winnerIds.length > 1 && (
                    <p className="text-[11px] text-gray-600 px-1">
                      Alle {winnerIds.length} Gewinner erhalten dieselbe Belohnung (Gleichstand).
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Abstimmungen: erst sichtbar/abstimmbar, sobald die Spielphase abgeschlossen ist (auch wenn
           die zugrunde liegenden EventPoll-Datensätze technisch schon vorher existieren) — vorher nur
           ein Hinweis, welche Umfragen danach starten. ────────────────────────────────────────────── */}
      {gamePhaseComplete && initialPolls.length > 0 && (
        <div className="mb-5">
          <PollsSection
            eventId={event.id}
            userId={userId}
            initialPolls={initialPolls}
            eventRegistrations={allRegistrations}
            isAdmin={isAdmin}
          />
        </div>
      )}
      {!gamePhaseComplete && initialPolls.length > 0 && (
        <div className="glass rounded-2xl px-4 py-3 mb-5 flex items-start gap-2">
          <Vote className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-500 leading-relaxed">
            <p>
              Nach Abschluss der Spielphase {initialPolls.length === 1 ? "startet folgende Umfrage" : "starten folgende Umfragen"}:
            </p>
            <ul className="mt-1 space-y-0.5">
              {initialPolls.map(p => (
                <li key={p.id} className="text-gray-400">
                  „{p.label}"{p.question ? <span className="text-gray-600"> – {p.question}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Eventbericht ──────────────────────────────────────────────── */}
      {event.status === "finished" && event.summary && (
        <div className="mb-5">
          <EventSummarySection summary={event.summary} />
        </div>
      )}

      {/* ── Twitch-Clip (Admin-Highlight) ────────────────────────────── */}
      {event.twitchClipUrl && (
        <div className="glass rounded-2xl p-4 mb-5" style={{ border: "1px solid rgba(145,70,255,0.15)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Clapperboard className="w-4 h-4 text-[#9146ff]" />
            <span className="text-sm font-semibold text-gray-300">Event-Highlight</span>
          </div>
          <a href={event.twitchClipUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#9146ff] hover:text-purple-300 transition-colors">
            Clip auf Twitch ansehen ↗
          </a>
        </div>
      )}

      {/* ── Clip-Einreichung (für Teilnehmer nach Event) ─────────────── */}
      {event.status === "finished" && userId && isRegistered && (
        <div className="glass rounded-2xl p-4 mb-5" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-300">Deinen Twitch-Clip einreichen</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Hattest du einen guten Moment im Stream? Reiche deinen Clip ein.</p>
          <ClipSubmitter eventId={event.id} existingClipUrl={myClipSubmission?.clipUrl ?? null} />
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Teilnehmerliste */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Teilnehmer
            </h2>
            <div className="glass rounded-2xl divide-y divide-white/5">
              {sortedRegistrations.map(({ user, role }, i) => {
                const isMe = user.id === userId;
                const wins = event.matches.filter(m => m.winnerId === user.id).length;
                const wonLabels = [
                  ...(pollWinnerIds.includes(user.id) && pollLabel ? [pollLabel] : []),
                  ...(pollWinsByUser[user.id] ?? []),
                ];
                const isSpectatorRow = role === "spectator";
                const showDivider = isSpectatorRow && (i === 0 || sortedRegistrations[i - 1].role !== "spectator");
                return (
                  <div key={user.id}>
                    {showDivider && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02]">
                        <Eye className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Zuschauer</span>
                      </div>
                    )}
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? "bg-rose-950/30" : ""}`}>
                      <span className="text-xs text-gray-700 w-4 shrink-0 text-center">{i + 1}</span>
                      {user.image ? (
                        <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-rose-900/30 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">
                          {userName(user)[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate font-medium flex items-center gap-1.5 ${isMe ? "text-rose-300" : "text-white"}`}>
                          <span className="truncate">{userName(user)}{isMe && " (du)"}</span>
                          {isSpectatorRow && <Eye className="w-3 h-3 text-gray-500 shrink-0" />}
                          {votedUserIds.has(user.id) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Abgestimmt
                            </span>
                          )}
                        </p>
                        {wonLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {wonLabels.map(label => (
                              <span key={label} className="flex items-center gap-0.5 text-[10px] font-semibold text-violet-400">
                                <Vote className="w-2.5 h-2.5" /> {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {wins > 0 && <span className="text-xs text-emerald-400 shrink-0">{wins}W</span>}
                    </div>
                  </div>
                );
              })}
              {externalVoters.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02]">
                    <Vote className="w-3 h-3" style={{ color: "#14b8a6" }} />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Externe Wähler</span>
                  </div>
                  {externalVoters.map((user, i) => {
                    const isMe = user.id === userId;
                    return (
                      <div key={user.id} className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? "bg-rose-950/30" : ""}`}>
                        <span className="text-xs text-gray-700 w-4 shrink-0 text-center">{i + 1}</span>
                        {user.image ? (
                          <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-rose-900/30 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">
                            {userName(user)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate font-medium flex items-center gap-1.5 ${isMe ? "text-rose-300" : "text-white"}`}>
                            <span className="truncate">{userName(user)}{isMe && " (du)"}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Abgestimmt
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Format-spezifische Ansicht */}
          <div className="lg:col-span-3">
            {!hasTournament && (
              <div className="glass rounded-2xl p-10 text-center">
                <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="text-gray-400 font-medium">Kein Turnier-Spielplan für dieses Event.</p>
                <p className="text-gray-600 text-sm mt-1">Dieses Event läuft ohne Turnierbaum.</p>
              </div>
            )}
            {isElimination && (
              <BracketView
                matches={event.matches as Parameters<typeof BracketView>[0]["matches"]}
                participants={mergedParticipants}
                userId={userId}
                holders={holdersList}
              />
            )}
            {isRoundRobin && (
              <RoundRobinView
                matches={event.matches as Parameters<typeof RoundRobinView>[0]["matches"]}
                participants={mergedParticipants}
                userId={userId}
                finalRankingNote={gamePhaseComplete ? event.finalRankingNote : null}
              />
            )}
            {isLiga && (
              <LigaView
                matches={event.matches as Parameters<typeof LigaView>[0]["matches"]}
                participants={mergedParticipants}
                userId={userId}
                finalRankingNote={gamePhaseComplete ? event.finalRankingNote : null}
              />
            )}
            {isFfa && (
              <FfaView
                matches={event.matches as Parameters<typeof FfaView>[0]["matches"]}
                participants={mergedParticipants}
                statFields={event.statFields ? JSON.parse(event.statFields) : []}
                statPointsPer={statPointsPer}
                ligaPunkteByUser={ligaPunkteByUser}
                userId={userId}
                format={format}
                finalRankingGroups={rankingGroups}
                pollWinnerIds={pollWinnerIds}
                pollLabel={pollLabel}
                pollWinsByUser={pollWinsByUser}
                votedUserIds={[...votedUserIds]}
                externalVoters={hasVoteSeriesPoints ? externalVoters.map(u => ({ userId: u.id, user: u })) : []}
                finalRankingNote={gamePhaseComplete ? event.finalRankingNote : null}
              />
            )}
          </div>
        </div>
    </div>
  );
}
