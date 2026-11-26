import React from "react";
import { Glyph } from "@/components/ui/Glyph";
import { buttonClasses } from "@/components/ui/button-styles";
import { eventHasPlacement, eventRewardOf, participationRewardOf } from "@/lib/event-placement";
import PlaceMedal from "@/components/PlaceMedal";
import { isOmaOriginal } from "@/lib/oma-original";
import { genreMeta } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent, getSessionUser } from "@/lib/roles";
import { isAwaitingApproval } from "@/lib/community-events";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ChevronDown, CalendarPlus, Lock, Gamepad2, MessageCircle } from "@/components/icons";
import { GateButton } from "@/components/GuestGate";
import { ArrowLeft, Swords, Vote, EyeOff, Clapperboard, Settings, ExternalLink } from "@/components/icons";
import { isPeriodEvent, periodInfo } from "@/lib/event-period";
import { waitlistPosition } from "@/lib/event-waitlist";
import RulesSection from "@/components/RulesSection";
import RankedAvatar from "@/components/RankedAvatar";
import EventComments from "@/components/events/EventComments";
import SectionJumpLink from "@/components/SectionJumpLink";
import { getCommentCounts, getLatestCommentStatuses } from "@/lib/event-comments";
import StyledUserName from "@/components/cosmetics/StyledUserName";
import BotPreviewShell from "@/components/BotPreviewShell";
import RankPointsIcon from "@/components/RankPointsIcon";
import CoinIcon from "@/components/CoinIcon";
import { FORMAT_LABELS } from "@/lib/tournament-formats";
import { formatBerlinDateTime, formatBerlinTime } from "@/lib/time";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { cachedInMemory } from "@/lib/memory-cache";
import { TONE_CLASSES, dateBlock, eventPhase, parseRanking, startsInLabel } from "@/lib/event-display";
import { SECTION_ORDER, isPrePhase, pagePhaseOf, type SectionKey } from "./event-page-layout";
import { EventTimeline, eventTimeline } from "./EventHowTo";
import MyEventResult from "./MyEventResult";
import ActionMoreMenu from "./ActionMoreMenu";
import EventHero from "./EventHero";
import EventFacts from "./EventFacts";
import { FACT } from "./event-facts-style";
import EventJumpBar from "./EventJumpBar";
import EventParticipantList from "./EventParticipantList";
import EventResults from "./EventResults";
import EventStreams from "./EventStreams";
import ForYouCard, { type ForYou } from "./ForYouCard";
import StickyActionDock from "./StickyActionDock";
import OpponentReportActions from "./OpponentReportActions";
import LiveRefresh from "./LiveRefresh";
import { checkInOpensAt, checkInState } from "@/lib/checkin";
import { ineligibleCandidates } from "@/lib/event-polls-shared";
import { loadSeriesContext } from "@/lib/series-context";
import SeriesStrip from "./SeriesStrip";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import EventSummarySection from "@/components/EventSummarySection";
import EventPostsSection from "@/components/EventPostsSection";
import IdeaFromButton from "@/components/community-jobs/IdeaFromButton";
import { getGameListInfo } from "@/lib/games/service";
import GameListInfo from "@/components/games/GameListInfo";
import RegisterButton from "@/app/(app)/(dashboard)/events/RegisterButton";
import SpectatorRegisterButton from "./SpectatorRegisterButton";
import CheckInButton from "./CheckInButton";
import { isDrawFormat } from "@/lib/tournaments/draw-plan";
import { isKnockoutMatch } from "@/lib/tournaments/applyMatchResult";
import ClipSubmitter from "./ClipSubmitter";
import PollsSection from "./PollsSection";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import { loadDailyPolls } from "@/lib/daily-poll";
import GameVoteSection from "./GameVoteSection";
import { addableGames, getGameVoteView } from "@/lib/game-vote/service";
import EventWinnerPredictionWidget from "./EventWinnerPredictionWidget";
import EventTippsList from "./EventTippsList";
import EventPokalWinners from "@/components/EventPokalWinners";
import PokalPreview from "@/components/PokalPreview";
import { EventCategory } from "@prisma/client";

import StreamRegisterButton from "@/components/StreamRegisterButton";
import BracketView from "./BracketView";
import FfaView from "./FfaView";
import CommunityGoalCard from "./CommunityGoalCard";
import { computeCommunityGoalProgress, goalPace, isAvgGoal } from "@/lib/community-goal";
import { parseGoalState } from "@/lib/community-goal-milestones";
import { resolveEventGoal } from "@/lib/event-goal";
import LigaView from "./LigaView";
import GroupKnockoutView from "./GroupKnockoutView";
import BlocksEventSection from "@/components/blocks/BlocksEventSection";
import { eventPayout } from "@/lib/placement-rewards";
import { DEFAULT_ADVANCE_PER_GROUP, GROUP_KNOCKOUT_FORMAT, aggregateKnockoutTies, computeLeagueStandings, groupLetter, groupMembers, knockoutRoundLabel, leagueMemberIds, parseGroupStageConfig, resolveGroupCount } from "@/lib/tournaments/groupStage";
import NextMatches, { type UpcomingMatch } from "./NextMatches";
import MyMatchCard from "./MyMatchCard";
import { duelProgress, statProgress } from "@/lib/tournaments/progress";
import { koStatus, nextOpponents } from "@/lib/tournaments/player-path";
import MatchResultSubmit, { type ReportMatch, type MySubmission } from "./MatchResultSubmit";
import ResultReviewClient from "@/app/(app)/(dashboard)/events/verwalten/[id]/results/ResultReviewClient";
import { loadReviewData } from "@/lib/tournaments/review-data";
import { parseScreenshotUrls, isParticipantEditLocked, submissionSubject } from "@/lib/tournaments/matchSubmissions";
import { getWanderpocalHoldersMap } from "@/lib/get-wanderpocal-holders";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { PREDICTION_MIN_WAGER } from "@/lib/predictions";
import { computeEventPoints, computeTurnierpunkte, computeLiveLigaPunkte, applyEventStatOverride, hasEventPoints, resolveRankStatField, type StatConfig } from "@/lib/series-event-points";
import { bestAvgIds, computeAvgTotals, parseEntryStats, readStatValue, resolveAvgDirection } from "@/lib/avg-stats";
import { statRoundLabel, supportsMatchWin } from "@/lib/tournaments/stat-rounds";

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";



