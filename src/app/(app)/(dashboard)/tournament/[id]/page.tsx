import React from "react";
import PlaceMedal from "@/components/PlaceMedal";
import { isOmaOriginal } from "@/lib/oma-original";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { genreMeta } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent, getSessionUser } from "@/lib/roles";
import { isAwaitingApproval } from "@/lib/community-events";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, ChevronDown, ChevronRight, CalendarPlus, Lock, Gamepad2 } from "@/components/icons";
import { ArrowLeft, Clock, Swords, Vote, Tv2, Eye, EyeOff, Clapperboard, CheckCircle2, Settings, Timer } from "@/components/icons";
import { isPeriodEvent, periodInfo } from "@/lib/event-period";
import RulesSection from "@/components/RulesSection";
import RankedAvatar from "@/components/RankedAvatar";
import StyledUserName, { StyledUserTitle } from "@/components/cosmetics/StyledUserName";
import GameCover from "@/components/GameCover";
import BotPreviewShell from "@/components/BotPreviewShell";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import WinIcon from "@/components/WinIcon";
import CoinIcon from "@/components/CoinIcon";
import ClientTime from "@/components/ClientTime";
import { FORMAT_LABELS } from "@/lib/tournament-formats";
import { formatBerlinDate, formatBerlinTime } from "@/lib/time";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import { TONE_CLASSES, dateBlock, eventPhase, parseRanking, startsInLabel } from "@/lib/event-display";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import EventLiveBadge from "./EventLiveBadge";
import EventSummarySection from "@/components/EventSummarySection";
import EventPostsSection from "@/components/EventPostsSection";
import IdeaFromButton from "@/components/community-jobs/IdeaFromButton";
import { getGameListInfo } from "@/lib/games/service";
import GameListInfo from "@/components/games/GameListInfo";
import RegisterButton from "@/app/(app)/(dashboard)/events/RegisterButton";
import SpectatorRegisterButton from "./SpectatorRegisterButton";
import CheckInButton from "./CheckInButton";
import ClipSubmitter from "./ClipSubmitter";
import PollsSection from "./PollsSection";
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
import { computeCommunityGoalProgress, goalPace } from "@/lib/community-goal";
import { resolveEventGoal } from "@/lib/event-goal";
import LigaView from "./LigaView";
import GroupKnockoutView from "./GroupKnockoutView";
import BlocksEventSection from "@/components/blocks/BlocksEventSection";
import { placementRewardFor } from "@/lib/placement-rewards";
import { DEFAULT_ADVANCE_PER_GROUP, GROUP_KNOCKOUT_FORMAT, aggregateKnockoutTies, computeLeagueStandings, groupLetter, groupMembers, knockoutRoundLabel, leagueMemberIds, parseGroupStageConfig, resolveGroupCount } from "@/lib/tournaments/groupStage";
import NextMatches, { type UpcomingMatch } from "./NextMatches";
import MatchResultSubmit, { type ReportMatch, type MySubmission } from "./MatchResultSubmit";
import ResultReviewClient from "@/app/(app)/(dashboard)/admin/events/[id]/results/ResultReviewClient";
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

  const [holdersMap, myEventPrediction, minigamesConfig, allEventPredictions, eventPokale] = await Promise.all([
    getWanderpocalHoldersMap(),
    prisma.eventWinnerPrediction.findUnique({
      where: { userId_eventId: { userId, eventId } },
      include: { predictedUser: { select: { id: true, username: true, name: true, image: true, rankPoints: true } } },
    }),
    getMinigamesConfig(),
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
  const gameVoteAddable = gameVote && isMod && gameVote.status !== "closed" ? await addableGames(event.id) : [];

  const myReg         = event.registrations.find((r) => r.userId === userId);
  const isRegistered  = !!myReg && myReg.role !== "spectator";
  const isSpectator    = !!myReg && myReg.role === "spectator";
  const isFullEvent    = !!(event.maxPlayers && event.registrations.filter(r => r.role !== "spectator").length >= event.maxPlayers);
  // OMA-Blocks-Challenge: Jeder trägt automatisch mit Solo-Läufen bei — keine Anmeldung nötig.
  const canRegister    = (event.status === "open" || event.status === "active") && !event.blocksChallenge;
  const isRegistrationLocked = event.registrationLocked || event.series?.registrationLocked || false;
  const restrictedSquadId = event.squadId ?? event.series?.squadId ?? null;
  const isSquadMember = restrictedSquadId
    ? !!(await prisma.squadMembership.findUnique({ where: { squadId_userId: { squadId: restrictedSquadId, userId } } }))
    : true;
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
        select: { matchId: true, userId: true, score1: true, score2: true },
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
              return r ? { score1: r.score1, score2: r.score2, reporterName: nm(toU(r.userId)) } : null;
            })(),
          };
        })
    : [];
  const mySubmissions: MySubmission[] = mySubmissionRows.map(sub => {
    const m = event.matches.find(x => x.id === sub.matchId);
    return {
      matchId: sub.matchId,
      subjectId: m && m.entries.length > 0 ? submissionSubject(sub) : null,
      status: sub.status, score1: sub.score1, score2: sub.score2, statsJson: sub.statsJson,
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
  const excludedUserIds     = new Set(completionData.excludedUserIds ?? []);

  // Anstehende Spiele mit feststehenden Gegnern (für "Dein nächstes Match" / "Nächste Spiele")
  const upcomingMatches: UpcomingMatch[] = (() => {
    if (!hasTournament) return [];
    const userOf = (id: string | null) => (id ? mergedParticipants.find(p => p.userId === id)?.user ?? null : null);
    const koRounds = Math.max(0, ...event.matches.filter(m => m.groupIndex == null && !m.isThirdPlace).map(m => m.round));
    const label = (m: (typeof event.matches)[number]) => {
      if (isFfa) return statRoundLabel(m);
      if (m.title) return m.title;
      if (isGroupKnockout && m.groupIndex != null) return `Gruppe ${groupLetter(m.groupIndex)} · Spieltag ${m.round}`;
      if (isLiga || isRoundRobin) return `Spieltag ${m.round}`;
      if (isFfa) return `Runde ${m.round}`;
      return (m.isThirdPlace ? "Spiel um Platz 3" : knockoutRoundLabel(m.round, koRounds))
        + (m.leg === 1 ? " · Hinspiel" : m.leg === 2 ? " · Rückspiel" : "");
    };
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

  // Turniersieger — nur wenn er wirklich feststeht:
  //  1. nach dem Abschluss die festgelegte Endplatzierung (inkl. Korrekturen/Disqualifikationen)
  //  2. K.O.-Formate: sobald das Finale entschieden ist
  //  3. Liga: erst wenn alle Spiele gespielt sind, dann der Tabellenerste (gleiche Tabelle wie unten)
  //  Stat-Formate haben vor dem Abschluss keinen eindeutigen Sieger.
  const winner: { name: string | null; username: string | null; image: string | null } | null = (() => {
    if (!hasTournament) return null;
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
  // Tempo: Ziel-Fortschritt im Vergleich zur verstrichenen Zeit (nur Zeitraum-Events mit Ende)
  const communityGoalPace = communityGoalProgress && event.endAt && isPeriodEvent(event) && event.status !== "finished"
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
  const ligaPunkteByUser: Record<string, number> = event.series
    ? (liveLigaPunkte
        ? liveLigaPunkte.pointsByUser
        : computeEventPoints(
            { completionData: event.completionData, registrations: event.registrations, matches: event.matches },
            rawSeriesStatCfg,
          ).pointsByUser)
    : {};

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
  const firstPlace = placementRewardFor(1, event.placementRewardsJson, event.series?.placementRewardsJson);
  const heroFirstPlaceCoins    = firstPlace.coins;
  const heroFirstPlaceRankPts  = firstPlace.rankPoints;
  const hasHeroFirstPlace      = heroFirstPlaceCoins > 0 || heroFirstPlaceRankPts > 0;
  const date = new Date(event.startAt);
  const serverTimeFallback = formatBerlinTime(date, { hour: "2-digit", minute: "2-digit" });

  // Stats für Header
  // Freilose (nur ein Spieler) sind keine echten Spiele — weder gespielt noch offen
  const realMatches = event.matches.filter(m => m.entries.length > 0 || !(m.winnerId && (!m.player1Id || !m.player2Id)));
  const playedMatches = realMatches.filter(m =>
    isElimination || (isGroupKnockout && m.groupIndex == null && !m.leg) ? !!m.winnerId : !!m.playedAt
  ).length;
  const totalMatches = realMatches.length;

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
  // Turnier-/Ziel-Ansicht, dann bleibt sie der Hauptinhalt. Desktop: immer Seitenspalte.
  const hasStarted = event.status === "finished" || event.startAt <= new Date();
  const collapseParticipantsOnMobile = hasStarted && (hasTournament || !!communityGoalProgress);

  const participantList = (
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
              <RankedAvatar userId={user.id} src={user.image} alt={userName(user)} size={28} className="w-7 h-7" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate font-medium flex items-center gap-1.5 ${isMe ? "text-rose-300" : "text-white"}`}>
                  <span className="truncate"><StyledUserName userId={user.id} name={userName(user)} />{isMe && " (du)"}</span>
                  {isSpectatorRow && <Eye className="w-3 h-3 text-gray-500 shrink-0" />}
                  {excludedUserIds.has(user.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">
                      Ungewertet
                    </span>
                  )}
                  {votedUserIds.has(user.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Abgestimmt
                    </span>
                  )}
                </p>
                <StyledUserTitle userId={user.id} className="block truncate leading-tight" />
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
                <RankedAvatar userId={user.id} src={user.image} alt={userName(user)} size={28} className="w-7 h-7" />
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
  );

  // ══ Darstellung ══════════════════════════════════════════════════════════════
  // Die Seite sortiert ihre Abschnitte nach Phase: vor dem Event zählen Anmeldung, Mitspieler und
  // Regeln; live das eigene Match und der Turnierbaum; in der Abstimmungsphase die Abstimmung; danach
  // das Ergebnis. Alle Abschnitte gibt es weiterhin, nur die Reihenfolge ändert sich.
  type PagePhase = "before" | "live" | "voting" | "after";
  const pagePhase: PagePhase =
    event.status === "finished" ? "after"
      : event.status === "umfrage" || gamePhaseComplete ? "voting"
        : event.status === "active" ? "live"
          : "before";
  const playerCount = event.registrations.filter(r => r.role !== "spectator").length;
  const phaseInfo = eventPhase({
    status: event.status, startAt: event.startAt, endAt: event.endAt, maxPlayers: event.maxPlayers,
    playerCount, isRegistered, gameVoteOpen: gameVote?.status === "open",
  });
  const heroDate = dateBlock(event.startAt);
  const startsIn = startsInLabel(event.startAt);
  const statusLabel = phaseInfo.label ?? (canRegister ? "Anmeldung offen" : null);
  const statusTone = phaseInfo.label ? TONE_CLASSES[phaseInfo.tone] : TONE_CLASSES.teal;

  // Ergebnis: Endplatzierung (ohne Ungewertete), Podest + eigener Platz
  const finalRanking = gamePhaseComplete ? parseRanking(event.finalRankingJson).filter(id => !excludedUserIds.has(id)) : [];
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

  // ── Kopf: Cover mit Titel, Datum, Status ──
  const heroNode = (
    <section aria-label={event.title} className="relative overflow-hidden rounded-2xl mb-3">
      {/* Priorität wie in der Discord-Ankündigung: eigenes Cover → Reihen-Cover
          → Steam-Cover (übernimmt GameCover selbst anhand von `game`) → Default. */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[16/6]">
        <GameCover
          game={event.game}
          coverUrl={event.coverImageUrl ?? event.series?.coverImageUrl ?? null}
          className="absolute inset-0 w-full h-full"
          rounded="rounded-none"
          imgClassName="w-full h-full object-cover"
          brandBadge
          omaOriginal={isOmaOriginal(event)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />

        {/* Kalenderblock */}
        <div className="absolute top-3 left-3 rounded-lg bg-[#0b0d12]/90 px-2.5 py-1.5 text-center leading-tight shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
          <div className={`text-[11px] font-semibold ${heroDate.top === "HEUTE" ? "text-teal-300" : "text-gray-400"}`}>{heroDate.top}</div>
          <div className="text-2xl font-bold !text-white tabular-nums">{heroDate.day}</div>
          <div className="text-[11px] text-gray-400 tabular-nums"><ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /></div>
        </div>

        {event.series && (
          <Link href={`/events/series/${event.series.id}`}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-[#0b0d12]/90 px-3 py-1 text-xs font-semibold text-gray-100 hover:text-white shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
            <SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" />
            {event.series.name} <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {statusLabel && (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusTone.pill}`} style={{ textShadow: "none" }}>
                {phaseInfo.phase === "live" && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                {phaseInfo.phase === "period" && <Timer className="w-3.5 h-3.5" />}
                {statusLabel}
              </span>
            )}
            {pagePhase === "before" && startsIn && (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-gray-200" style={{ textShadow: "none" }}>
                <Clock className="w-3.5 h-3.5" /> startet {startsIn}
              </span>
            )}
            {isRegistered && pagePhase !== "after" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-400/15 px-2 py-0.5 text-xs font-semibold text-teal-300" style={{ textShadow: "none" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Du bist dabei
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold !text-white leading-tight">
            {isOmaOriginal(event) && <OmaTitlePrefix title={event.title} />}
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            {formatBerlinDate(date, { weekday: "long", day: "2-digit", month: "long" })}
            {" · "}<ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /> Uhr
            {event.endAt && !period && <> – {formatBerlinTime(event.endAt, { hour: "2-digit", minute: "2-digit" })} Uhr</>}
            {period && <> · bis {formatBerlinDate(event.endAt!, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </div>
        {period && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40" title={`${Math.round(period.progress * 100)} % des Zeitraums vorbei`}>
            <div className="h-full bg-teal-400/80" style={{ width: `${period.progress * 100}%` }} />
          </div>
        )}
      </div>
    </section>
  );

  // ── Aktionsleiste: genau eine Hauptaktion je Phase, daneben Kalender/Discord/Zuschauer/Stream ──
  const BTN_SECONDARY = "inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.08] transition-colors";
  const primaryAction = (() => {
    if (myPendingVote) {
      return <a href="#abstimmung" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400"><Vote className="w-3.5 h-3.5" /> Abstimmen</a>;
    }
    if (pagePhase === "live" && reportMatches.length > 0) {
      return <a href="#ergebnis-melden" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-teal-950 hover:bg-teal-400">Ergebnis melden</a>;
    }
    if (pagePhase === "after" && isRegistered) {
      return <a href="#clip" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-teal-950 hover:bg-teal-400"><Clapperboard className="w-3.5 h-3.5" /> Clip einreichen</a>;
    }
    if (canRegister && (isRegistered || (!isRegistrationLocked && isSquadMember))) {
      return (
        <RegisterButton eventId={event.id} isRegistered={isRegistered} isFull={isFullEvent && !isRegistered} discordEventUrl={discordEventUrl}
          joinLabel={period ? "Jetzt einsteigen" : pagePhase === "live" ? "Einsteigen" : "Anmelden"} coins={participationCoins} />
      );
    }
    return null;
  })();
  const actionBar = (
    <div className="glass rounded-2xl px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
      {primaryAction}
      {isRegistered && event.checkInEnabled && event.status !== "finished" && (
        <CheckInButton
          eventId={event.id}
          startAt={event.startAt.toISOString()}
          checkInMinutes={event.checkInMinutes}
          drawn={event.matches.length > 0 || (!!event.blocksTournament && event.blocksTournament.stage !== "pending")}
          checkedIn={!!myReg?.checkedInAt}
        />
      )}
      {canRegister && event.spectatorMode && !isRegistered && (isSpectator || !isRegistrationLocked) && (
        <SpectatorRegisterButton eventId={event.id} isSpectator={isSpectator} />
      )}
      {canRegister && !isRegistered && !isSpectator && (isRegistrationLocked || !isSquadMember) && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Lock className="w-3.5 h-3.5" /> {isRegistrationLocked ? "Anmeldung nur durch Admins" : "Anmeldung nur für Squad-Mitglieder"}
        </span>
      )}
      {period && !isRegistered && canRegister && (
        <span className="text-xs text-gray-500">Einstieg jederzeit bis zum Ende möglich</span>
      )}
      {event.status === "umfrage" && discordChannelUrl && initialPolls.length === 0 && (
        <a href={discordChannelUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400">
          <Vote className="w-3.5 h-3.5" />
          {legacyPollConfig?.question ? `Jetzt für „${legacyPollConfig.question}“ abstimmen` : "Jetzt abstimmen"} ↗
        </a>
      )}
      <span className="flex-1" />
      {pagePhase !== "after" && (
        <a href={`/api/events/${event.id}/ics`} download className={BTN_SECONDARY}><CalendarPlus className="w-3.5 h-3.5" /> Kalender</a>
      )}
      {discordEventUrl && (
        <a href={discordEventUrl} target="_blank" rel="noopener noreferrer" className={BTN_SECONDARY}>Discord ↗</a>
      )}
      {canStreamRegister && <StreamRegisterButton eventId={eventId} isStreaming={isCommunityStreamer} />}
    </div>
  );

  // ── Fakten in einer Zeile ──
  const FACT = "inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs text-gray-300";
  const factsRow = (
    <div className="flex flex-wrap items-center gap-1.5 mb-5">
      {!event.game && gameVote && (
        <span className={`${FACT} text-violet-200`}><Vote className="w-3.5 h-3.5" /> Spiel wird per Abstimmung gewählt</span>
      )}
      {event.game && (
        <span className={FACT}>
          <Gamepad2 className="w-3.5 h-3.5 text-gray-500" />
          {gameListSlug
            ? <Link href={`/spiele/${gameListSlug}`} className="hover:text-teal-300 underline decoration-white/20 underline-offset-2">{event.game}</Link>
            : event.game}
          {genreInfo && <span className="flex items-center gap-1 text-gray-500"><AppIcon kind="genre" name={genreInfo.value} size={12} />{genreInfo.label}</span>}
        </span>
      )}
      {hasTournament && <span className={FACT}><Swords className="w-3.5 h-3.5 text-gray-500" />{FORMAT_LABELS[format] ?? format}</span>}
      {event.category && <EventCategoryBadge category={event.category as EventCategory} />}
      <span className={FACT}>
        <Users className="w-3.5 h-3.5 text-gray-500" />
        <span className="tabular-nums">{playerCount}{event.maxPlayers ? `/${event.maxPlayers}` : ""}</span> {event.maxPlayers ? "Plätze" : "dabei"}
        {event.maxPlayers && (
          <span className="ml-1 h-1 w-12 rounded-full bg-white/[0.08] overflow-hidden">
            <span className={`block h-full rounded-full ${isFullEvent ? "bg-gray-500" : "bg-teal-400"}`} style={{ width: `${Math.min(100, Math.round(playerCount / event.maxPlayers * 100))}%` }} />
          </span>
        )}
      </span>
      {hasHeroFirstPlace ? (
        <span className={`${FACT} text-amber-200`}>
          <PlaceMedal place={1} className="text-xs" />
          {heroFirstPlaceCoins > 0 && <span className="flex items-center gap-0.5 font-semibold text-amber-400"><CoinIcon size={12} />{heroFirstPlaceCoins}</span>}
          {heroFirstPlaceRankPts > 0 && <span className="flex items-center gap-0.5 font-semibold text-teal-400"><RankPointsIcon size={12} />{heroFirstPlaceRankPts}</span>}
        </span>
      ) : participationCoins > 0 ? (
        <span className={`${FACT} font-semibold text-amber-400`}>+{participationCoins} <CoinIcon size={12} /> fürs Mitmachen</span>
      ) : null}
      {hasTournament && totalMatches > 0 && (
        <span className={FACT}><span className="tabular-nums">{playedMatches}/{totalMatches}</span> Matches gespielt</span>
      )}
      <GameListInfo info={gameInfo} />
    </div>
  );

  // ── Sprungleiste ──
  const jumpLinks = [
    { href: "#uebersicht", label: "Übersicht", show: true },
    { href: "#abstimmung", label: "Abstimmung", show: hasPollStuff },
    { href: "#turnier", label: hasTournament ? "Turnier" : "Ablauf", show: hasTournament || !!communityGoalProgress },
    { href: "#teilnehmer", label: "Teilnehmer", show: sortedRegistrations.length > 0 },
    { href: "#beitraege", label: "Beiträge", show: true },
    { href: "#regeln", label: "Regeln", show: !!event.rules },
  ].filter(l => l.show);
  const jumpBar = (
    <nav aria-label="Abschnitte" className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 mb-4 bg-[#0b0d12]/90 backdrop-blur flex gap-1.5 overflow-x-auto scrollbar-none">
      {jumpLinks.map(l => (
        <a key={l.href} href={l.href}
          className="shrink-0 rounded-full border border-white/[0.1] px-3 py-1 text-xs font-medium text-gray-300 hover:border-white/[0.2] hover:bg-white/[0.04] transition-colors">
          {l.label}
        </a>
      ))}
    </nav>
  );

  // ── Ergebnis (Podest, dein Platz, Sieger der Abstimmungen) ──
  const showResults = podium.length > 0 || !!winner || pollWinnerCards.length > 0;
  const PODIUM_STEP = [
    { h: "h-10", bg: "bg-yellow-400/20", text: "text-yellow-300", ring: "ring-yellow-400/70", size: 44 },
    { h: "h-7", bg: "bg-slate-300/15", text: "text-slate-300", ring: "ring-slate-300/60", size: 36 },
    { h: "h-5", bg: "bg-orange-500/15", text: "text-orange-300", ring: "ring-orange-400/60", size: 36 },
  ];
  const resultsNode = showResults ? (
    <section aria-label="Ergebnis" className="glass rounded-2xl p-5 mb-5 border border-yellow-400/20 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <WinIcon size={18} /> {pagePhase === "after" ? "Ergebnis" : "Ergebnis (vorläufig)"}
        </h2>
        {myFinalPlace > 0 && (
          <span className="rounded-lg bg-teal-400/15 px-2.5 py-1 text-xs font-semibold text-teal-300">
            Du: Platz {myFinalPlace} von {finalRanking.length}
          </span>
        )}
      </div>
      {podium.length > 0 ? (
        <div className="flex items-end justify-center gap-3 pt-2">
          {[1, 0, 2].filter(i => podium[i]).map(i => {
            const p = podium[i];
            const st = PODIUM_STEP[i];
            const isMe = p.id === userId;
            return (
              <div key={p.id} className="flex flex-col items-center gap-1 min-w-0 w-24">
                <span className={`rounded-full ring-2 ${st.ring}`}>
                  <RankedAvatar userId={p.id} src={p.user!.image} alt={userName(p.user!)} size={st.size} variant="flat" />
                </span>
                <span className={`max-w-full truncate text-xs font-semibold ${isMe ? "text-teal-300" : "text-white"}`}>
                  {userName(p.user!)}{isMe && " (du)"}
                </span>
                <div className={`${st.h} w-full rounded-t-md ${st.bg} ${st.text} flex items-start justify-center text-xs font-bold pt-0.5`}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      ) : winner ? (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
          <WinIcon size={20} />
          <div>
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Turniersieger</p>
            <p className="text-white font-semibold">{userName(winner)}</p>
          </div>
        </div>
      ) : null}
      {pollWinnerCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pollWinnerCards.map(poll => (
            <div key={poll.id} className="rounded-xl bg-violet-500/[0.06] border border-violet-500/15 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300 mb-1.5"><Vote className="w-3.5 h-3.5" /> {poll.label}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {poll.winnerIds.map(uid => {
                  const u = personById(uid);
                  const name = u ? userName(u) : "Unbekannt";
                  const isMe = uid === userId;
                  return (
                    <span key={uid} className="flex items-center gap-1.5">
                      <RankedAvatar userId={u?.id} src={u?.image} alt={name} size={22} className="w-[22px] h-[22px]" />
                      <span className={`text-sm font-medium ${isMe ? "text-teal-300" : "text-violet-100"}`}>
                        <StyledUserName userId={u?.id} name={name} />{isMe && <span className="text-xs text-gray-500 ml-1">(du)</span>}
                      </span>
                    </span>
                  );
                })}
              </div>
              {poll.id === "legacy" && ((pollBonusCoins ?? 0) > 0 || (pollBonusRankPts ?? 0) > 0) && (
                <p className="flex items-center gap-2 mt-1 text-[10px] text-violet-400/80">
                  {(pollBonusCoins ?? 0) > 0 && <span className="flex items-center gap-0.5">+{pollBonusCoins} <CoinIcon size={11} /></span>}
                  {(pollBonusRankPts ?? 0) > 0 && <span className="flex items-center gap-0.5">+{pollBonusRankPts} <RankPointsIcon size={11} /></span>}
                </p>
              )}
              {poll.winnerIds.length > 1 && <p className="text-[10px] text-gray-500 mt-1">Gleichstand, alle {poll.winnerIds.length} erhalten dieselbe Belohnung.</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  ) : null;

  // ── Abstimmungen: ein Abschnitt für alt (Discord/Legacy) + neu (EventPoll) ──
  const pollsNode = hasPollStuff ? (
    <section id="abstimmung" aria-label="Abstimmung" className="mb-5 space-y-3 scroll-mt-20">
      {hasPendingPoll && (
        <div className="glass rounded-2xl p-5 space-y-3 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <Vote className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Abstimmung läuft: {pollLabel}</h2>
          </div>
          {((pollBonusCoins ?? 0) > 0 || (pollBonusRankPts ?? 0) > 0) && (
            <div className="flex items-center gap-2">
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
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {event.registrations.filter(({ user }) => !pollExcludedUserIds.has(user.id)).map(({ user }) => {
              const isMe = user.id === userId;
              const name = user.username ?? user.name ?? "Unbekannt";
              return (
                <div key={user.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-violet-500/[0.04] border border-violet-500/10 ${isMe ? "ring-1 ring-teal-500/30" : ""}`}>
                  <RankedAvatar userId={user.id} src={user.image} alt={name} size={24} className="w-6 h-6" />
                  <span className={`text-sm ${isMe ? "text-teal-300 font-medium" : "text-gray-200"}`}>
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
        <PollsSection eventId={event.id} userId={userId} initialPolls={initialPolls} />
      )}
      {!gamePhaseComplete && initialPolls.length > 0 && (
        <div className="glass rounded-2xl px-4 py-3 flex items-start gap-2">
          <Vote className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-500 leading-relaxed">
            <p>Nach Abschluss der Spielphase {initialPolls.length === 1 ? "startet folgende Umfrage" : "starten folgende Umfragen"}:</p>
            <ul className="mt-1 space-y-0.5">
              {initialPolls.map(p => (
                <li key={p.id} className="text-gray-400">
                  „{p.label}“{p.question ? <span className="text-gray-600"> – {p.question}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  ) : null;

  // ── Streams ──
  const streamNode = (streamingPartners.length > 0 || filteredCommunityStreamers.length > 0) ? (
    <section aria-label="Streams" className="glass rounded-2xl px-4 py-3 mb-5 space-y-2" style={{ border: "1px solid rgba(145,70,255,0.18)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <Tv2 className="w-3.5 h-3.5 text-[#9146ff] shrink-0" />
        <span className="text-xs text-gray-400 font-medium">Live übertragen von:</span>
        {streamingPartners.map(({ partner: p }) => (
          <a key={p.id} href={`https://twitch.tv/${p.twitchLogin}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            style={{ background: "rgba(145,70,255,0.12)", border: "1px solid rgba(145,70,255,0.25)", color: "#c4a3ff" }}>
            <Image src={p.logoUrl} alt={p.name} width={16} height={16} className="rounded-full shrink-0" />
            {p.name}
            <span className="opacity-50 text-[10px]">↗</span>
          </a>
        ))}
        {filteredCommunityStreamers.map(({ user: u }) => (
          u.twitchLogin ? (
            <a key={u.id} href={`https://twitch.tv/${u.twitchLogin}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
              style={{ background: "rgba(145,70,255,0.08)", border: "1px solid rgba(145,70,255,0.18)", color: "#c4a3ff" }}>
              <RankedAvatar userId={u.id} src={u.image} alt={u.name ?? u.username ?? ""} size={16} className="w-4 h-4" />
              {u.name ?? u.username}
              <span className="opacity-50 text-[10px]">↗</span>
            </a>
          ) : (
            <span key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}>
              <RankedAvatar userId={u.id} src={u.image} alt={u.name ?? u.username ?? ""} size={16} className="w-4 h-4" />
              {u.name ?? u.username}
            </span>
          )
        ))}
      </div>
      {streamingPartners.length > 0 && (
        <EventLiveBadge twitchLogins={streamingPartners.map(sp => sp.partner.twitchLogin.toLowerCase())} />
      )}
    </section>
  ) : null;

  const descriptionNode = event.description ? (
    <p className="glass rounded-2xl px-5 py-4 mb-5 text-sm text-gray-300 leading-relaxed whitespace-pre-line">{event.description}</p>
  ) : null;

  const gameVoteNode = gameVote ? (
    <GameVoteSection eventId={event.id} view={gameVote} isMod={isMod} addable={gameVoteAddable} rules={event.rules} format={event.format} />
  ) : null;

  const rulesNode = <RulesSection id="regeln" rules={event.rules} preview={pagePhase === "before" ? 4 : 3} className="mb-5" />;

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
  const predictionNode = event.type === "tournament" ? (
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
  ) : null;

  const summaryNode = event.status === "finished" && event.summary ? (
    <div className="mb-5"><EventSummarySection summary={event.summary} /></div>
  ) : null;

  // Ein Bereich für alle Beiträge zum Event — Werbung, Fotos & Clips und Berichte sind ein Typ.
  const postsNode = (
    <div id="beitraege" className="scroll-mt-20">
      <EventPostsSection eventId={event.id} canCreate={!!me} />
      <div className="mb-5"><IdeaFromButton label="Idee zu diesem Event" prefill={{ title: `Idee zu „${event.title}“`, eventId: event.id }} /></div>
    </div>
  );

  const clipNode = (event.twitchClipUrl || (event.status === "finished" && isRegistered)) ? (
    <div id="clip" className="scroll-mt-20 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
      {event.twitchClipUrl && (
        <div className="glass rounded-2xl p-4" style={{ border: "1px solid rgba(145,70,255,0.15)" }}>
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
      {event.status === "finished" && isRegistered && (
        <div className="glass rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-300">Deinen Twitch-Clip einreichen</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Hattest du einen guten Moment im Stream? Reiche deinen Clip ein.</p>
          <ClipSubmitter eventId={event.id} existingClipUrl={myClipSubmission?.clipUrl ?? null} />
        </div>
      )}
    </div>
  ) : null;

  // ── Turnier: Teilnehmer | Formatansicht, Ergebnis melden, Prüfen ──
  const tournamentNode = (
    <div id="turnier" className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5 scroll-mt-20">
      {/* Teilnehmerliste — mobil vor dem Start oben, danach eingeklappt unter der Turnieransicht */}
      <div id="teilnehmer" className={`lg:col-span-1 scroll-mt-20 ${collapseParticipantsOnMobile ? "hidden lg:block" : ""}`}>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Teilnehmer
        </h2>
        {participantList}
      </div>

      {/* Format-spezifische Ansicht */}
      <div className="lg:col-span-3 min-w-0">
        <NextMatches upcoming={upcomingMatches} canReport={reportMatches.length > 0} />
        {!hasTournament && !communityGoalProgress && (
          <div className="glass rounded-2xl p-8 text-center">
            <Swords className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-gray-400 font-medium">Kein Spielplan für dieses Event</p>
            <p className="text-gray-600 text-sm mt-1">Es läuft ohne Turnierbaum, alles Wichtige steht oben.</p>
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
            pace={communityGoalPace} rewardCoins={communityGoal?.rewardCoins} />
        )}
        {isFfa && (
          <FfaView
            matches={event.matches as Parameters<typeof FfaView>[0]["matches"]}
            proofsByEntry={proofsByEntry}
            participants={mergedParticipants}
            statFields={event.statFields ? JSON.parse(event.statFields) : []}
            statPointsPer={statPointsPer}
            ligaPunkteByUser={ligaPunkteByUser}
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
          <div id="ergebnis-melden" className="scroll-mt-24">
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
          <div id="ergebnis-pruefen" className="scroll-mt-24 mt-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-300">Ergebnis-Meldungen prüfen</h3>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-semibold">
                {reviewData.matches.reduce((n, m) => n + m.submissions.length, 0)} offen
              </span>
              <Link href={`/admin/events/${event.id}/results`} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
                Alle Meldungen (auch erledigte) →
              </Link>
            </div>
            <ResultReviewClient eventId={event.id} matches={reviewData.matches} statFields={reviewData.statFields} />
          </div>
        )}
      </div>

      {collapseParticipantsOnMobile && (
        <details className="lg:hidden group">
          <summary className="glass rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-semibold text-white">Teilnehmer</span>
            <span className="text-xs text-gray-500 tabular-nums">{sortedRegistrations.length}</span>
            <span className="flex -space-x-1.5 ml-1 min-w-0 overflow-hidden">
              {sortedRegistrations.slice(0, 6).map(({ user }) => (
                <RankedAvatar key={user.id} userId={user.id} src={user.image} alt={userName(user)} size={22} variant="flat" />
              ))}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 ml-auto shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2">{participantList}</div>
        </details>
      )}
    </div>
  );

  // ── Reihenfolge je Phase ──
  const sections: Record<PagePhase, React.ReactNode[]> = {
    before: [descriptionNode, gameVoteNode, blocksNode, tournamentNode, predictionNode, rulesNode, pokalNode, pollsNode, postsNode],
    live: [streamNode, resultsNode, blocksNode, tournamentNode, pollsNode, predictionNode, descriptionNode, rulesNode, postsNode, pokalNode],
    voting: [pollsNode, resultsNode, streamNode, tournamentNode, blocksNode, postsNode, predictionNode, descriptionNode, rulesNode, pokalNode],
    after: [resultsNode, pokalNode, summaryNode, clipNode, postsNode, pollsNode, tournamentNode, blocksNode, predictionNode, descriptionNode, rulesNode],
  };
  // Stream gehört vor dem Event und danach nicht nach oben — aber nicht verloren gehen lassen
  if (pagePhase === "before" && streamNode) sections.before.splice(1, 0, streamNode);

  return (
    <div id="uebersicht" className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/events" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit group">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        {canManage && (
          <Link
            href={`/admin/events/${event.id}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium"
          >
            <Settings className="w-3.5 h-3.5" /> Verwalten
          </Link>
        )}
      </div>

      {communityBy && (
        <p className="text-xs text-violet-300/90 mb-3">
          Community-Event von <span className="font-semibold">@{communityBy}</span>
          {awaitingApproval && <span className="text-amber-300/90"> · wartet noch auf Freigabe durch einen Mod</span>}
        </p>
      )}

      {/* ── Ausgeblendet-Banner (nur für Admins/Mods sichtbar) ────────────── */}
      {isHidden && isMod && (
        <div className="glass rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 border border-rose-500/20 bg-rose-500/[0.04]">
          <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">
            <span className="font-semibold">Ausgeblendet</span> — {event.series?.hidden ? "die Eventreihe" : "dieses Event"} ist für normale Nutzer nicht sichtbar. Nur Admins/Mods können diese Seite über den Link aufrufen.
          </p>
        </div>
      )}

      {heroNode}
      {actionBar}
      {factsRow}
      {jumpLinks.length > 2 && jumpBar}

      {sections[pagePhase].map((node, i) => <React.Fragment key={i}>{node}</React.Fragment>)}
    </div>
  );
}