export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event
    .findUnique({ where: { id }, select: { title: true, game: true, hidden: true } })
    .catch(() => null);

  // Versteckte Events bekommen bewusst keinen aussagekräftigen Titel — die
  // Metadata ist ohne Login abrufbar.
  if (!event || event.hidden) {
    return { title: "Event – Old Masters Ally" };
  }

  const title = `${event.title} – Old Masters Ally`;
  const description = event.game
    ? `${event.game} · Event bei Old Masters Ally`
    : "Event bei Old Masters Ally";
  const image = `/api/og/event/${id}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    // Ohne Session kommt nur ein von (dashboard)/layout.tsx bereits geprüfter
    // Link-Vorschau-Bot hierher (echte Besucher ohne Session wurden dort schon
    // zu /login geschickt) — für den reicht die Meta-Tag-Auflösung oben,
    // die echten Turnierdaten unten braucht er nicht.
    return <BotPreviewShell />;
  }
  const userId = session.user.id;
  const { id: eventId } = await params;
  const me    = await getSessionUser();
  const isMod = me?.role === "moderator" || me?.role === "admin";

  // Lazy Auto-Aktivierung des Events, falls fällig (nur bei Spieler-Anmeldungen) — muss vor dem
  // Fetch unten abgeschlossen sein, damit der gelesene Status aktuell ist (siehe event-lifecycle.ts).
  await syncDueEventActivations();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      series: { select: { id: true, name: true, icon: true, hidden: true, registrationLocked: true, squadId: true, seriesStatConfig: true, discordChannelId: true, pollConfigJson: true, coverImageUrl: true, placementRewardsJson: true, approvalStatus: true, tournamentTemplateJson: true, omaOriginal: true, fixedGame: true } },
      streamingPartners: { include: { partner: { include: { user: { select: { id: true } } } } } },
      blocksTournament: { select: { stage: true } },
      blocksChallenge: { select: { id: true } },
      communityStreamers: { include: { user: { select: { id: true, name: true, username: true, image: true, twitchLogin: true, rankPoints: true } } } },
      registrations: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      participants: {
        include: { user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
      },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { entries: true },
      },
      polls: {
        include: {
          votes: {
            include: { voter: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
          },
        },
        orderBy: { startAt: "asc" },
      },
      clipSubmissions: true,
    },
  });

  if (!event) notFound();
  // Ersteller, Squad-Captains und Mods dürfen das Event verwalten (Ergebnisse eintragen/korrigieren)
  // und sehen es auch, wenn es ausgeblendet ist
  const canManage = await canManageEvent(me, eventId);
  // Offene Ergebnis-Meldungen zum Prüfen (nur Verwalter) — auch eigene Meldungen, siehe ResultReviewClient
  const reviewData = canManage && event.format ? await loadReviewData(eventId, { onlyPending: true }) : null;
  // Bestätigte Nachweis-Screenshots: sichtbar für Teilnehmer des Events (Spieler) und Verwalter — nicht
  // öffentlich (können persönliche Daten enthalten, z.B. aus Fitness-Apps). Schlüssel "matchId:userId".
  const canSeeProofs = canManage || event.registrations.some(r => r.userId === userId && r.role !== "spectator")
    || event.participants.some(p => p.userId === userId);
  const proofsByEntry: Record<string, string[]> = {};
  if (canSeeProofs && event.format) {
    const confirmed = await prisma.matchResultSubmission.findMany({
      where: { eventId, status: { in: ["approved", "corrected"] } },
      select: { matchId: true, userId: true, forUserId: true, screenshotUrls: true },
    });
    for (const s of confirmed) {
      const urls = parseScreenshotUrls(s.screenshotUrls);
      if (urls.length === 0) continue;
      const key = `${s.matchId}:${submissionSubject(s)}`;
      proofsByEntry[key] = [...new Set([...(proofsByEntry[key] ?? []), ...urls])];
    }
  }
  const isHidden = event.hidden || !!event.series?.hidden;
  if (isHidden && !isMod && !canManage) notFound();
  // Spiel in der Spieleliste → Name wird zum Link auf die Spiel-Seite, dazu eine Kurzinfo (wer es hat …)
  const gameInfo = event.game ? await getGameListInfo(event.game) : null;
  const gameListSlug = gameInfo?.slug ?? null;

  const communityCreator = (event.approvalStatus || event.series?.approvalStatus) && event.createdById
    ? await prisma.user.findUnique({ where: { id: event.createdById }, select: { username: true, name: true } })
    : null;
  const communityBy = communityCreator ? (communityCreator.username ?? communityCreator.name ?? "Mitglied") : null;
  const awaitingApproval = isAwaitingApproval(event);

  const allRegistrations = event.registrations.map(r => ({ userId: r.userId, role: r.role, user: r.user }));
  const myClipSubmission = event.clipSubmissions.find(c => c.userId === userId) ?? null;

  // Globale Werte (Wanderpokal-Halter, Minispiel-Einstellungen) 60 s pro Instanz im Speicher —
  // die Eventseite gehört zu den meistgerenderten Seiten (lib/memory-cache).
  const [holdersMap, myEventPrediction, minigamesConfig, allEventPredictions, eventPokale, communityPolls] = await Promise.all([
    cachedInMemory("wanderpocal-holders-map", 60_000, getWanderpocalHoldersMap),
    prisma.eventWinnerPrediction.findUnique({
      where: { userId_eventId: { userId, eventId } },
      include: { predictedUser: { select: { id: true, username: true, name: true, image: true, rankPoints: true } } },
    }),
    cachedInMemory("minigames-config", 60_000, getMinigamesConfig),
    // Tipps aller User (ohne Einsatz/Auszahlung — nur wer auf wen tippt, plus Pott-Gesamtsumme)
    prisma.eventWinnerPrediction.findMany({
      where: { eventId },
      select: {
        wager: true,
        correct: true,
        resolved: true,
        user: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
        predictedUser: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Pokale nur für Standalone-Turniere (seriesId === null, type === "tournament") —
    // Community-Events haben keinen Gewinner und bekommen keinen Pokal; Events innerhalb
    // einer Eventreihe zeigen keinen eigenen Pokal, dafür gibt es den Eventreihen-Pokal
    // auf der Seite der Eventreihe.
    event.seriesId || event.type !== "tournament"
      ? Promise.resolve([])
      : prisma.pokal.findMany({
          where: { eventId, isSeries: false },
          include: { user: { select: { name: true, username: true } } },
        }),
    loadDailyPolls({ userId, eventId }),
  ]);
  const showPokalPreview = !event.seriesId && event.type === "tournament"
    && eventPokale.length === 0 && event.status !== "finished";
  const holdersList = [...holdersMap.values()];
  const isPredictionLocked = event.status === "finished" || event.startAt < new Date();
  const predictionPot = allEventPredictions.reduce((sum, p) => sum + p.wager, 0);
  const eventTipps = allEventPredictions.map(p => ({
    user: p.user,
    predictedUser: p.predictedUser,
    resolved: p.resolved,
    correct: p.correct,
  }));

  // Spielwahl (lib/game-vote): Termin einer Reihe, dessen Spiel die Mitglieder wählen
  const gameVote = await getGameVoteView(event.id, userId);
  // Reihen-Termin: Kontext für Kopf und Reihen-Leiste (Termin x von y, Nachbarn, eigener Platz)
  const seriesCtx = event.seriesId ? await loadSeriesContext(event.seriesId, event.id, userId) : null;
  // Verwalter (nicht nur Mods) bearbeiten Kandidaten und legen ohne Sieger das Spiel fest
  const canManageVote = !!gameVote && canManage;
  const gameVoteAddable = gameVote && canManageVote && (gameVote.status !== "closed" || !gameVote.winnerGameId) ? await addableGames(event.id) : [];

  const myReg         = event.registrations.find((r) => r.userId === userId);
  const isRegistered  = !!myReg && myReg.role !== "spectator";
  const isSpectator    = !!myReg && myReg.role === "spectator";
  const isFullEvent    = !!(event.maxPlayers && event.registrations.filter(r => r.role !== "spectator").length >= event.maxPlayers);
  // OMA-Blocks-Challenge: Jeder trägt automatisch mit Solo-Läufen bei — keine Anmeldung nötig.
  const canRegister    = (event.status === "open" || event.status === "active" || event.status === "closed") && !event.blocksChallenge;
  const isRegistrationLocked = event.registrationLocked || event.series?.registrationLocked || false;
  const restrictedSquadId = event.squadId ?? event.series?.squadId ?? null;
  const isSquadMember = restrictedSquadId
    ? !!(await prisma.squadMembership.findUnique({ where: { squadId_userId: { squadId: restrictedSquadId, userId } } }))
    : true;
  // Anmelden/Abmelden nach dem Start: nur Zeitraum-Events nehmen bis zum Ende Einsteiger an; abmelden
  // geht nach Start, Auslosung oder Abschluss nicht mehr (gleiche Regeln wie lib/event-registration.ts)
  const regNow = new Date();
  const regStarted = event.startAt <= regNow;
  const regPeriodOpen = isPeriodEvent(event) && !!event.endAt && event.endAt > regNow;
  const deadlinePassed = !!event.registrationClosesAt && event.registrationClosesAt <= regNow;
  // Ausgelost (1-gegen-1-Spielplan steht): neue Spieler kämen nicht mehr in den Spielplan
  const isDrawn = isDrawFormat(event.format) && event.matches.length > 0;
  const joinClosed = (regStarted && !regPeriodOpen) || deadlinePassed || isDrawn;
  const canUnregister = !(regStarted && !regPeriodOpen) && event.matches.length === 0 && !event.completionData;
  // Warteliste: eigener Platz, falls voll und noch nicht dabei
  const myWaitlistPos = userId && isFullEvent && !isRegistered ? await waitlistPosition(userId, event.id) : null;
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
  // Laufendes Zeitraum-Event (> 24 h mit Ende): ruhige Restlaufzeit statt "läuft", Einstieg jederzeit
  const period = event.status === "active" && event.endAt && isPeriodEvent(event) ? periodInfo({ startAt: event.startAt, endAt: event.endAt }) : null;
  const hasTournament = !!event.format;

  // Alle Teilnehmer (keine Zuschauer) dürfen Ergebnisse melden — eigene und die anderer Spieler,
  // jeweils samt Screenshot-Nachweis.
  const canReportResults = hasTournament && (isRegistered || event.participants.some(p => p.userId === userId));
  const mySubmissionRows = canReportResults
    ? await prisma.matchResultSubmission.findMany({ where: { eventId, userId } })
    : [];
  // Offene Meldungen des Gegners in eigenen 1v1-Matches — können mit einem Klick bestätigt werden
  const myDuelMatchIds = event.matches
    .filter(m => m.entries.length === 0 && (m.player1Id === userId || m.player2Id === userId))
    .map(m => m.id);
  const opponentReportRows = canReportResults && myDuelMatchIds.length > 0
    ? await prisma.matchResultSubmission.findMany({
        where: { eventId, matchId: { in: myDuelMatchIds }, userId: { not: userId }, forUserId: "", status: "pending" },
        select: { matchId: true, userId: true, score1: true, score2: true, advancerId: true },
      })
    : [];
  const userById = new Map<string, { id: string; name: string | null; username: string | null }>([
    ...event.registrations.map(r => [r.userId, r.user] as const),
    ...event.participants.map(p => [p.userId, p.user] as const),
  ]);
  const toU = (id: string | null) => {
    const u = id ? userById.get(id) : null;
    return u ? { id: u.id, name: u.name, username: u.username } : null;
  };
  const reportMatches: ReportMatch[] = canReportResults
    ? event.matches
        .filter(m => m.entries.length > 0 ? true : !!m.player1Id && !!m.player2Id)
        .map(m => {
          const isDuel = m.entries.length === 0;
          const p1 = toU(m.player1Id);
          const p2 = toU(m.player2Id);
          const nm = (u: { name: string | null; username: string | null } | null) => u?.username ?? u?.name ?? "?";
          return {
            id: m.id,
            label: isDuel ? (m.title ?? `${nm(p1)} vs ${nm(p2)}`) : statRoundLabel(m),
            isDuel,
            player1: p1,
            player2: p2,
            players: isDuel ? [] : m.entries.flatMap(e => { const u = toU(e.userId); return u ? [u] : []; }),
            played: !!m.playedAt,
            mine: m.player1Id === userId || m.player2Id === userId || m.entries.some(e => e.userId === userId),
            opponentReport: (() => {
              const opp = isDuel ? (m.player1Id === userId ? m.player2Id : m.player2Id === userId ? m.player1Id : null) : null;
              const r = opp ? opponentReportRows.find(x => x.matchId === m.id && x.userId === opp) : null;
              return r ? { score1: r.score1, score2: r.score2, reporterName: nm(toU(r.userId)), advancerId: r.advancerId } : null;
            })(),
            knockout: isDuel && isKnockoutMatch(event.format, m.groupIndex),
            leg: m.leg,
          };
        })
    : [];
  const mySubmissions: MySubmission[] = mySubmissionRows.map(sub => {
    const m = event.matches.find(x => x.id === sub.matchId);
    return {
      matchId: sub.matchId,
      subjectId: m && m.entries.length > 0 ? submissionSubject(sub) : null,
      status: sub.status, score1: sub.score1, score2: sub.score2, advancerId: sub.advancerId, statsJson: sub.statsJson,
      note: sub.note, reviewNote: sub.reviewNote, screenshotUrls: parseScreenshotUrls(sub.screenshotUrls),
    };
  });

  // Alle bekannten Spieler: Turnier-Teilnehmer + Event-Registrierungen zusammenführen,
  // damit Match-Spieler auch dann aufgelöst werden wenn sie nicht als TournamentParticipant eingetragen sind
  type KnownUser = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
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
  // Große Events (ab 20): der eigene Eintrag steht innerhalb seiner Gruppe ganz oben
  const bigList = event.registrations.length >= 20;
  const sortedRegistrations = [...event.registrations].sort((a, b) => {
    const ra = a.role === "spectator" ? 1 : 0;
    const rb = b.role === "spectator" ? 1 : 0;
    if (ra !== rb) return ra - rb;
    if (bigList) return Number(b.userId === userId) - Number(a.userId === userId);
    return 0;
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
  // Tabellenpunkte (Tabellenpunkte) für die reine Stimmabgabe — wenn vorhanden, sollen externe Wähter
  // auch im Gesamtranking auftauchen, da sie dafür Punkte für die Reihen-Tabelle erhalten
  const hasVoteSeriesPoints = mergedPolls.some(p => p.participationSeriesPoints > 0);
  const format = event.format ?? "single_elimination";
  const isFfa         = format === "ffa" || format === "coop_stats" || format === "avg_stats";
  const isElimination = format === "single_elimination" || format === "double_elimination";
  const isRoundRobin  = format === "round_robin";
  const isLiga        = format === "liga";
  const isGroupKnockout = format === GROUP_KNOCKOUT_FORMAT;
  // Bei Gruppenphase + K.O. zählt für Sieger/Finale nur die K.O.-Runde (Matches ohne Gruppe)
  // Spiel um Platz 3 liegt in der Final-Runde, ist aber nie das Finale
  // Hin-/Rückspiel: Paarungen zusammengefasst (Sieger = wer nach Gesamtergebnis weiterkommt)
  const bracketMatches = aggregateKnockoutTies(isGroupKnockout ? event.matches.filter(m => m.groupIndex == null) : event.matches)
    .filter(m => !m.isThirdPlace);
  const groupStageCfg = parseGroupStageConfig(event.groupStageJson);

  const userName = (u: { name: string | null; username: string | null }) =>
    u.username ?? u.name ?? "Unbekannt";

  // Liga-Tabelle: nur Spieler aus den Matches (ohne Matches: angemeldete Spieler, keine Zuschauer)
  const leagueParticipants = (() => {
    const ids = leagueMemberIds(event.matches, mergedParticipants.filter(p => p.role !== "spectator").map(p => p.userId));
    return ids.flatMap(id => mergedParticipants.find(p => p.userId === id) ?? []);
  })();

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
    /** Aus dem Event ausgeschlossene (disqualifizierte) User — öffentlich als „Ungewertet"-Badge sichtbar */
    excludedUserIds?: string[] | null;
    /** Beim Abschluss als anwesend markierte Zuschauer */
    spectatorAttendedIds?: string[] | null;
    /** Beim Abschluss als "nicht da" markierte Spieler — erscheinen nicht unter "Mit dabei waren" */
    absentPlayerIds?: string[] | null;
  };
  const completionData: CompletionData = (() => {
    try { return event.completionData ? JSON.parse(event.completionData as string) : {}; } catch { return {}; }
  })();
  const pollWinnerIds: string[] = completionData.pollWinnerIds ??
    (completionData.pollWinnerId ? [completionData.pollWinnerId] : []);
  const pollLabel         = completionData.pollLabel ?? null;
  const pollBonusCoins    = completionData.pollBonusCoins ?? completionData.pollBonusPoints ?? null;
  const pollBonusRankPts  = completionData.pollBonusRankPoints ?? null;
  const rankingGroups     = eventHasPlacement(event) ? (completionData.finalRankingGroups ?? null) : null;
  const gamePhaseComplete   = completionData.gamePhaseComplete === true;
  const pollPhaseComplete   = completionData.pollPhaseComplete === true;
  const hasPendingPoll      = gamePhaseComplete && !pollPhaseComplete && !!pollLabel;
  const pollExcludedUserIds = new Set(completionData.pollExcludedUserIds ?? []);
  const excludedUserIds     = new Set(completionData.excludedUserIds ?? []);
  const absentPlayerIds     = new Set(completionData.absentPlayerIds ?? []);

  // Anstehende Spiele mit feststehenden Gegnern (für "Dein nächstes Match" / "Nächste Spiele")
  const koRounds = Math.max(0, ...event.matches.filter(m => m.groupIndex == null && !m.isThirdPlace).map(m => m.round));
  /** Stufe eines Matches in Klartext (Spieltag, Gruppe, K.O.-Runde, Stat-Runde) */
  const matchStage = (m: (typeof event.matches)[number], withTitle = true) => {
    if (isFfa) return statRoundLabel(m);
    if (withTitle && m.title) return m.title;
    if (isGroupKnockout && m.groupIndex != null) return `Gruppe ${groupLetter(m.groupIndex)} · Spieltag ${m.round}`;
    if (isLiga || isRoundRobin) return `Spieltag ${m.round}`;
    return (m.isThirdPlace ? "Spiel um Platz 3" : knockoutRoundLabel(m.round, koRounds))
      + (m.leg === 1 ? " · Hinspiel" : m.leg === 2 ? " · Rückspiel" : "");
  };
  const upcomingMatches: UpcomingMatch[] = (() => {
    if (!hasTournament) return [];
    const userOf = (id: string | null) => (id ? mergedParticipants.find(p => p.userId === id)?.user ?? null : null);
    const label = (m: (typeof event.matches)[number]) => matchStage(m);
    return event.matches
      .filter(m => !m.playedAt && !m.winnerId)
      .map(m => {
        const ids = m.entries.length > 0 ? m.entries.map(e => e.userId) : [m.player1Id, m.player2Id];
        const players = ids.map(userOf).filter((u): u is NonNullable<typeof u> => !!u);
        const complete = m.entries.length > 0 ? players.length > 0 : players.length === 2;
        return complete ? {
          id: m.id, label: label(m), scheduledAt: m.scheduledAt, live: !!m.startedAt, players,
          mine: ids.includes(userId), round: m.round, position: m.position, leg: m.leg ?? 0,
        } : null;
      })
      .filter((m): m is NonNullable<typeof m> => !!m)
      .sort((a, b) =>
        Number(b.live) - Number(a.live)
        || (a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity) - (b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity)
        || a.round - b.round || a.leg - b.leg || a.position - b.position)
      .map(({ round: _r, position: _p, leg: _l, ...m }) => { void _r; void _p; void _l; return m; });
  })();

  // ── Spieler-Sicht: Stand des Turniers, eigenes Match, eigener Weg im K.O.-Baum ──
  const isDuelFormat = hasTournament && !isFfa;
  const duelStand = isDuelFormat ? duelProgress(event.matches) : null;
  const statStand = hasTournament && isFfa ? statProgress(event.matches) : null;
  const standStage = duelStand
    ? (duelStand.current
        ? (isGroupKnockout && duelStand.current.groupIndex != null ? "Gruppenphase" : matchStage(duelStand.current, false).replace(/ · (Hin|Rück)spiel$/, "")) + " läuft"
        : duelStand.total > 0 ? "alle Matches gespielt" : null)
    : statStand
      ? (statStand.next ? `${statRoundLabel(statStand.next)} als Nächstes` : statStand.total > 0 ? "alle Matches eingetragen" : null)
      : null;
  const myOpenMatch = upcomingMatches.find(m => m.mine) ?? null;
  const myOpenReport = myOpenMatch ? reportMatches.find(r => r.id === myOpenMatch.id) ?? null : null;
  const myOpenSubmission = myOpenReport
    ? mySubmissions.find(s => s.matchId === myOpenReport.id && (myOpenReport.isDuel || s.subjectId === userId)) ?? null
    : null;
  const koNameOf = (id: string) => {
    const u = mergedParticipants.find(p => p.userId === id)?.user;
    return u ? userName(u) : "?";
  };
  const hasKoTree = (isElimination || isGroupKnockout) && bracketMatches.length > 0;
  const myKo = hasKoTree ? koStatus(bracketMatches, userId) : { kind: "none" as const };
  const myNextHint = (() => {
    if (!hasKoTree || !myOpenMatch) return null;
    const tie = bracketMatches.find(m => m.id === myOpenMatch.id || m.legs?.second?.id === myOpenMatch.id);
    const next = tie ? nextOpponents(bracketMatches, tie) : null;
    return next ? `Sieger trifft im ${next.roundLabel} auf ${next.userIds.map(koNameOf).join(" oder ")}` : null;
  })();
  const eliminatedCount = hasKoTree
    ? new Set(bracketMatches.flatMap(m => m.winnerId && m.player1Id && m.player2Id ? [m.winnerId === m.player1Id ? m.player2Id : m.player1Id] : [])).size
    : 0;

  // Turniersieger — nur wenn er wirklich feststeht:
  //  1. nach dem Abschluss die festgelegte Endplatzierung (inkl. Korrekturen/Disqualifikationen)
  //  2. K.O.-Formate: sobald das Finale entschieden ist
  //  3. Liga: erst wenn alle Spiele gespielt sind, dann der Tabellenerste (gleiche Tabelle wie unten)
  //  Stat-Formate haben vor dem Abschluss keinen eindeutigen Sieger.
  const winner: { name: string | null; username: string | null; image: string | null } | null = (() => {
    // Community-Events haben keinen Sieger (lib/event-placement.ts)
    if (!hasTournament || !eventHasPlacement(event)) return null;
    const userOf = (id: string | null | undefined) =>
      id && !excludedUserIds.has(id) ? (mergedParticipants.find(p => p.userId === id)?.user ?? null) : null;
    if (gamePhaseComplete && event.finalRankingJson) {
      try {
        const ranking = JSON.parse(event.finalRankingJson) as string[];
        const first = ranking.find(id => !excludedUserIds.has(id));
        if (first) return userOf(first);
      } catch { /* weiter mit den Live-Daten */ }
    }
    if (isElimination || isGroupKnockout) {
      const maxRound = bracketMatches.length ? Math.max(...bracketMatches.map(m => m.round)) : 0;
      return userOf(bracketMatches.find(m => m.round === maxRound)?.winnerId);
    }
    if ((isLiga || isRoundRobin) && event.matches.length > 0 && event.matches.every(m => m.playedAt)) {
      const table = computeLeagueStandings(leagueParticipants.map(p => p.userId), event.matches)
        .filter(st => !excludedUserIds.has(st.userId));
      return userOf(table[0]?.userId);
    }
    return null;
  })();

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
    answerOptions: { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number }[] | null;
    excludedUserIds: string[];
    effectiveWinnerIds: string[];
  };
  // Beim Abschluss "nicht da" bzw. ausgeschlossen: keine wählbaren Kandidaten (lib/event-polls-shared.ts)
  const pollIneligible = ineligibleCandidates(event.completionData);
  const pollDisplays: PollDisplay[] = mergedPolls.map(poll => {
    let pollExcluded: string[] = [];
    if (poll.excludedUserIds) { try { pollExcluded = JSON.parse(poll.excludedUserIds); } catch { /* ignore */ } }
    const excludedSet = new Set([...pollExcluded, ...pollIneligible]);

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
      voteCounts, myVote, answerOptions, excludedUserIds: [...excludedSet], effectiveWinnerIds,
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

  // Was DIESES Event auszahlt — bei Reihen-Terminen Teilnahme + "Platzierungs-Bonus je Event" aus der
  // Reihentabelle; die Platzierungs-Belohnungen der Reihe gibt es erst zur Endwertung (lib/placement-rewards.ts)
  const payout = eventPayout(event);
  const participationCoins = payout.participationCoins;

  // Reine Reihen-Konfiguration (KEIN applyEventStatOverride!) — Grundlage für die echten Tabellenpunkte
  // der Reihe (Teilnahme, Stats mit seriesweitem pointsPer, Sieger-Ziel-Feld). Die Event-eigene
  // statConfigJson (Reiter "Turnier" bei coop_stats) darf hier NICHT einfließen: sonst würden
  // rotierende Spiele mit ihren eigenen, nur für dieses eine Event gültigen Punktewerten die
  // seriesweite Reihentabelle verzerren — sie bestimmt ausschließlich die Eventpunkte (s.u.).
  const rawSeriesStatCfg: StatConfig = (() => {
    try { return event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) as StatConfig : { participationPoints: 0, stats: [] }; }
    catch { return { participationPoints: 0, stats: [] }; }
  })();
  // Mit der Event-eigenen statConfigJson zusammengeführte Konfiguration — ausschließlich für die
  // Eventpunkte-Berechnung (Sieger-Ermittlung dieses einzelnen Events) und die Punkte-Anzeige je
  // Stat-Spalte, die sich direkt auf die Eventpunkte bezieht.
  const turnierpunkteCfg: StatConfig = applyEventStatOverride(rawSeriesStatCfg, event.statConfigJson);
  const statPointsPer: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    for (const s of turnierpunkteCfg.stats ?? []) if (s.field) map[s.field] = s.pointsPer;
    return map;
  })();
  // Eventpunkte: reine Event-interne Gesamtpunktzahl aus Stats × Punkte-pro-Stat +
  // Platzierungspunkte (siehe computeTurnierpunkte) — KEINE Tabellenpunkte, dient nur der
  // Endplatzierung/Sieger-Ermittlung dieses Events. Anders als ligaPunkteByUser bereits sichtbar,
  // während das Event noch läuft (keine Abhängigkeit von completionData).
  // Geben alle Stats 0 Punkte (und keine Rundenplatzierung Punkte), gibt es keine Eventpunkte: keine
  // Spalte, und die Platzierung ergibt sich direkt aus dem Sieger-Stat (rankStatField).
  const turnierpunkteByUser: Record<string, number> = hasEventPoints(turnierpunkteCfg)
    ? computeTurnierpunkte(event.matches, turnierpunkteCfg, format)
    : {};
  const eventStatFieldList: string[] = event.statFields ? JSON.parse(event.statFields) : [];
  const rankStatField = hasEventPoints(turnierpunkteCfg)
    ? undefined
    : resolveRankStatField(eventStatFieldList, event.seriesEventConfigJson, rawSeriesStatCfg as { winnerStatField?: string; defaultWinnerStatField?: string });
  // Wer gerade führt (für die Live-Vorschau des Sieger-Bonus): nach Eventpunkten, ohne Eventpunkte
  // nach dem Sieger-Stat
  const leaderScoreByUser: Record<string, number> = rankStatField
    ? (() => {
        const out: Record<string, number> = {};
        for (const m of event.matches) for (const e of m.entries) {
          if (!e.userId) continue;
          const v = readStatValue(parseEntryStats(e.statsJson), rankStatField);
          if (v !== null) out[e.userId] = (out[e.userId] ?? 0) + v;
        }
        return out;
      })()
    : turnierpunkteByUser;
  // Tabellenpunkte, die dieses Event je Spieler beigesteuert hat — identische Berechnung wie in der
  // Reihentabelle (Teilnahme + Stats + Umfrage-Belohnungen alt & neu), SOBALD die
  // Spielphase abgeschlossen ist. Läuft das Event noch, zeigen wir stattdessen eine Live-Vorschau
  // (Teilnahme Mitspieler + Zuschauer + bisherige Stats), mit dem Sieger-Bonus separat ausgewiesen —
  // klar als vorläufig markiert (isLigaPunkteLive), siehe computeLiveLigaPunkte. Beide nutzen bewusst
  // rawSeriesStatCfg, nicht turnierpunkteCfg — siehe dessen Kommentar oben.
  const isLigaPunkteLive = !gamePhaseComplete;
  // Skill-Index ohne Reihe: Match Win/Team-Zuordnung ist dort immer erfassbar (TournamentManager) —
  // Spalte und Sieg/Niederlage-Anzeige erst, sobald tatsächlich eine Runde gewonnen wurde.
  // Skill-Index mit Community-Ziel: Zähler über alle Runden bis zur Zielmarke, siehe lib/community-goal.ts
  // Eigenes Ziel des Termins oder geerbt aus der Eventreihe (lib/event-goal.ts)
  const communityGoal = resolveEventGoal({ format, statConfigJson: event.statConfigJson, series: event.series }).goal;
  const communityGoalProgress = communityGoal ? computeCommunityGoalProgress(event.matches, communityGoal) : null;
  // Ergebnis der Abrechnung am Ende des Zeitraums (lib/community-goal-milestones.ts)
  const communityGoalSettled = (() => {
    if (!communityGoal) return null;
    const st = parseGoalState(event.goalStateJson);
    return st.settledAt ? { reached: st.settledReached === true } : null;
  })();
  // Tempo: Ziel-Fortschritt im Vergleich zur verstrichenen Zeit (nur Zeitraum-Events mit Ende)
  const communityGoalPace = communityGoalProgress && communityGoal && !isAvgGoal(communityGoal) && event.endAt && isPeriodEvent(event) && event.status !== "finished"
    ? goalPace(communityGoalProgress.main.percent, periodInfo({ startAt: event.startAt, endAt: event.endAt }).progress)
    : null;
  const standaloneMatchWinUsed = !event.series && supportsMatchWin(format) && event.matches.some(m =>
    m.entries.some(e => (readStatValue(parseEntryStats(e.statsJson), "Match Win") ?? 0) > 0));
  // avg_stats: Richtung aus Abschluss bzw. Event-Einstellung; der Führende ergibt sich aus dem Ø in
  // dieser Richtung, nicht aus den (immer "höher = besser") Eventpunkten.
  const avgDirection = resolveAvgDirection(event.completionData, event.statConfigJson);
  const avgLeaderIds = format === "avg_stats"
    ? bestAvgIds(
        [...computeAvgTotals(event.matches, event.statFields ? JSON.parse(event.statFields) : [])]
          .map(([uid, t]) => [uid, t.combined] as [string, number | null]),
        avgDirection,
      )
    : undefined;
  const liveLigaPunkte = event.series && isLigaPunkteLive
    ? computeLiveLigaPunkte(
        { registrations: event.registrations, matches: event.matches },
        rawSeriesStatCfg,
        leaderScoreByUser,
        avgLeaderIds,
      )
    : null;
  const finalEventPoints = event.series && !liveLigaPunkte
    ? computeEventPoints(
        { completionData: event.completionData, registrations: event.registrations, matches: event.matches, goalStateJson: event.goalStateJson },
        rawSeriesStatCfg,
      )
    : null;
  const ligaPunkteByUser: Record<string, number> = liveLigaPunkte?.pointsByUser ?? finalEventPoints?.pointsByUser ?? {};
  const ligaPunkteBreakdownByUser = finalEventPoints?.breakdownByUser ?? {};

  // Dominion-Bonus-Ergebnis DIESES Events je User — direkt aus completionData.dominionChanges
  // (siehe complete/route.ts + dominion-bonus.ts), nicht aus dem aktuellen (live) Streak-Stand der
  // Reihe: hier soll nur sichtbar sein, wer HIER +1 bekommen bzw. den Bonus ausgelöst hat.
  const dominionResultByUser: Record<string, { streakAfter: number; bonusAwarded: boolean }> = (() => {
    if (!rawSeriesStatCfg.dominionBonus?.enabled || !event.completionData) return {};
    try {
      const cd = JSON.parse(event.completionData) as {
        dominionChanges?: Record<string, { streakBefore: number; streakAfter: number; bonusAwarded: boolean }> | null;
      };
      const out: Record<string, { streakAfter: number; bonusAwarded: boolean }> = {};
      for (const [uid, ch] of Object.entries(cd.dominionChanges ?? {})) {
        const gotTriggerThisEvent = ch.bonusAwarded || ch.streakAfter === ch.streakBefore + 1;
        if (gotTriggerThisEvent) out[uid] = { streakAfter: ch.streakAfter, bonusAwarded: ch.bonusAwarded };
      }
      return out;
    } catch { return {}; }
  })();

  // Liga-Tabellen zählen Unentschieden immer (LigaView) — unabhängig davon, ob pointsConfig
  // zusätzlich Sieg/Unentschieden-Münzen pro Match vergibt.

  // Genre + Streaming-Partner + Community-Streamer + 1st-place reward
  const genre = (event as unknown as Record<string, unknown>).genre as string | null | undefined;
  const genreInfo = genreMeta(genre);
  type PartnerEntry = { partner: { id: string; name: string; twitchLogin: string; logoUrl: string; user?: { id: string } | null } };
  type CommunityStreamerEntry = { user: { id: string; name: string | null; username: string | null; image: string | null; twitchLogin: string | null; rankPoints: number } };
  const streamingPartners = (event as unknown as { streamingPartners?: PartnerEntry[] }).streamingPartners ?? [];
  const communityStreamers = (event as unknown as { communityStreamers?: CommunityStreamerEntry[] }).communityStreamers ?? [];

  const isPartnerStreamer = streamingPartners.some(sp => sp.partner.user?.id === userId);
  const isCommunityStreamer = communityStreamers.some(cs => cs.user.id === userId);
  const canStreamRegister = canRegister && !isPartnerStreamer;
  const partnerUserIds = new Set(streamingPartners.map(sp => sp.partner.user?.id).filter(Boolean));
  const filteredCommunityStreamers = communityStreamers.filter(cs => !partnerUserIds.has(cs.user.id));
  // 1.-Platz-Preis genau so, wie der Event-Abschluss ihn auszahlt (Event-, sonst Reihen-Konfiguration)
  // 1.-Platz-Preis genau so, wie der Event-Abschluss ihn auszahlt (Reihen-Termin: Bonus je Event)
  const firstPlace = payout.placements.find(p => p.place === 1);
  const heroFirstPlaceCoins    = firstPlace?.coins ?? 0;
  const heroFirstPlaceRankPts  = firstPlace?.rankPoints ?? 0;
  const seriesFinalFirst = payout.seriesFinal?.find(p => p.place === 1) ?? null;
  const hasHeroFirstPlace      = heroFirstPlaceCoins > 0 || heroFirstPlaceRankPts > 0;
  const date = new Date(event.startAt);
  const serverTimeFallback = formatBerlinTime(date, { hour: "2-digit", minute: "2-digit" });

  // Stats für Header

  // Umfragen ohne (bestätigtes oder abgeleitetes) Ergebnis fürs Voting-Widget aufbereiten —
  // Umfragen mit Ergebnis laufen bereits oben in die Gewinner-Karte (completedPolls)
  type InitialPoll = {
    id: string; label: string; question: string; voterEligibility: string; answerType: string;
    customAnswers: string[]; startAt: string; endAt: string; rewardsPaid: boolean;
    winnerIds: string[] | null; participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number;
    voteCounts: Record<string, number>; myVote: string | null;
    answerOptions: { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number }[] | null;
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

  // Mobil: Vor dem Start ist die Teilnehmerliste zentral und steht oben. Sobald das Event läuft,
  // rückt sie hinter die Turnieransicht und wird eingeklappt — außer es gibt keine eigene
  // Turnier-/Ziel-Ansicht, dann bleibt sie der Hauptinhalt. Gilt auch am Desktop, damit Baum und
  // Tabellen nach dem Start die volle Breite bekommen; vorher steht die Liste als Seitenspalte.
  const hasStarted = event.status === "finished" || event.startAt <= new Date();
  // Status-Hinweise ("komme später" …) nur bis zum Ende der Spielphase — in der Abstimmung und danach aus
  const pagePhaseForStatus = event.status === "finished" || event.status === "umfrage" ? "after" : "open";
  const collapseParticipantsOnMobile = hasStarted && (hasTournament || !!communityGoalProgress);

  // Event-Absprachen: Status je Teilnehmer ("komme später" …) + ungelesene Nachrichten (nur Mitglieder)
  const [commentStatuses, commentCounts] = userId
    ? await Promise.all([
        getLatestCommentStatuses(event.id),
        getCommentCounts(userId, [event.id], myReg ? new Set([event.id]) : new Set()),
      ])
    : [new Map<string, never>(), new Map<string, { total: number; unread: number }>()];

  // Siege und gewonnene Umfragen je Teilnehmer (für die Liste)
  const winsByUser: Record<string, number> = {};
  for (const m of event.matches) if (m.winnerId) winsByUser[m.winnerId] = (winsByUser[m.winnerId] ?? 0) + 1;
  const wonLabelsByUser: Record<string, string[]> = {};
  for (const r of sortedRegistrations) {
    const labels = [...(pollWinnerIds.includes(r.userId) && pollLabel ? [pollLabel] : []), ...(pollWinsByUser[r.userId] ?? [])];
    if (labels.length > 0) wonLabelsByUser[r.userId] = labels;
  }
  const participantList = (
    <EventParticipantList
      registrations={sortedRegistrations} externalVoters={externalVoters} userId={userId}
      winsByUser={winsByUser} wonLabelsByUser={wonLabelsByUser} excludedUserIds={excludedUserIds}
      statuses={commentStatuses} showStatus={pagePhaseForStatus !== "after"} votedUserIds={votedUserIds}
      readyIds={event.checkInEnabled && !isDrawn && event.status !== "finished" && event.startAt > new Date()
        ? new Set(event.registrations.filter(r => r.role !== "spectator" && r.checkedInAt).map(r => r.userId)) : null}
    />
  );

  // ══ Darstellung ══════════════════════════════════════════════════════════════
  // Die Seite sortiert ihre Abschnitte nach Phase: vor dem Event zählen Anmeldung, Mitspieler und
  // Regeln; live das eigene Match und der Turnierbaum; in der Abstimmungsphase die Abstimmung; danach
  // das Ergebnis. Alle Abschnitte gibt es weiterhin, nur die Reihenfolge ändert sich.
  // Phasen und Reihenfolge: ./event-page-layout.ts ("drawn" = vor dem Start ausgelost, noch nicht live)
  const pagePhase = pagePhaseOf({ status: event.status, startAt: event.startAt, gamePhaseComplete });

  // ── Eigener Stand (Kopfbereich + "So läuft's ab") ──
  const myCheckInState = checkInState({ checkInEnabled: event.checkInEnabled, startAt: event.startAt }, isDrawn);
  const myCheckedIn = !!myReg?.checkedInAt;
  const notDrawnMe = isDrawn && isRegistered && !event.matches.some(m => m.player1Id === userId || m.player2Id === userId);
  const myStatus: { label: string; tone: "teal" | "amber" | "muted" } | null =
    pagePhase === "after" || pagePhase === "voting" ? null
      : myWaitlistPos ? { label: `Warteliste · Platz ${myWaitlistPos}`, tone: "amber" }
      : isSpectator ? { label: "Du schaust zu", tone: "teal" }
      : !isRegistered ? null
      : notDrawnMe ? { label: "Nicht ausgelost", tone: "muted" }
      : myCheckInState === "open" ? (myCheckedIn ? { label: "Du bist dabei · bereit", tone: "teal" } : { label: "Du bist dabei · noch nicht bereit", tone: "amber" })
      : myCheckInState === "not_yet_open" && myCheckedIn ? { label: "Du bist dabei · bereit", tone: "teal" }
      : { label: "Du bist dabei", tone: "teal" };
  const playerCount = event.registrations.filter(r => r.role !== "spectator").length;
  const spectatorCount = event.registrations.length - playerCount;
  // Belohnung fürs Zuschauen (wer beim Abschluss als anwesend markiert ist)
  const spectatorReward: { coins: number; rankPoints: number } | null = (() => {
    if (!event.spectatorMode || !event.spectatorRewardJson) return null;
    try {
      const r = JSON.parse(event.spectatorRewardJson) as { coins?: number; rankPoints?: number };
      return (r.coins ?? 0) > 0 || (r.rankPoints ?? 0) > 0 ? { coins: r.coins ?? 0, rankPoints: r.rankPoints ?? 0 } : null;
    } catch { return null; }
  })();
  const phaseInfo = eventPhase({
    status: event.status, startAt: event.startAt, endAt: event.endAt, maxPlayers: event.maxPlayers,
    playerCount, isRegistered, gameVoteOpen: gameVote?.status === "open",
  });
  const heroDate = dateBlock(event.startAt);
  const startsIn = startsInLabel(event.startAt);
  const statusLabel = phaseInfo.label ?? (canRegister ? "Anmeldung offen" : null);
  const statusTone = phaseInfo.label ? TONE_CLASSES[phaseInfo.tone] : TONE_CLASSES.teal;

  // Ergebnis: Endplatzierung (ohne Ungewertete), Podest + eigener Platz
  // Community-Events haben keine Platzierung (lib/event-placement.ts)
  const finalRanking = gamePhaseComplete && eventHasPlacement(event) ? parseRanking(event.finalRankingJson).filter(id => !excludedUserIds.has(id)) : [];
  const personById = (id: string) => mergedParticipants.find(p => p.userId === id)?.user
    ?? event.registrations.find(r => r.userId === id)?.user ?? null;
  const podium = finalRanking.slice(0, 3).map(id => ({ id, user: personById(id) })).filter(p => !!p.user);
  const myFinalPlace = finalRanking.indexOf(userId) + 1;
  const pollWinnerCards = [
    ...(pollWinnerIds.length > 0 && pollLabel ? [{ id: "legacy", label: pollLabel, winnerIds: pollWinnerIds }] : []),
    ...completedPolls,
  ];
  const hasPollStuff = hasPendingPoll || initialPolls.length > 0
    || (event.status === "umfrage" && !!discordChannelUrl && initialPolls.length === 0);
  // Nur wer abstimmen darf, bekommt den Button ("all" = jeder, sonst nur Angemeldete/Zuschauer)
  const myPendingVote = gamePhaseComplete && initialPolls.some(p =>
    !p.myVote && new Date(p.startAt) <= new Date() && new Date(p.endAt) > new Date()
    && (p.voterEligibility === "all" || isRegistered || isSpectator));

  // ── Aktionsleiste: genau eine Hauptaktion je Phase, daneben Kalender/Discord/Zuschauer/Stream ──
  const BTN_SECONDARY = "flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-fg hover:bg-surface-3 transition-colors";
  // Nach der Auslosung: eigener Einstieg direkt in der Aktionsleiste (nächstes Match, Freilos, nicht ausgelost)
  const myDrawInfo = (() => {
    if (!isDrawn || !userId || !isRegistered || pagePhase === "after") return null;
    const mine = event.matches.filter(m => m.player1Id === userId || m.player2Id === userId);
    if (mine.length === 0) return { tone: "muted" as const, text: "Nicht ausgelost" };
    const isByeM = (m: (typeof mine)[number]) => !!m.winnerId && (!m.player1Id || !m.player2Id);
    const next = mine.filter(m => !m.playedAt && !isByeM(m))
      .sort((a, b) => a.round - b.round || (a.leg ?? 0) - (b.leg ?? 0))[0];
    if (!next) return null;
    const oppId = next.player1Id === userId ? next.player2Id : next.player1Id;
    const opp = oppId ? userById.get(oppId) : null;
    const stage = event.format === "single_elimination" || (event.format === "group_knockout" && next.groupIndex == null)
      ? `Runde ${next.round}` : `Spieltag ${next.round}`;
    const byeFirst = event.format === "single_elimination" && mine.some(m => m.round === 1 && isByeM(m)) && next.round === 2 && !oppId;
    return {
      tone: "info" as const,
      text: byeFirst ? "Freilos in Runde 1 · du steigst in Runde 2 ein"
        : opp ? `Dein nächstes Match: ${opp.username ?? opp.name ?? "?"} · ${stage}${next.scheduledAt ? ` · ${formatBerlinDateTime(next.scheduledAt, { weekday: "short", hour: "2-digit", minute: "2-digit" })} Uhr` : ""}`
        : `Dein nächstes Match: ${stage} · Gegner steht noch nicht fest`,
    };
  })();

  // Hauptknopf je Phase. `dock`: gehört auch in die feste Leiste am Handy (nicht "Dabei"/Hinweistexte)
  const primary: { node: React.ReactNode; dock: boolean } | null = (() => {
    // Spielwahl läuft und man hat noch nicht abgestimmt → "Spiel wählen" als Hauptknopf
    if (gameVote?.status === "open" && gameVote.canVote && gameVote.myCandidateIds.length === 0) {
      return { dock: true, node: <a href="#spielwahl" className={buttonClasses("primary", "md")}><Vote className="size-4" /> Spiel wählen</a> };
    }
    if (myPendingVote) {
      return { dock: true, node: <a href="#abstimmung" className={buttonClasses("primary", "md")}><Vote className="size-4" /> Abstimmen</a> };
    }
    if (pagePhase === "live" && reportMatches.length > 0) {
      return { dock: true, node: <a href={myOpenReport ? "#dein-match" : "#ergebnis-melden"} className={buttonClasses("primary", "md")}><Swords className="size-4" /> Ergebnis melden</a> };
    }
    if (pagePhase === "after" && isRegistered) {
      return { dock: false, node: <a href="#clip" className={buttonClasses("primary", "md")}><Clapperboard className="size-4" /> Clip einreichen</a> };
    }
    if (canRegister && isRegistered) {
      return {
        dock: false,
        node: (
          <RegisterButton eventId={event.id} isRegistered isFull={false} discordEventUrl={discordEventUrl} spectatorSwitch={event.spectatorMode && canUnregister}
            coins={participationCoins} canUnregister={canUnregister} checkIn={event.checkInEnabled} />
        ),
      };
    }
    if (canRegister && joinClosed) {
      return { dock: false, node: <span className="text-sm text-muted">{isDrawn ? "Ausgelost · Anmeldung geschlossen" : deadlinePassed && !regStarted ? "Anmeldeschluss vorbei" : "Anmeldung geschlossen"}</span> };
    }
    if (canRegister && !isRegistrationLocked && isSquadMember) {
      return {
        dock: true,
        node: (
          <RegisterButton eventId={event.id} isRegistered={false} isFull={isFullEvent} discordEventUrl={discordEventUrl}
            joinLabel={regPeriodOpen && regStarted ? "Jetzt einsteigen" : "Anmelden"} coins={participationCoins}
            waitlist={{ position: myWaitlistPos }} checkIn={event.checkInEnabled} />
        ),
      };
    }
    return null;
  })();
  const primaryAction = primary?.node ?? null;

  // ── (1) "Für dich": genau das Nächste, was dich betrifft ──
  const checkInButton = isRegistered && event.checkInEnabled && event.status !== "finished" ? (
    <CheckInButton
      eventId={event.id}
      startAt={event.startAt.toISOString()}
      drawn={event.matches.length > 0 || (!!event.blocksTournament && event.blocksTournament.stage !== "pending")}
      checkedIn={!!myReg?.checkedInAt}
    />
  ) : null;
  const jumpBtn = (target: string, label: string, variant: "primary" | "secondary" = "primary") => (
    <SectionJumpLink target={target} className={buttonClasses(variant, "md")}>{label}</SectionJumpLink>
  );
  const forYou: ForYou | null = (() => {
    if (pagePhase === "after") return null; // danach: "Dein Ergebnis" (MyEventResult)
    if (myPendingVote) return { tone: "teal", glyph: "vote", title: "Deine Stimme fehlt noch", text: "Die Abstimmung nach dem Event läuft.", action: jumpBtn("abstimmung", "Abstimmen") };
    if (pagePhase === "voting") return null;
    if (myWaitlistPos) return { tone: "amber", glyph: "clock", title: `Warteliste · Platz ${myWaitlistPos}`, text: "Wird ein Spielerplatz frei, rückst du automatisch nach und bekommst Bescheid." };
    if (isSpectator) {
      return {
        tone: "teal", glyph: "eye", title: "Du schaust zu",
        text: spectatorReward && spectatorReward.coins > 0
          ? `+${spectatorReward.coins} Münzen, wenn du beim Abschluss als anwesend eingetragen bist.`
          : isPrePhase(pagePhase) && startsIn ? `Startet ${startsIn}` : undefined,
      };
    }
    if (!isRegistered) return null;
    if (myKo.kind === "champion") return { tone: "gold", glyph: "trophy", title: "Du hast das Turnier gewonnen!", text: "Glückwunsch — die Belohnung gibt es mit dem Abschluss." };
    // (7) Gegner hat gemeldet: direkt bestätigen oder widersprechen
    const oppReport = myOpenReport?.isDuel ? myOpenReport.opponentReport : null;
    const myStatusDone = myOpenSubmission && (myOpenSubmission.status === "approved" || myOpenSubmission.status === "corrected");
    if (myOpenMatch && myOpenReport && oppReport && !myStatusDone) {
      const p1 = myOpenReport.player1?.username ?? myOpenReport.player1?.name ?? "?";
      const p2 = myOpenReport.player2?.username ?? myOpenReport.player2?.name ?? "?";
      const score = `${p1} ${oppReport.score1 ?? "–"} : ${oppReport.score2 ?? "–"} ${p2}`;
      const mine = myOpenSubmission && myOpenSubmission.status === "pending" ? myOpenSubmission : null;
      if (mine && (mine.score1 !== oppReport.score1 || mine.score2 !== oppReport.score2)) {
        return { tone: "amber", glyph: "warning", title: "Eure Meldungen passen nicht zusammen", text: `${oppReport.reporterName} meldet ${score}. Sprecht euch ab — sonst entscheidet ein Verwalter.`, action: jumpBtn("dein-match", "Ansehen", "secondary") };
      }
      if (!mine) {
        return { tone: "teal", glyph: "swords", title: `${oppReport.reporterName} meldet ${oppReport.score1 ?? "–"} : ${oppReport.score2 ?? "–"} — stimmt das?`, text: score, action: <OpponentReportActions eventId={event.id} matchId={myOpenReport.id} /> };
      }
    }
    if (myOpenMatch) {
      const opponents = myOpenMatch.players.filter(p => p.id !== userId).map(p => p.username ?? p.name ?? "?");
      const duel = !!myOpenReport?.isDuel || opponents.length === 1;
      const when = myOpenMatch.live ? "läuft gerade" : myOpenMatch.scheduledAt
        ? `${formatBerlinDateTime(new Date(myOpenMatch.scheduledAt), { weekday: "short", hour: "2-digit", minute: "2-digit" })} Uhr` : null;
      return {
        tone: "teal", glyph: "swords",
        title: duel && opponents.length > 0 ? `Dein Match gegen ${opponents.join(", ")}` : `Dein nächstes Spiel: ${myOpenMatch.label}`,
        text: [duel ? myOpenMatch.label : null, when].filter(Boolean).join(" · ") || undefined,
        action: jumpBtn("dein-match", pagePhase === "live" ? "Ergebnis melden" : "Zum Match", pagePhase === "live" ? "primary" : "secondary"),
      };
    }
    if (myKo.kind === "eliminated") {
      return { tone: "muted", glyph: "cross", title: `Ausgeschieden im ${myKo.roundLabel}`, text: myKo.byUserId ? `gegen ${koNameOf(myKo.byUserId)} — danke fürs Mitspielen!` : "Danke fürs Mitspielen!" };
    }
    if (notDrawnMe) return { tone: "muted", glyph: "warning", title: "Nicht ausgelost", text: "Du bist bei der Auslosung nicht in den Spielplan gekommen." };
    if (myDrawInfo?.tone === "info") return { tone: "teal", glyph: "swords", title: myDrawInfo.text, action: jumpBtn("turnier", "Zum Turnier", "secondary") };
    if (checkInButton && myCheckInState === "open" && !myCheckedIn) {
      return { tone: "amber", glyph: "clock", title: "Meld dich bereit", text: "Wer bei der Auslosung nicht bereit ist, kommt nicht in den Spielplan.", action: checkInButton };
    }
    const facts = [
      isPrePhase(pagePhase) && startsIn ? `Startet ${startsIn}` : null,
      checkInButton && myCheckInState === "not_yet_open" && !myCheckedIn ? "„Bin bereit“ kurz vor dem Start" : null,
      participationCoins > 0 ? `+${participationCoins} Münzen nach dem Event` : null,
    ].filter(Boolean);
    return {
      tone: "teal", glyph: "check",
      title: myCheckedIn ? "Du bist dabei · bereit" : "Du bist dabei",
      text: facts.length > 0 ? facts.join(" · ") : undefined,
      action: checkInButton && (myCheckInState === "not_yet_open" || myCheckedIn) ? checkInButton : undefined,
    };
  })();
  // (2) Feste Leiste am Handy: das Dringendste aus "Für dich", sonst der Hauptknopf
  const dockAction = (forYou?.action && forYou.glyph !== "check") ? forYou.action : primary?.dock ? primary.node : null;
  const dockTitle = forYou && forYou.action && forYou.glyph !== "check" ? forYou.title : event.title;

  // Wer dabei ist (oder zuschaut), braucht den Termin im Kalender — direkt sichtbar statt im "Mehr"-Menü
  const calendarInBar = (isRegistered || isSpectator) && isPrePhase(pagePhase);
  const actionBar = (
    <div id="aktion" className="scroll-mt-36 border-t border-line px-3 py-3 sm:px-4 flex flex-wrap items-center gap-2">
      {primaryAction}
      {/* Zuschauen geht bis zum Abschluss der Spielphase — auch während das Event läuft */}
      {canRegister && event.spectatorMode && !isRegistered && (isSpectator || !gamePhaseComplete) && (
        <SpectatorRegisterButton eventId={event.id} isSpectator={isSpectator} reward={spectatorReward} />
      )}
      {canRegister && !isRegistered && !isSpectator && (isRegistrationLocked || !isSquadMember) && (
        isRegistrationLocked ? (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Lock className="size-4 shrink-0" /> Der Veranstalter trägt die Teilnehmer selbst ein. Frag im Discord nach einem Platz.
          </span>
        ) : (
          <Link href={`/squads/${restrictedSquadId}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <Lock className="size-4 shrink-0" /> Nur für Mitglieder des Squads · zum Squad
          </Link>
        )
      )}
      {period && !isRegistered && canRegister && (
        <span className="text-sm text-muted">Einstieg jederzeit bis zum Ende möglich</span>
      )}
      {event.status === "umfrage" && discordChannelUrl && initialPolls.length === 0 && (
        <a href={discordChannelUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md")}>
          <Vote className="size-4" />
          {legacyPollConfig?.question ? `Jetzt für „${legacyPollConfig.question}“ abstimmen` : "Jetzt abstimmen"} ↗
        </a>
      )}
      {calendarInBar && (
        <a href={`/api/events/${event.id}/ics`} download className={buttonClasses("secondary", "md")}>
          <CalendarPlus className="size-4" /> <span className="max-sm:sr-only">In den Kalender</span>
        </a>
      )}
      <span className="flex-1" />
      {((pagePhase !== "after" && !calendarInBar) || discordEventUrl || canStreamRegister) && (
        <ActionMoreMenu>
          {pagePhase !== "after" && !calendarInBar && (
            <a href={`/api/events/${event.id}/ics`} download className={BTN_SECONDARY}><CalendarPlus className="size-4 text-subtle" /> In den Kalender</a>
          )}
          {discordEventUrl && (
            <a href={discordEventUrl} target="_blank" rel="noopener noreferrer" className={BTN_SECONDARY}><ExternalLink className="size-4 text-subtle" /> Auf Discord ansehen</a>
          )}
          {canStreamRegister && <StreamRegisterButton eventId={eventId} isStreaming={isCommunityStreamer} />}
        </ActionMoreMenu>
      )}
    </div>
  );

  // ── Kopf: Cover mit Titel, Datum, Status — die Aktionsleiste hängt unten in derselben Karte ──
  const heroNode = (
    <EventHero
      event={event} omaOriginal={isOmaOriginal(event)} heroDate={heroDate} seriesCtx={seriesCtx}
      statusLabel={statusLabel} statusPill={statusTone.pill} phase={phaseInfo.phase}
      showCountdown={isPrePhase(pagePhase)} startsIn={startsIn} myStatus={forYou ? null : myStatus}
      date={date} serverTimeFallback={serverTimeFallback} period={period}
      footer={actionBar}
    />
  );

  // ── Fakten: die wichtigsten drei immer, der Rest hinter "Details" ──
  const factsRow = (
    <EventFacts
      primary={[
        !event.game && gameVote ? <span className={`${FACT} text-fg`}><Vote className="size-3.5 text-primary-fg" /> Spiel wird per Spielwahl bestimmt</span> : null,
        event.game ? (
          <span className={FACT}>
            <Gamepad2 className="size-3.5 text-subtle" />
            {gameListSlug
              ? <Link href={`/spiele/${gameListSlug}`} className="text-fg hover:text-primary-fg underline decoration-line-strong underline-offset-2">{event.game}</Link>
              : <span className="text-fg">{event.game}</span>}
          </span>
        ) : null,
        <span key="players" className={FACT}>
          <Users className="size-3.5 text-subtle" />
          <span className="tabular-nums text-fg">{playerCount}{event.maxPlayers ? `/${event.maxPlayers}` : ""}</span> {event.maxPlayers ? "Plätze" : "dabei"}
          {event.maxPlayers && (
            <span className="ml-1 h-1.5 w-12 rounded-full bg-surface-3 overflow-hidden">
              <span className={`block h-full rounded-full ${isFullEvent ? "bg-gray-500" : "bg-primary"}`} style={{ width: `${Math.min(100, Math.round(playerCount / event.maxPlayers * 100))}%` }} />
            </span>
          )}
        </span>,
        hasHeroFirstPlace ? (
          <span className={`${FACT} text-coin`} title={event.seriesId ? "Platzierungs-Bonus je Event: gibt es direkt nach diesem Termin" : "Preis für Platz 1"}>
            {event.seriesId && <span className="font-semibold">Bonus</span>}
            <PlaceMedal place={1} className="text-xs" />
            {heroFirstPlaceCoins > 0 && <span className="flex items-center gap-0.5 font-bold text-coin"><CoinIcon size={12} />{heroFirstPlaceCoins}</span>}
            {heroFirstPlaceRankPts > 0 && <span className="flex items-center gap-0.5 font-bold text-primary-fg"><RankPointsIcon size={12} />{heroFirstPlaceRankPts}</span>}
          </span>
        ) : participationCoins > 0 ? (
          <span className={`${FACT} text-coin`}>+{participationCoins} <CoinIcon size={12} /> fürs Mitmachen</span>
        ) : null,
      ]}
      more={[
        genreInfo ? <span className={FACT}><AppIcon kind="genre" name={genreInfo.value} size={12} />{genreInfo.label}</span> : null,
        hasTournament ? <span className={FACT}><Swords className="size-3.5 text-subtle" />{FORMAT_LABELS[format] ?? format}</span> : null,
        event.category ? <EventCategoryBadge category={event.category as EventCategory} /> : null,
        // Zuschauer: Anzahl und Belohnung fürs Zuschauen
        event.spectatorMode ? (
          <span className={FACT} title={spectatorReward ? "Belohnung fürs Zuschauen, wenn du beim Abschluss als anwesend markiert bist" : undefined}>
            <Glyph name="eye" className="size-3.5" /> <span className="tabular-nums text-fg">{spectatorCount}</span> Zuschauer
            {spectatorReward && spectatorReward.coins > 0 && <span className="flex items-center gap-0.5 font-bold text-coin">· +{spectatorReward.coins} <CoinIcon size={12} /> fürs Zuschauen</span>}
          </span>
        ) : null,
        // Reihen-Termin: Preise der Endwertung — erst zum Abschluss der Reihe
        event.series && seriesFinalFirst ? (
          <Link href={`/events/series/${event.series.id}#regeln`} className={`${FACT} hover:border-line-strong`}
            title="Platzierungs-Belohnungen der Reihe: gibt es zum Abschluss der Reihe">
            Endwertung der Reihe: <PlaceMedal place={1} className="text-xs" />
            {seriesFinalFirst.coins > 0 && <span className="flex items-center gap-0.5 font-bold text-coin"><CoinIcon size={12} />{seriesFinalFirst.coins}</span>}
            {seriesFinalFirst.rankPoints > 0 && <span className="flex items-center gap-0.5 font-bold text-primary-fg"><RankPointsIcon size={12} />{seriesFinalFirst.rankPoints}</span>}
          </Link>
        ) : null,
        gameInfo ? <GameListInfo info={gameInfo} /> : null,
      ]}
    />
  );

  // ── Sprungleiste ──
  const postCount = await prisma.jobReport.count({ where: { eventId: event.id, isDraft: false, hiddenByAdminAt: null } });
  const jumpLinks = [
    { href: "#uebersicht", label: "Übersicht", show: true },
    { href: "#abstimmung", label: "Abstimmung", show: hasPollStuff },
    { href: "#turnier", label: hasTournament ? "Turnier" : "Ablauf", show: hasTournament || !!communityGoalProgress },
    { href: "#teilnehmer", label: "Teilnehmer", show: sortedRegistrations.length > 0 },
    { href: "#absprachen", label: "Absprachen", show: !!userId },
    { href: "#beitraege", label: "Beiträge", show: postCount > 0 },
    { href: "#regeln", label: "Regeln", show: !!event.rules },
  ].filter(l => l.show);
  const unreadComments = commentCounts.get(event.id)?.unread ?? 0;
  const openPollsForMe = initialPolls.filter(p => !p.myVote && new Date(p.startAt) <= new Date() && new Date(p.endAt) > new Date()).length;
  const jumpBadge: Record<string, { text?: string; tone: "count" | "alert" | "live" } | undefined> = {
    teilnehmer: { text: String(sortedRegistrations.length), tone: "count" },
    absprachen: unreadComments > 0 ? { text: String(unreadComments), tone: "alert" } : undefined,
    abstimmung: openPollsForMe > 0 || myPendingVote ? { text: `${Math.max(1, openPollsForMe)} offen`, tone: "alert" } : undefined,
    turnier: pagePhase === "live" ? { tone: "live" } : undefined,
  };
  const jumpBar = <EventJumpBar links={jumpLinks.map(l => ({ target: l.href.slice(1), label: l.label, badge: jumpBadge[l.href.slice(1)] }))} />;

  // ── Community-Event abgeschlossen: kein Ergebnis, sondern "Mit dabei waren" + Umfrage-Highlights ──
  const isCommunityDone = !eventHasPlacement(event) && gamePhaseComplete;
  // Mitspieler + beim Abschluss als anwesend markierte Zuschauer (mit Zuschauer-Markierung)
  const spectatorAttended = new Set(completionData.spectatorAttendedIds ?? []);
  const communityPeople = isCommunityDone
    ? [
        ...event.registrations.filter(r => r.role === "player" && !excludedUserIds.has(r.userId) && !absentPlayerIds.has(r.userId)).map(r => ({ user: r.user, spectator: false })),
        ...event.registrations.filter(r => r.role === "spectator" && spectatorAttended.has(r.userId) && !excludedUserIds.has(r.userId)).map(r => ({ user: r.user, spectator: true })),
      ]
    : [];
  const communitySpectatorCount = communityPeople.filter(p => p.spectator).length;
  const myParticipationReward = isCommunityDone ? participationRewardOf(event.completionData, userId) : null;

  // ── Ergebnis (Podest, dein Platz, Sieger der Abstimmungen) ──
  const showResults = isCommunityDone || podium.length > 0 || !!winner || pollWinnerCards.length > 0;
  const resultsNode = showResults ? (
    <EventResults
      userId={userId}
      provisional={pagePhase !== "after"}
      community={isCommunityDone ? { people: communityPeople, spectatorCount: communitySpectatorCount, myReward: myParticipationReward } : null}
      podium={podium.map(p => ({
        id: p.id, name: userName(p.user!), image: p.user!.image, isMe: p.id === userId,
        href: p.id === userId ? "/profile" : `/profile/${p.id}`,
      }))}
      winner={podium.length === 0 ? winner : null}
      pollCards={pollWinnerCards.map(poll => ({
        id: poll.id, label: poll.label,
        winners: poll.winnerIds.map(uid => {
          const u = personById(uid);
          return { id: u?.id ?? null, name: u ? userName(u) : "Unbekannt", image: u?.image ?? null };
        }),
        bonus: poll.id === "legacy" ? { coins: pollBonusCoins ?? 0, rankPoints: pollBonusRankPts ?? 0 } : null,
      }))}
    />
  ) : null;

  // ── Abstimmungen: ein Abschnitt für alt (Discord/Legacy) + neu (EventPoll) ──
  const pollsNode = hasPollStuff ? (
    <section id="abstimmung" aria-label="Abstimmung" className="mb-5 space-y-3 scroll-mt-36">
      {hasPendingPoll && (
        <div className="rounded-card border border-violet-400/30 bg-surface shadow-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <Vote className="w-4 h-4 text-violet-400" />
            <h2 className="text-base font-extrabold text-fg">Abstimmung nach dem Event läuft: {pollLabel}</h2>
          </div>
          {((pollBonusCoins ?? 0) > 0 || (pollBonusRankPts ?? 0) > 0) && (
            <div className="flex items-center gap-2">
              {(pollBonusCoins ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-coin-soft text-coin">
                  Gewinner erhält +{pollBonusCoins} <CoinIcon size={13} />
                </span>
              )}
              {(pollBonusRankPts ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  +{pollBonusRankPts} <RankPointsIcon size={13} />
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {event.registrations.filter(({ user }) => !pollExcludedUserIds.has(user.id)).map(({ user }) => {
              const isMe = user.id === userId;
              const name = user.username ?? user.name ?? "Unbekannt";
              return (
                <div key={user.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-control bg-surface-2 border border-line ${isMe ? "ring-1 ring-primary/40" : ""}`}>
                  <RankedAvatar userId={user.id} src={user.image} alt={name} size={24} className="w-6 h-6" />
                  <span className={`text-sm ${isMe ? "text-primary-fg font-medium" : "text-gray-200"}`}>
                    <StyledUserName userId={user.id} name={name} />{isMe && <span className="text-xs text-gray-500 ml-1.5">(du)</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Erst abstimmbar, sobald die Spielphase abgeschlossen ist (auch wenn die EventPoll-Datensätze
          technisch schon vorher existieren) — vorher nur ein Hinweis, welche Umfragen danach starten. */}
      {gamePhaseComplete && initialPolls.length > 0 && (
        <PollsSection eventId={event.id} userId={userId} initialPolls={initialPolls} myRole={myReg?.role ?? null} />
      )}
      {!gamePhaseComplete && initialPolls.length > 0 && (
        <div className="rounded-card border border-line bg-surface shadow-card px-4 py-3 flex items-start gap-2.5">
          <Vote className="size-4 text-violet-300 mt-0.5 shrink-0" />
          <div className="text-sm text-muted leading-relaxed">
            <p>Nach Abschluss der Spielphase {initialPolls.length === 1 ? "startet folgende Umfrage" : "starten folgende Umfragen"}:</p>
            <ul className="mt-1 space-y-0.5">
              {initialPolls.map(p => (
                <li key={p.id} className="font-semibold text-fg">
                  „{p.label}“{p.question ? <span className="font-normal text-subtle"> – {p.question}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  ) : null;

  // ── Community-Umfragen, die im Admin an dieses Event geknüpft wurden (stehen auch auf der Startseite) ──
  const communityPollsNode = communityPolls.length > 0 ? (
    <section aria-label="Community-Umfragen" className="mb-5">
      {/* Eigener Name, damit sie nicht mit der Abstimmung nach dem Event oder der Spielwahl verwechselt werden */}
      <h2 className="text-base font-extrabold text-fg mb-2">Community-Umfragen</h2>
      <DailyPollBanner initialPolls={communityPolls} showEventLink={false} />
    </section>
  ) : null;

  // ── Streams ── (am großen Bildschirm in der Seitenspalte)
  const streamPartners = streamingPartners.map(sp => sp.partner);
  const streamUsers = filteredCommunityStreamers.map(cs => cs.user);
  const streamNode = <EventStreams partners={streamPartners} streamers={streamUsers} className="mb-5 xl:hidden" />;

  const descriptionCard = event.description ? (
    <p className="rounded-card border border-line bg-surface shadow-card px-4 py-4 sm:px-5 mb-5 text-sm text-fg/90 leading-relaxed whitespace-pre-line">{event.description}</p>
  ) : null;
  const collapseBackground = pagePhase === "after" && (!!event.description || !!event.rules);
  const descriptionNode = collapseBackground ? (
    // Sprung "Regeln" öffnet die Zeile (data-jump-target, siehe SectionJumpLink)
    <details data-jump-target="regeln" className="group mb-5 scroll-mt-36">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-card border border-line bg-surface px-4 shadow-card hover:border-line-strong [&::-webkit-details-marker]:hidden">
        <Glyph name="scroll" className="size-4 text-muted" />
        <span className="text-base font-extrabold text-fg">{event.description && event.rules ? "Beschreibung & Regeln" : event.rules ? "Regeln" : "Beschreibung"}</span>
        <span className="text-xs font-semibold text-subtle">Ablauf vor dem Event</span>
        <ChevronDown className="ml-auto size-4 text-subtle transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3">
        {descriptionCard}
        <RulesSection id="regeln" rules={event.rules} className="mb-0" />
      </div>
    </details>
  ) : descriptionCard;

  const gameVoteNode = gameVote ? (
    <GameVoteSection eventId={event.id} view={gameVote} canManage={canManageVote} addable={gameVoteAddable} rules={event.rules} format={event.format} isRegistered={isRegistered} isSpectator={isSpectator} />
  ) : null;

  const rulesNode = collapseBackground ? null : <RulesSection id="regeln" rules={event.rules} preview={isPrePhase(pagePhase) ? 4 : 3} className="mb-5" />;

  const blocksNode = (event.blocksTournament || event.blocksChallenge) ? (
    <BlocksEventSection
      eventId={event.id}
      viewerId={userId}
      canLead={canManage}
      hasTournament={!!event.blocksTournament}
      hasChallenge={!!event.blocksChallenge}
    />
  ) : null;

  // Pokale gibt es nur für Standalone-Events — Events innerhalb einer Eventreihe
  // werden stattdessen mit dem Eventreihen-Pokal auf der Reihen-Seite ausgezeichnet.
  const pokalNode = (
    <>
      {!event.seriesId && eventPokale.length > 0 && (
        <div className="mb-5"><EventPokalWinners pokale={eventPokale} label="Pokal" /></div>
      )}
      {showPokalPreview && (
        <div className="mb-5"><PokalPreview category={event.category} isSeries={false} /></div>
      )}
    </>
  );

  // Event-Gesamtsieger-Vorhersage (nur bei Turnieren, Community-Events haben keinen Gewinner)
  // Nur wenn Tipps im Admin-Bereich aktiviert sind — sonst käme erst beim Abgeben ein Fehler
  const predictionNode = event.type === "tournament" && minigamesConfig.predictionEnabled ? (
    <div id="tipps" className="mb-5 space-y-3 scroll-mt-36">
      <EventWinnerPredictionWidget
        eventId={event.id}
        locked={isPredictionLocked}
        minWager={PREDICTION_MIN_WAGER}
        maxWager={minigamesConfig.predictionMaxWager}
        initialPrediction={myEventPrediction}
        players={event.registrations.filter(r => r.role !== "spectator").map(r => r.user)}
        lockAt={event.startAt.toISOString()}
      />
      <EventTippsList pot={predictionPot} tipps={eventTipps} />
    </div>
  ) : null;

  const summaryNode = event.status === "finished" && event.summary ? (
    <div className="mb-5"><EventSummarySection summary={event.summary} /></div>
  ) : null;

  // Ein Bereich für alle Beiträge zum Event — Werbung, Fotos & Clips und Berichte sind ein Typ.
  const postsNode = (
    <div id="beitraege" className="scroll-mt-36">
      <EventPostsSection eventId={event.id} canCreate={!!me} />
      <div className="mb-5"><IdeaFromButton label="Idee zu diesem Event" prefill={{ title: `Idee zu „${event.title}“`, eventId: event.id }} /></div>
    </div>
  );

  const clipNode = (event.twitchClipUrl || (event.status === "finished" && isRegistered)) ? (
    <div id="clip" className="scroll-mt-36 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
      {event.twitchClipUrl && (
        <div className="rounded-card border border-[#9146ff]/30 bg-surface shadow-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="size-4 text-[#9146ff]" />
            <span className="text-base font-extrabold text-fg">Event-Highlight</span>
          </div>
          <a href={event.twitchClipUrl} target="_blank" rel="noopener noreferrer"
            className={buttonClasses("secondary", "md")}>
            <ExternalLink className="size-4" /> Clip auf Twitch ansehen
          </a>
        </div>
      )}
      {event.status === "finished" && isRegistered && (
        <div className="rounded-card border border-line bg-surface shadow-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clapperboard className="size-4 text-muted" />
            <span className="text-base font-extrabold text-fg">Deinen Twitch-Clip einreichen</span>
          </div>
          <p className="text-sm text-muted mb-3">Hattest du einen guten Moment im Stream? Reiche deinen Clip ein.</p>
          <ClipSubmitter eventId={event.id} existingClipUrl={myClipSubmission?.clipUrl ?? null} />
        </div>
      )}
    </div>
  ) : null;

  // ── Turnier: Teilnehmer | Formatansicht, Ergebnis melden, Prüfen ──
  // Eigenes Match (Arbeitskarte) bzw. Stand im K.O. — eigener Abschnitt, live und ausgelost ganz oben
  const myMatchNode = (myOpenMatch || myKo.kind === "eliminated" || myKo.kind === "champion") ? (
    <section id="dein-match" aria-label="Dein Match" className="scroll-mt-36">
        {/* Eigenes offenes Match als Arbeitskarte: bestätigen oder melden direkt hier */}
        {myOpenMatch && (
          <div className="mb-4">
            <MyMatchCard
              match={myOpenMatch}
              report={myOpenReport}
              submission={myOpenSubmission}
              eventId={event.id}
              userId={userId}
              statFields={event.statFields ? JSON.parse(event.statFields) : []}
              locked={isParticipantEditLocked(event)}
              startAt={event.startAt.toISOString()}
              nextHint={myNextHint}
            />
          </div>
        )}
        {/* K.O.: kein offenes Match mehr — kurz sagen, wo man steht */}
        {!myOpenMatch && (myKo.kind === "eliminated" || myKo.kind === "champion") && (
          <p className={`mb-4 rounded-control border px-4 py-3 text-sm font-semibold ${myKo.kind === "champion" ? "border-coin/30 bg-coin-soft text-coin" : "border-line bg-surface text-muted"}`}>
            {myKo.kind === "champion"
              ? "Du hast das Turnier gewonnen — Glückwunsch!"
              : <>Du bist im {myKo.roundLabel} ausgeschieden{myKo.byUserId && <> gegen <span className="text-fg">{koNameOf(myKo.byUserId)}</span></>}.</>}
          </p>
        )}
    </section>
  ) : null;

  const tournamentNode = (
    <div id="turnier" className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5 scroll-mt-36">
      {/* Teilnehmerliste — mobil vor dem Start oben, danach eingeklappt unter der Turnieransicht */}
      {/* Nach dem Start eingeklappt (unten), damit Baum und Tabellen die volle Breite haben */}
      <div id="teilnehmer" className={`lg:col-span-1 xl:hidden scroll-mt-36 ${collapseParticipantsOnMobile ? "hidden" : ""}`}>
        <h2 className="text-base font-extrabold text-fg mb-3 flex items-center gap-2">
          <Users className="size-4" /> Teilnehmer
        </h2>
        {participantList}
      </div>

      {/* Format-spezifische Ansicht */}
      <div className={`min-w-0 xl:col-span-4 ${collapseParticipantsOnMobile ? "lg:col-span-4" : "lg:col-span-3"}`}>
        {/* Stand in Klartext — wie auf der Verwaltungsseite, ohne Werkzeuge */}
        {(duelStand?.total || statStand?.total) ? (() => {
          const played = duelStand?.played ?? statStand!.played;
          const total = duelStand?.total ?? statStand!.total;
          const pct = Math.round((played / total) * 100);
          return (
            <section aria-label="Turnier-Stand" className="mb-4 space-y-1.5">
              <p className="text-sm text-muted">
                <span className="font-extrabold text-fg">{FORMAT_LABELS[format] ?? format}</span>
                {event.status === "finished" ? " · beendet" : standStage ? ` · ${standStage}` : ""}
                <span className="text-subtle"> · {played} von {total} Matches gespielt</span>
              </p>
              <div className="h-2 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </section>
          );
        })() : null}

        <NextMatches upcoming={upcomingMatches} canReport={reportMatches.length > 0} shownMineId={myOpenMatch?.id ?? null} />
        {!hasTournament && !communityGoalProgress && (
          <div className="rounded-card border border-dashed border-line-strong p-8 text-center">
            <Swords className="size-8 mx-auto mb-2 text-subtle" />
            <p className="font-bold text-fg">Kein Spielplan für dieses Event</p>
            <p className="text-muted text-sm mt-1">Es läuft ohne Turnierbaum, alles Wichtige steht oben.</p>
          </div>
        )}
        {isElimination && (
          <BracketView
            matches={bracketMatches as Parameters<typeof BracketView>[0]["matches"]}
            participants={mergedParticipants}
            userId={userId}
            holders={holdersList}
          />
        )}
        {isGroupKnockout && (
          <GroupKnockoutView
            matches={event.matches}
            participants={mergedParticipants}
            members={groupMembers(event.participants, resolveGroupCount(groupStageCfg, event.participants))}
            advancePerGroup={groupStageCfg?.advancePerGroup ?? DEFAULT_ADVANCE_PER_GROUP}
            userId={userId}
            holders={holdersList}
          />
        )}
        {(isLiga || isRoundRobin) && (
          <LigaView
            matches={event.matches as Parameters<typeof LigaView>[0]["matches"]}
            participants={leagueParticipants}
            userId={userId}
            finalRankingNote={gamePhaseComplete ? event.finalRankingNote : null}
            excludedUserIds={[...excludedUserIds]}
          />
        )}
        {communityGoalProgress && (
          <CommunityGoalCard progress={communityGoalProgress} participants={mergedParticipants} userId={userId}
            pace={communityGoalPace} rewardCoins={communityGoal?.rewardCoins}
            settled={communityGoalSettled} streak={parseGoalState(event.goalStateJson).streak ?? null} />
        )}
        {isFfa && (
          <FfaView
            matches={event.matches as Parameters<typeof FfaView>[0]["matches"]}
            proofsByEntry={proofsByEntry}
            participants={mergedParticipants}
            statFields={event.statFields ? JSON.parse(event.statFields) : []}
            statPointsPer={statPointsPer}
            ligaPunkteByUser={ligaPunkteByUser}
            ligaPunkteBreakdownByUser={ligaPunkteBreakdownByUser}
            turnierpunkteByUser={turnierpunkteByUser}
            rankStatField={rankStatField}
            placementPoints={turnierpunkteCfg.placementPoints}
            isLigaPunkteLive={isLigaPunkteLive}
            projectedWinnerIds={liveLigaPunkte?.projectedWinnerIds ?? []}
            projectedWinnerBonusByUser={liveLigaPunkte?.projectedWinnerBonusByUser ?? {}}
            dominionResultByUser={dominionResultByUser}
            dominionThreshold={rawSeriesStatCfg.dominionBonus?.threshold}
            userId={userId}
            format={format}
            trackMatchWin={(rawSeriesStatCfg.matchWinStatKeys ?? []).length > 0 || standaloneMatchWinUsed}
            finalRankingGroups={rankingGroups}
            excludedUserIds={[...excludedUserIds]}
            avgWinnerDirection={avgDirection}
            pollWinnerIds={pollWinnerIds}
            pollLabel={pollLabel}
            pollWinsByUser={pollWinsByUser}
            votedUserIds={[...votedUserIds]}
            externalVoters={hasVoteSeriesPoints ? externalVoters.map(u => ({ userId: u.id, user: u })) : []}
            finalRankingNote={gamePhaseComplete ? event.finalRankingNote : null}
          />
        )}
        {/* Erst der Tabellenstand, darunter das (eingeklappte) Melden von Ergebnissen */}
        {reportMatches.length > 0 && (
          <div id="ergebnis-melden" className="scroll-mt-36">
            <MatchResultSubmit
              eventId={event.id}
              userId={userId}
              matches={reportMatches}
              submissions={mySubmissions}
              statFields={event.statFields ? JSON.parse(event.statFields) : []}
              locked={isParticipantEditLocked(event)}
              startAt={event.startAt.toISOString()}
            />
          </div>
        )}
        {/* Ergebnis-Prüfung direkt auf der Eventseite — nur für Verwalter (Mods/Admins, Ersteller,
            Squad-Captains), nur solange offene Meldungen da sind. Auch eigene Meldungen. */}
        {reviewData && reviewData.matches.length > 0 && (
          <div id="ergebnis-pruefen" className="scroll-mt-36 mt-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-fg">Ergebnis-Meldungen prüfen</h3>
              <span className="rounded-full bg-warning px-2 text-xs font-bold leading-5 text-canvas">
                {reviewData.matches.reduce((n, m) => n + m.submissions.length, 0)} offen
              </span>
              <Link href={`/events/verwalten/${event.id}/results`} className="ml-auto text-xs font-semibold text-primary-fg hover:text-fg">
                Alle Meldungen (auch erledigte) →
              </Link>
            </div>
            <ResultReviewClient eventId={event.id} matches={reviewData.matches} statFields={reviewData.statFields} />
          </div>
        )}
      </div>

      {collapseParticipantsOnMobile && (
        <details data-jump-target="teilnehmer" className="lg:col-span-4 xl:hidden group scroll-mt-36">
          <summary className="rounded-card border border-line bg-surface shadow-card px-4 min-h-12 flex items-center gap-3 cursor-pointer select-none list-none hover:border-line-strong [&::-webkit-details-marker]:hidden">
            <Users className="size-4 text-muted shrink-0" />
            <span className="text-base font-extrabold text-fg">Teilnehmer</span>
            <span className="text-xs font-semibold text-subtle tabular-nums">
              {sortedRegistrations.length}{eliminatedCount > 0 && ` · ${eliminatedCount} ausgeschieden`}
            </span>
            <span className="flex -space-x-1.5 ml-1 min-w-0 overflow-hidden">
              {sortedRegistrations.slice(0, 6).map(({ user }) => (
                <RankedAvatar key={user.id} userId={user.id} src={user.image} alt={userName(user)} size={22} variant="flat" />
              ))}
            </span>
            <ChevronDown className="size-4 text-subtle ml-auto shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2">{participantList}</div>
        </details>
      )}
    </div>
  );

  // ── Absprachen (Kommentare): vor dem Start weit oben und offen, danach mobil eingeklappt ──
  const commentsNode = userId ? (
    // Volle Breite wie die übrigen Abschnitte (vorher lg:max-w-3xl → schmaler als Turnieransicht/Regeln)
    <div className="mb-5">
      <EventComments
        eventId={event.id}
        userId={userId}
        isPlayer={isRegistered}
        initialUnread={commentCounts.get(event.id)?.unread ?? 0}
        collapsedOnMobile={!isPrePhase(pagePhase)}
      />
    </div>
  ) : (
    <div id="absprachen" className="rounded-card border border-line bg-surface shadow-card px-4 py-3 mb-5 flex items-center gap-3 text-sm text-muted">
      <MessageCircle className="w-4 h-4 text-primary-fg shrink-0" />
      <span className="flex-1">Absprachen zum Event gibt es für Mitglieder.</span>
      <GateButton href={`/tournament/${event.id}`} title="Mitreden"
        message="Für die Absprachen brauchst du einen Platz auf unserem Discord-Server. So kommst du rein:"
        className={buttonClasses("primary", "sm")}>
        Mitreden
      </GateButton>
    </div>
  );

  // ── Dein Ergebnis (nach dem Abschluss der Spielphase) ──
  const myResultNode = gamePhaseComplete && myReg ? (
    <MyEventResult
      place={myFinalPlace > 0 ? myFinalPlace : null}
      total={finalRanking.length}
      reward={eventRewardOf(event.completionData, userId)}
      absent={absentPlayerIds.has(userId)}
      excluded={excludedUserIds.has(userId)}
      spectator={isSpectator}
    />
  ) : null;

  // ── So läuft's ab (Turniere vor dem Start) ──
  // Für Zuschauer nicht (die Schritte betreffen Spieler)
  // (10) Ablauf-Leiste statt "So läuft's ab": für alle, in jeder Phase, mit Uhrzeiten
  const timelineNode = !event.blocksTournament && !event.blocksChallenge ? (
    <EventTimeline className="mb-3" steps={eventTimeline({
      phase: pagePhase,
      registrationClosesAt: event.registrationClosesAt ?? null,
      checkInAt: event.checkInEnabled ? checkInOpensAt(event) : null,
      hasDraw: isDrawFormat(event.format),
      drawn: isDrawn,
      startAt: event.startAt,
      endAt: event.endAt,
      period: isPeriodEvent(event) && !!event.endAt,
      hasVoting: hasPollStuff || pollWinnerCards.length > 0,
    })} />
  ) : null;
  const howToNode = null;

  // ── Reihenfolge je Phase ──
  const sectionNodes: Record<SectionKey, React.ReactNode> = {
    myMatch: myMatchNode, myResult: myResultNode, howTo: howToNode, description: descriptionNode, rules: rulesNode,
    stream: streamNode, communityPolls: communityPollsNode, gameVote: gameVoteNode, blocks: blocksNode,
    tournament: tournamentNode, comments: commentsNode, prediction: predictionNode, pokal: pokalNode, polls: pollsNode,
    posts: postsNode, results: resultsNode, summary: summaryNode, clip: clipNode,
  };

  // (4) Seitenspalte ab xl: Für dich, Streams, Teilnehmer — klebt beim Scrollen
  const aside = (
    <aside className="hidden xl:block" aria-label="Seitenspalte">
      <div className="sticky top-[8.5rem] space-y-4 pb-4">
        {forYou && <ForYouCard data={forYou} />}
        <EventStreams partners={streamPartners} streamers={streamUsers} compact />
        {sortedRegistrations.length > 0 && (
          <section data-jump-target="teilnehmer" aria-label="Teilnehmer" className="scroll-mt-36">
            <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold text-fg">
              <Users className="size-4" /> Teilnehmer
              <span className="text-xs font-semibold text-subtle tabular-nums">
                {playerCount}{event.maxPlayers ? `/${event.maxPlayers}` : ""}{spectatorCount > 0 ? ` · ${spectatorCount} Zuschauer` : ""}
              </span>
            </h2>
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-none rounded-card">{participantList}</div>
          </section>
        )}
      </div>
    </aside>
  );

  return (
    <div id="uebersicht" className={`px-5 pb-5 pt-0 sm:p-6 max-w-7xl mx-auto w-full min-w-0 ${dockAction ? "max-lg:pb-16" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <Link href="/events" className={buttonClasses("ghost", "sm", "-ml-3")}>
          <ArrowLeft className="size-4" /> Alle Events
        </Link>
        {(pagePhase === "drawn" || pagePhase === "live" || pagePhase === "voting") && <span className="ml-auto mr-2"><LiveRefresh /></span>}
        {canManage && (
          <Link href={`/events/verwalten/${event.id}`} className={buttonClasses("secondary", "sm")}>
            <Settings className="size-4" /> Verwalten
          </Link>
        )}
      </div>

      {communityBy && (
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted mb-3">
          <Glyph name="handshake" className="size-4 text-primary-fg" />
          Mitglieder-Event von <span className="font-semibold text-fg">@{communityBy}</span>
          {awaitingApproval && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning">wartet auf Freigabe durch einen Mod</span>}
        </p>
      )}

      {/* ── Ausgeblendet-Banner (nur für Admins/Mods sichtbar) ── */}
      {isHidden && isMod && (
        <div className="rounded-card px-4 py-3 mb-5 flex items-center gap-3 border border-warning/40 bg-warning-soft">
          <EyeOff className="size-4 text-warning shrink-0" />
          <p className="text-sm text-fg">
            <span className="font-semibold">Ausgeblendet</span> — {event.series?.hidden ? "die Eventreihe" : "dieses Event"} ist für normale Nutzer nicht sichtbar. Nur Admins/Mods können diese Seite über den Link aufrufen.
          </p>
        </div>
      )}

      {heroNode}
      {seriesCtx && <SeriesStrip ctx={seriesCtx} currentId={event.id} />}
      {timelineNode}
      {forYou && <ForYouCard data={forYou} className="mb-3 xl:hidden" />}
      {factsRow}
      {jumpLinks.length > 2 && jumpBar}

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6">
        <div className="min-w-0">
          {SECTION_ORDER[pagePhase].map(key => <React.Fragment key={key}>{sectionNodes[key]}</React.Fragment>)}
        </div>
        {aside}
      </div>

      {dockAction && <StickyActionDock watchId="aktion" title={dockTitle}>{dockAction}</StickyActionDock>}
    </div>
  );
}
