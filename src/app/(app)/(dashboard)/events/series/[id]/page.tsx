import React from "react";
import { eventHasPlacement } from "@/lib/event-placement";
import { isOmaOriginalSeries } from "@/lib/oma-original";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "@/components/icons";
import { Users } from "@/components/icons";
import { ChevronRight } from "@/components/icons";
import { ArrowLeft, Trophy, Crown, Swords, Gamepad2, Zap, Archive, CheckCircle2, EyeOff, CalendarPlus } from "@/components/icons";
import RulesSection from "@/components/RulesSection";
import SeriesIcon from "@/components/SeriesIcon";
import GameCover from "@/components/GameCover";
import { resolveSeriesColor } from "@/lib/series-icons";
import PollsSection from "@/app/(app)/(dashboard)/tournament/[id]/PollsSection";
import SeriesStandingsTable from "./SeriesStandingsTable";
import SeriesEventList from "./SeriesEventList";
import SeriesEventExtras from "./SeriesEventExtras";
import { eventPayout } from "@/lib/placement-rewards";
import PlaceMedal from "@/components/PlaceMedal";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeasonTimeline, { type TimelineEvent } from "./SeasonTimeline";
import { timelineStates } from "@/lib/series-timeline";
import MyStandingCard, { type MyStanding } from "./MyStandingCard";
import SectionTabs from "@/components/SectionTabs";
import { parseRanking, startsInLabel } from "@/lib/event-display";
import { formatBerlinDate } from "@/lib/time";
import EventCard from "@/components/events/EventCard";
import EventCardActions from "@/components/events/EventCardActions";
import { EVENT_CARD_INCLUDE, toEventCardData } from "@/lib/event-card-data";
import { getCommentCounts } from "@/lib/event-comments";
import { loadEventViewerContext } from "@/lib/event-viewer";
import FullStandingsToggle from "./FullStandingsToggle";
import type { DeltaInfo } from "./SeriesStandingsTable";
import { computeEventPoints, computeStatStandings, latestStatFields, resolveWinnerTargetKeys, type StatConfig } from "@/lib/series-event-points";
import {
  ALL_TIME_COLS, buildAllTimeStandings, parseSeriesCompletion, parseStatAliases, parseStatConfig, previousSeasonBadges,
  resolveStatAlias, seasonPlacements, seasonStandings,
} from "@/lib/series-seasons";
import { getEventEndedAt, isRecentlyFinished } from "@/lib/event-completion";
import EventPokalWinners from "@/components/EventPokalWinners";
import PokalPreview from "@/components/PokalPreview";
import { FORMAT_LABELS } from "@/lib/tournament-formats";
import { buttonClasses } from "@/components/ui/button-styles";
import RankedAvatar from "@/components/RankedAvatar";
import { MEDAL, Podium, type PodiumEntry } from "@/components/ui/Podium";
import EventJumpBar from "@/app/(app)/(dashboard)/tournament/[id]/EventJumpBar";
import StandingsHeader from "./StandingsHeader";
import { termLabel } from "@/lib/series-schedule";
import { formatBerlinDateTime } from "@/lib/time";

type ArchivedSeason = {
  id: string; name: string; seasonNumber: number | null; archivedAt: Date | null;
  firstEventAt: Date | null; eventCount: number;
  podium: { place: number; user: { id: string; name: string | null; username: string | null; image: string | null } }[];
};

// Medaillenfarben wie beim Podest (components/ui/Podium)
const PODIUM_RING = MEDAL.map(m => m.ring);

function SaisonArchiv({ currentId, archivedSeasons }: { currentId: string; archivedSeasons: ArchivedSeason[] }) {
  if (!archivedSeasons.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-extrabold text-fg flex items-center gap-2">
        <Archive className="size-4 text-muted" /> Vergangene Saisons
      </h2>
      <div className="rounded-card border border-line bg-surface shadow-card overflow-hidden divide-y divide-line">
        {archivedSeasons.map(s => (
          <Link key={s.id} href={`/events/series/${s.id}`}
            className={`flex items-center gap-3.5 px-4 py-3 hover:bg-surface-2 transition-colors group ${s.id === currentId ? "bg-surface-2" : ""}`}>
            <div className="size-10 rounded-control bg-coin-soft flex items-center justify-center shrink-0">
              <Archive className="size-4 text-coin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-fg truncate group-hover:text-primary-fg transition-colors">
                {s.name}
                {s.id === currentId && <span className="ml-2 text-xs text-subtle">(diese Saison)</span>}
              </p>
              <p className="text-xs text-subtle mt-0.5">
                {s.firstEventAt
                  ? new Date(s.firstEventAt).toLocaleDateString("de-DE", { month: "short", year: "numeric", timeZone: "Europe/Berlin" })
                  : "–"}
                {" · "}
                {s.eventCount} Events
                {s.archivedAt && (
                  <> · abgeschlossen {new Date(s.archivedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin" })}</>
                )}
              </p>
              {s.podium.length > 0 && (
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  {s.podium.map(({ place, user }) => (
                    <span key={user.id} className={`flex items-center gap-1 text-xs ${place === 1 ? "text-coin font-bold" : "text-muted"}`}>
                      {place === 1 && <Crown className="size-3.5 text-coin" />}
                      <span className={`rounded-full ring-1 ${PODIUM_RING[place - 1] ?? ""}`}><RankedAvatar userId={user.id} src={user.image} alt={user.username ?? user.name ?? ""} size={16} className="w-4 h-4" /></span>
                      <span className="text-subtle">{place}.</span> {user.username ?? user.name ?? "?"}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-coin bg-coin-soft">
                Saison {s.seasonNumber ?? "–"}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-subtle group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Umschalter zwischen den Saisons einer Reihe und der All-Time-Tabelle */
function SeasonSwitcher({ currentId, seasons }: {
  currentId: string;
  seasons: { id: string; name: string; seasonNumber: number | null; status: string }[];
}) {
  if (seasons.length < 2) return null;
  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1" aria-label="Saisons">
      {seasons.map((s, i) => {
        const current = s.id === currentId;
        return (
          <Link key={s.id} href={`/events/series/${s.id}`} title={s.name} aria-current={current ? "page" : undefined}
            className={`shrink-0 inline-flex min-h-9 items-center text-sm font-semibold rounded-full px-3.5 border transition-colors whitespace-nowrap ${
              current
                ? "bg-primary-soft border-primary/40 text-primary-fg"
                : "border-line bg-surface text-muted hover:text-fg hover:border-line-strong"
            }`}>
            Saison {s.seasonNumber ?? i + 1}
            {s.status === "active" && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-success align-middle" title="Aktuelle Saison" />}
          </Link>
        );
      })}
    </nav>
  );
}


type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me     = await getSessionUser();
  const userId = me?.id;
  const isMod  = me?.role === "moderator" || me?.role === "admin";

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } },
            },
          },
          matches: {
            select: { entries: { select: { userId: true, statsJson: true } } },
          },
          streamingPartners: { include: { partner: true } },
        },
      },
    },
  });

  if (!series) notFound();
  if (series.hidden && !isMod) notFound();

  const seriesColor = resolveSeriesColor(series.icon);

  // ── Nur die aktuell aktive Umfrage (falls vorhanden) aller Events dieser Reihe ──
  // Weder kommende noch beendete Umfragen werden hier angezeigt — nur was gerade läuft.
  // Die Abstimmung selbst kann direkt hier vorgenommen werden (kein reiner Link mehr).
  const now = new Date();
  const activeEventPolls = await prisma.eventPoll.findMany({
    where: { eventId: { in: series.events.map(e => e.id) }, startAt: { lte: now }, endAt: { gte: now } },
    include: { votes: { select: { voterId: true, targetId: true } } },
    orderBy: { startAt: "asc" },
  });
  const eventTitleMap = new Map(series.events.map(e => [e.id, e.title]));
  const eventRegsMap  = new Map(series.events.map(e => [e.id, e.registrations]));
  type ActivePollAnswerOption = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
  type ActivePoll = {
    id: string; label: string; question: string; voterEligibility: string; answerType: string;
    customAnswers: string[]; startAt: string; endAt: string; rewardsPaid: boolean;
    winnerIds: string[] | null; participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number;
    voteCounts: Record<string, number>; myVote: string | null;
    answerOptions: ActivePollAnswerOption[] | null;
    excludedUserIds: string[];
  };
  type ActivePollGroup = {
    eventId: string; eventTitle: string; polls: ActivePoll[];
    registrations: (typeof series.events)[number]["registrations"];
  };
  const activePollGroupsMap = new Map<string, ActivePollGroup>();
  for (const p of activeEventPolls) {
    const eventRegs = eventRegsMap.get(p.eventId) ?? [];
    let excludedUserIds: string[] = [];
    if (p.excludedUserIds) { try { excludedUserIds = JSON.parse(p.excludedUserIds); } catch { /* ignore */ } }
    const excludedSet = new Set(excludedUserIds);

    const voteCounts: Record<string, number> = {};
    let myVote: string | null = null;
    for (const v of p.votes) {
      if (excludedSet.has(v.targetId)) continue;
      voteCounts[v.targetId] = (voteCounts[v.targetId] ?? 0) + 1;
      if (v.voterId === userId) myVote = v.targetId;
    }
    let customAnswers: string[] = [];
    if (p.customAnswers) { try { customAnswers = JSON.parse(p.customAnswers); } catch { /* ignore */ } }
    let winnerIds: string[] | null = null;
    if (p.winnerIds) { try { winnerIds = JSON.parse(p.winnerIds); } catch { /* ignore */ } }
    let answerOptions: ActivePollAnswerOption[] | null = null;
    if (p.answerType === "players") answerOptions = eventRegs.filter(r => r.role === "player" && !excludedSet.has(r.user.id)).map(r => r.user);
    else if (p.answerType === "spectators") answerOptions = eventRegs.filter(r => r.role === "spectator" && !excludedSet.has(r.user.id)).map(r => r.user);

    const group = activePollGroupsMap.get(p.eventId) ?? {
      eventId: p.eventId, eventTitle: eventTitleMap.get(p.eventId) ?? "", polls: [], registrations: eventRegs,
    };
    group.polls.push({
      id: p.id, label: p.label, question: p.question, voterEligibility: p.voterEligibility, answerType: p.answerType,
      customAnswers, startAt: p.startAt.toISOString(), endAt: p.endAt.toISOString(), rewardsPaid: p.rewardsPaid, winnerIds,
      participationCoins: p.participationCoins, participationSeriesPoints: p.participationSeriesPoints,
      winnerCoins: p.winnerCoins, winnerRankPoints: p.winnerRankPoints, voteCounts, myVote, answerOptions, excludedUserIds,
    });
    activePollGroupsMap.set(p.eventId, group);
  }
  const activePollGroups = [...activePollGroupsMap.values()];

  const statCfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null; } catch { return null; }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  })();

  // Abgeschlossene Saison: die beim Abschluss gespeicherte Endtabelle (spätere Korrekturen an einzelnen
  // Events verändern sie nicht mehr). Ältere Abschlüsse ohne gespeicherte Tabelle werden live berechnet.
  const snapshotRows = series.status === "archived"
    ? parseSeriesCompletion(series.seriesCompletionData).finalStandings?.rows ?? null
    : null;
  const live = snapshotRows ? null : computeStatStandings(series.events, statCfg, legacyRows);
  const standings = snapshotRows ?? live!.rows;
  const evStatFieldsSeen = live?.evStatFieldsSeen ?? new Set(snapshotRows!.flatMap(r => Object.keys(r.stats)));

  // ── Eigener Rang ("Dein Stand") ────────────────────────────────────────────
  const myRank   = userId ? standings.findIndex(s => s.userId === userId) + 1 : 0;

  // ── Standings users ────────────────────────────────────────────────────────
  const standingUserIds = standings.map(s => s.userId);
  const standingUsers = standingUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: standingUserIds } },
        select: { id: true, name: true, username: true, image: true, rankPoints: true },
      })
    : [];

  const configuredFields = new Set(statCfg.stats.map(s => s.field));
  const reservedFields   = new Set(["participations", "__legacyPoints"]);
  // Internal streak keys should never appear as columns
  const isInternalField  = (f: string) => f.startsWith("_streak_");
  const specialFields    = new Set(
    [statCfg.mvpStatField, statCfg.defaultWinnerTargetField].filter((f): f is string => !!f)
  );
  // Poll config from series (label + Punkte für Teilnahme/Sieg)
  const pollConfigs: { label: string; participationSeriesPoints: number; winnerRankPoints: number }[] = (() => {
    try {
      const raw = series.pollsConfigJson ?? series.pollConfigJson;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const arr: { label?: string; question?: string; participationSeriesPoints?: number; winnerRankPoints?: number; rankPoints?: number }[] =
        Array.isArray(parsed) ? parsed : (parsed.enabled ? [parsed] : []);
      return arr
        .map(p => ({
          label: p.label ?? p.question ?? "",
          participationSeriesPoints: p.participationSeriesPoints ?? 0,
          winnerRankPoints: p.winnerRankPoints ?? p.rankPoints ?? 0,
        }))
        .filter(p => p.label);
    } catch { return []; }
  })();
  const pollLabels: string[] = pollConfigs.map(p => p.label);
  // Poll-related fields and winner stat keys should never appear as extra columns in der kompakten
  // Tabelle — die Umfrage-Siege selbst (pollLabels als eigene Spalte) gibt es NUR in der
  // Vollständigen Tabelle (fullExtraCols unten), da diese sonst zu breit für "Aktueller Stand" wird.
  const pollRelatedFields = new Set<string>(["Umfrage-Teilnahmen", "Umfrage-Teilnahmepunkte"]);
  for (const label of pollLabels) {
    for (const suffix of ["", "_Abstimmungen", "_Teilnahmepunkte", "_Siegerpunkte"]) {
      pollRelatedFields.add(`${label}${suffix}`);
    }
  }
  // Dominion Bonus: ebenfalls nur in der Vollständigen Tabelle, aus demselben Platzgrund.
  const dominionFieldSet = new Set<string>(["Dominion Bonus", "Dominion Bonus Punkte"]);
  const winnerStatKeySet = new Set(statCfg.winnerStatKeys ?? []);
  // Collect extra fields: from event-derived data only (excluding poll-related, winner stats, internal)
  const allExtraFields = new Set<string>();
  for (const f of evStatFieldsSeen) {
    if (!configuredFields.has(f) && !reservedFields.has(f) && !isInternalField(f)
        && !pollRelatedFields.has(f) && !winnerStatKeySet.has(f) && !dominionFieldSet.has(f))
      allExtraFields.add(f);
  }
  // Special fields first, then poll/dominion fields
  const extraCols = [
    ...[...specialFields].filter(f => allExtraFields.has(f)),
    ...[...allExtraFields].filter(f => !specialFields.has(f)).sort(),
  ].filter(f => standings.some(row => (row.stats[f] ?? 0) > 0));
  const showPoints = standings.some(r => r.totalPoints > 0);
  // Solange noch niemand Tabellenpunkte hat, zeigt die Kompakt-Tabelle statt der leeren Punkte-Spalte
  // ersatzweise den konfigurierten Gewinner-Stat der Reihe (z.B. "Wochensieg") — aussagekräftiger
  // als die reine Teilnahmezahl, ohne dafür ein eigenes Punktesystem konfigurieren zu müssen.
  const fallbackStatField = showPoints ? undefined : resolveWinnerTargetKeys(statCfg)[0];

  // ── Vollständige Tabelle: zusätzliche Spalten ───────────────────────────────
  // Umfrage-Siege (eine Spalte je konfigurierter Umfrage, Label = Umfragename) + Dominion Bonus
  // (falls aktiv) — bewusst NICHT nach ">0 bei irgendjemandem" gefiltert (anders als extraCols oben):
  // die Spalten sollen als Struktur sichtbar sein, auch bevor die erste Umfrage/der erste Bonus
  // ausgewertet wurde.
  const fullExtraCols = [
    ...extraCols,
    ...pollLabels,
    ...(statCfg.dominionBonus?.enabled ? ["Dominion Bonus"] : []),
  ];
  // Zuschauer werden getrennt von Mitspielern gezählt, sobald mindestens ein Event der Reihe
  // Zuschauer-Tracking aktiviert hat (unabhängig davon, ob bereits jemand als anwesend erfasst wurde).
  const hasSpectatorTracking = series.events.some(e => e.spectatorMode);

  // Aktueller Dominion-Streak je User (öffentlich sichtbar, nicht nur der eigene) — aus der
  // Reihen-Rohtabelle (seriesStandingsJson), dieselbe Quelle wie im Moderatoren-Abschluss-Formular
  // (siehe admin/events/[id]/complete/page.tsx). Wird erst befüllt, sobald ein Event abgeschlossen
  // wurde, WÄHREND der Dominion Bonus aktiv konfiguriert war — bereits vorher abgeschlossene Events
  // tragen rückwirkend nichts bei, solange sie nicht erneut gespeichert werden.
  const dominionStreaks: Record<string, number> = (() => {
    const cfg = statCfg.dominionBonus;
    const triggerStats = cfg?.triggerStats ?? [];
    if (!cfg?.enabled || triggerStats.length === 0 || !series.seriesStandingsJson) return {};
    const streakKey = `_streak_[${triggerStats.join(",")}]`;
    try {
      const cache = JSON.parse(series.seriesStandingsJson) as { raw?: Record<string, Record<string, number>> };
      const out: Record<string, number> = {};
      for (const [uid, row] of Object.entries(cache.raw ?? {})) {
        const val = row[streakKey] ?? 0;
        if (val > 0) out[uid] = val;
      }
      return out;
    } catch { return {}; }
  })();

  // ── Delta since last game-phase-complete event ─────────────────────────────
  const gamePhaseCompleteEvents = series.events
    .filter(e => {
      if (!e.completionData) return false;
      try { return (JSON.parse(e.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true; }
      catch { return false; }
    })
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const lastEventDelta: Record<string, DeltaInfo> = {};

  if (!snapshotRows && gamePhaseCompleteEvents.length > 0) {
    const lastEv = gamePhaseCompleteEvents[0];
    const { pointsByUser: lastEvPoints, participationsByUser: lastEvPart, statsByUser: lastEvStats } =
      computeEventPoints(lastEv, statCfg);

    const prevPointsMap = new Map<string, number>();
    const prevPartMap   = new Map<string, number>();
    for (const row of standings) {
      const prevPts = row.totalPoints - (lastEvPoints[row.userId] ?? 0);
      prevPointsMap.set(row.userId, prevPts);
      prevPartMap.set(row.userId, row.participations - (lastEvPart[row.userId] ?? 0));
    }

    const prevRanked = standings
      .filter(row => (prevPointsMap.get(row.userId) ?? 0) > 0 || (prevPartMap.get(row.userId) ?? 0) > 0)
      .sort((a, b) => {
        const ptsDiff = (prevPointsMap.get(b.userId) ?? 0) - (prevPointsMap.get(a.userId) ?? 0);
        if (ptsDiff !== 0) return ptsDiff;
        return (prevPartMap.get(b.userId) ?? 0) - (prevPartMap.get(a.userId) ?? 0);
      });
    const prevRankMap = new Map(prevRanked.map((r, i) => [r.userId, i + 1]));

    for (let i = 0; i < standings.length; i++) {
      const row = standings[i];
      const currentRank = i + 1;
      const prevRank = prevRankMap.get(row.userId);
      const participated = (lastEvPart[row.userId] ?? 0) > 0;
      const isNew = prevRank === undefined;
      const statDeltas: Record<string, number> = {};
      for (const [field, val] of Object.entries(lastEvStats[row.userId] ?? {})) {
        if (val > 0) statDeltas[field] = val;
      }
      const pointsDelta = row.totalPoints - (prevPointsMap.get(row.userId) ?? row.totalPoints);
      lastEventDelta[row.userId] = {
        rankDelta: isNew ? 0 : prevRank! - currentRank,
        pointsDelta,
        statDeltas,
        participated,
        isNew,
      };
    }
  }

  const hasDelta = Object.keys(lastEventDelta).length > 0;

  // ── Event lists ────────────────────────────────────────────────────────────
  const byStart = (a: { startAt: Date }, b: { startAt: Date }) => a.startAt.getTime() - b.startAt.getTime();
  const activeEvents = series.events.filter(e => e.status === "active" || e.status === "umfrage").sort(byStart);
  // "closed" = voll — bleibt bei den kommenden Terminen sichtbar
  const openEvents = series.events.filter(e => e.status === "open" || e.status === "closed").sort(byStart);
  const finishedEventsAll = series.events
    .filter(e => e.status === "finished")
    .sort((a, b) => getEventEndedAt(b).getTime() - getEventEndedAt(a).getTime());
  // Kürzlich beendete Events bleiben eine Zeit lang oben bei den anstehenden Events sichtbar,
  // bevor sie in die eingeklappten "Vergangenen Events" wandern.
  const recentlyFinishedEvents = finishedEventsAll.filter(e => isRecentlyFinished(e));
  const finishedEvents = finishedEventsAll.filter(e => !isRecentlyFinished(e));
  // Max. 5 kommende Termine (laufende zuerst)
  const upcomingEventIds = [
    ...recentlyFinishedEvents,
    ...activeEvents.slice(0, 5),
    ...openEvents.slice(0, Math.max(0, 5 - activeEvents.length)),
  ].map(e => e.id);
  const pastEventIds = finishedEvents.map(e => e.id);
  // Abgesagte kommende Termine bleiben sichtbar ("fällt aus"), damit niemand sie sucht (lib/event-cancel.ts)
  const cancelledUpcoming = series.events.filter(e => e.status === "cancelled" && e.startAt > now).sort(byStart).slice(0, 3);
  const renderCancelled = (e: (typeof series.events)[number]) => (
    <div key={e.id} className="flex items-center gap-3 rounded-card border border-dashed border-red-800/40 bg-surface px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted line-through truncate">{termLabel(series.scheduleMode, e) ?? e.title}</p>
        <p className="text-xs text-subtle">{formatBerlinDateTime(e.startAt, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-danger bg-danger-soft border border-red-800/40 rounded-full px-2 py-0.5">Fällt aus</span>
    </div>
  );

  // Kacheln wie auf /events (EventCard, Zeilen-Variante) — eigene Abfrage mit den Kachel-Relationen
  const [cardSources, viewer] = await Promise.all([
    prisma.event.findMany({
      where: { id: { in: [...upcomingEventIds, ...pastEventIds] } },
      include: { ...EVENT_CARD_INCLUDE, streamingPartners: { include: { partner: { select: { id: true, name: true, twitchLogin: true, logoUrl: true } } } } },
    }),
    loadEventViewerContext(userId),
  ]);
  const sourceById = new Map(cardSources.map(e => [e.id, e]));
  const commentCounts = await getCommentCounts(
    userId ?? null,
    cardSources.map(e => e.id),
    new Set(cardSources.filter(e => e.registrations.some(r => r.userId === userId)).map(e => e.id)),
  );
  const seriesIsOriginal = isOmaOriginalSeries(series);
  const renderSeriesCard = (eventId: string) => {
    const ev = sourceById.get(eventId);
    if (!ev) return null;
    const card = toEventCardData(ev, viewer, userId, now);
    card.comments = commentCounts.get(ev.id) ?? null;
    // Auf der Reihenseite sind Reihe und Original-Siegel schon im Kopf — nicht auf jeder Kachel wiederholen
    card.series = null;
    if (seriesIsOriginal) card.omaOriginal = false;
    return (
      <EventCard key={ev.id} ev={card} variant="row"
        extra={<SeriesEventExtras partners={ev.streamingPartners} bonus={eventPayout(ev).placements} />}
        actions={<EventCardActions ev={ev} card={card} viewer={viewer} userId={userId} />} />
    );
  };

  // ── Punktesystem ──────────────────────────────────────────────────────────
  const punkteItems: { emoji: string; label: string; pts: string; who: string }[] = [];
  if (statCfg.participationPoints > 0) {
    punkteItems.push({ emoji: "🎮", label: "Teilnahme", pts: `+${statCfg.participationPoints}`, who: "Alle Teilnehmer" });
  }
  for (const s of statCfg.stats) {
    punkteItems.push({ emoji: "📊", label: s.field, pts: `×${s.pointsPer}`, who: "Pro Einheit" });
  }
  if (statCfg.mvpStatField) {
    punkteItems.push({ emoji: "⭐", label: "MVP", pts: "+1", who: `→ ${statCfg.mvpStatField}` });
  }
  if (statCfg.defaultWinnerTargetField) {
    punkteItems.push({ emoji: "🏆", label: "Event-Sieger", pts: "+1", who: `→ ${statCfg.defaultWinnerTargetField}` });
  }
  for (const p of pollConfigs) {
    if (p.participationSeriesPoints > 0) {
      punkteItems.push({ emoji: "🗳️", label: `${p.label} — Teilnahme`, pts: `+${p.participationSeriesPoints}`, who: "Bei Abstimmung" });
    }
    if (p.winnerRankPoints > 0) {
      punkteItems.push({ emoji: "👑", label: `${p.label} — Sieg`, pts: `+${p.winnerRankPoints}`, who: "Gewinner der Umfrage" });
    }
  }
  if (statCfg.dominionBonus?.enabled && statCfg.dominionBonus.seriesPoints > 0) {
    punkteItems.push({
      emoji: "⚡",
      label: "Dominion Bonus",
      pts: `+${statCfg.dominionBonus.seriesPoints}`,
      who: `${statCfg.dominionBonus.threshold}× in Folge`,
    });
  }
  // Münzen: was es nach JEDEM Termin gibt vs. was erst die Endwertung der Reihe bringt
  const coinList = (list: { place: number; coins: number; rankPoints?: number }[]) =>
    list.map(p => `${p.place}. ${p.coins.toLocaleString("de-DE")}${p.rankPoints ? ` +${p.rankPoints} RP` : ""}`).join(" · ");
  // Dieselbe Quelle wie die Auszahlung (lib/placement-rewards.ts): Reihentabelle bzw. Reihen-Belohnungen
  const seriesPayout = eventPayout({ seriesId: series.id, placementRewardsJson: null, series });
  const bonusPerEvent = seriesPayout.placements;
  if (bonusPerEvent.length > 0) {
    punkteItems.push({ emoji: "🪙", label: "Platzierungs-Bonus je Event", pts: coinList(bonusPerEvent), who: "Münzen direkt nach jedem Termin" });
  }
  const seriesFinalRewards = (seriesPayout.seriesFinal ?? []).sort((a, b) => a.place - b.place);
  if (seriesFinalRewards.length > 0) {
    punkteItems.push({ emoji: "🏁", label: "Endwertung der Reihe", pts: coinList(seriesFinalRewards), who: "Münzen zum Abschluss der Reihe" });
  }

  const totalParticipantIds = new Set(series.events.flatMap(e => e.registrations.map(r => r.userId)));

  // ── Saisons der Gruppe ─────────────────────────────────────────────────────
  // Grundlage für All-Time-Tabelle, Saison-Umschalter, Archiv und Titelverteidiger-Abzeichen
  const groupSeasons = series.groupId
    ? await prisma.eventSeries.findMany({
        where: { groupId: series.groupId },
        select: {
          id: true, name: true, status: true, seasonNumber: true, archivedAt: true, createdAt: true,
          seriesStatConfig: true, legacyStandings: true, seriesCompletionData: true,
          events: {
            orderBy: { startAt: "asc" },
            select: {
              id: true, status: true, startAt: true, completionData: true, finalRankingJson: true, spectatorMode: true, goalStateJson: true,
              registrations: { select: { userId: true, role: true } },
              matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
            },
          },
        },
        orderBy: [{ seasonNumber: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
      })
    : [];
  const placementsBySeason = new Map(groupSeasons.map(g => [
    g.id, g.status === "archived" ? seasonPlacements(parseSeriesCompletion(g.seriesCompletionData)) : null,
  ]));

  // ── All-Time Leaderboard (erst ab zwei Saisons — vorher wäre es die normale Tabelle) ──
  const showAllTime = groupSeasons.length >= 2;
  const statAliases = parseStatAliases(series.statAliasesJson);
  let allTimeStandings: (typeof standings) = [];
  let allTimeUsers: typeof standingUsers = [];
  let allTimeHasSpectatorTracking = false;
  let allTimeStatCols: StatConfig["stats"] = [];
  let allTimeExtraCols: string[] = [];
  if (showAllTime) {
    // Jede Saison mit ihrer EIGENEN Konfiguration (bzw. ihrer gespeicherten Endtabelle) — erst danach
    // zusammengezählt. Spalten: alle Stat-Felder, die in irgendeiner Saison konfiguriert waren
    // (umbenannte Felder über die Stat-Aliase der Reihe zusammengeführt).
    const colsByField = new Map<string, { field: string; pointsPer: number }>();
    for (const g of groupSeasons) {
      const cfg = g.id === id ? statCfg : parseStatConfig(g.seriesStatConfig);
      for (const st of cfg.stats) {
        const field = resolveStatAlias(st.field, statAliases);
        if (!colsByField.has(field) || g.id === id) colsByField.set(field, { field, pointsPer: st.pointsPer });
      }
    }
    allTimeStandings = buildAllTimeStandings(
      groupSeasons.map(g => ({ rows: g.id === id ? standings : seasonStandings(g), placements: placementsBySeason.get(g.id) ?? null })),
      statAliases,
      latestStatFields(statCfg),
    );
    allTimeStatCols = [...colsByField.values()];
    const statColFields = new Set(allTimeStatCols.map(c => c.field));
    const hiddenAllTimeFields = new Set(["Dominion Bonus Punkte", ...(statCfg.winnerStatKeys ?? [])]);
    const seenFields = [...new Set(allTimeStandings.flatMap(r => Object.keys(r.stats)))]
      .filter(fld => !ALL_TIME_COLS.includes(fld) && !statColFields.has(fld) && !reservedFields.has(fld)
        && !isInternalField(fld) && !hiddenAllTimeFields.has(fld)
        && allTimeStandings.some(r => (r.stats[fld] ?? 0) > 0))
      .sort((x, y) => x.localeCompare(y, "de"));
    allTimeExtraCols = [...ALL_TIME_COLS, ...seenFields];
    allTimeHasSpectatorTracking = groupSeasons.some(g => g.events.some(e => e.spectatorMode));
    const allTimeIds = allTimeStandings.map(r => r.userId);
    allTimeUsers = allTimeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allTimeIds } },
          select: { id: true, name: true, username: true, image: true, rankPoints: true },
        })
      : [];
  }

  // ── Saison-Gruppe (verwandte Saisons) ─────────────────────────────────────
  const siblingSeasons = groupSeasons.filter(g => g.id !== id);
  const isArchived = series.status === "archived";
  const activeSibling = siblingSeasons.find(s => s.status === "active");

  // Vergangene Saisons inkl. Podium (Platz 1–3 aus dem Saison-Abschluss)
  const podiumIds = new Set<string>();
  for (const pl of placementsBySeason.values()) for (const [uid, place] of pl ?? []) if (place <= 3) podiumIds.add(uid);
  const podiumUsers = podiumIds.size > 0
    ? await prisma.user.findMany({ where: { id: { in: [...podiumIds] } }, select: { id: true, name: true, username: true, image: true } })
    : [];
  const archivedSeasons: ArchivedSeason[] = groupSeasons
    .filter(g => g.status === "archived")
    .map(g => ({
      id: g.id, name: g.name, seasonNumber: g.seasonNumber, archivedAt: g.archivedAt,
      firstEventAt: g.events[0]?.startAt ?? null, eventCount: g.events.length,
      podium: [...(placementsBySeason.get(g.id) ?? [])]
        .filter(([, place]) => place <= 3)
        .sort((x, y) => x[1] - y[1])
        .flatMap(([uid, place]) => {
          const u = podiumUsers.find(pu => pu.id === uid);
          return u ? [{ place, user: u }] : [];
        }),
    }))
    .reverse();

  // Titelverteidiger: Platz 1–3 der direkten Vorsaison als Abzeichen in der Tabelle der aktiven Saison
  const previousSeason = isArchived ? null : [...siblingSeasons]
    .filter(g => g.status === "archived" && (g.seasonNumber ?? 1) < (series.seasonNumber ?? Number.MAX_SAFE_INTEGER))
    .sort((x, y) => (y.seasonNumber ?? 1) - (x.seasonNumber ?? 1))[0] ?? null;
  const standingBadges = previousSeason ? previousSeasonBadges(placementsBySeason.get(previousSeason.id) ?? new Map()) : {};


  // Parse overall winner for current archived series
  type CompletionSummary = {
    overallWinnerIds?: string[] | null;
    pollWinnerIds?: string[] | null;
    pollLabel?: string | null;
    pollPhaseComplete?: boolean;
  };
  const seriesCompletion: CompletionSummary = (() => {
    try { return series.seriesCompletionData ? JSON.parse(series.seriesCompletionData as string) : {}; } catch { return {}; }
  })();
  const overallWinnerIds = seriesCompletion.overallWinnerIds ?? [];
  const overallWinners = overallWinnerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: overallWinnerIds } },
        select: { id: true, name: true, username: true, image: true, rankPoints: true },
      })
    : [];

  // Eventreihen-Pokal: nur hier auf der Reihen-Seite, nie auf der Seite eines
  // einzelnen Events der Reihe (dort nur Pokale für Standalone-Events). Nur Turnier-Reihen
  // haben einen Gewinner — Community-Reihen bekommen keinen Pokal. EventSeries hat kein
  // eigenes "type"-Feld, die Reihe wird im Wizard aber einheitlich angelegt, daher reicht
  // der Typ des ersten Events.
  const isTournamentSeries = series.events[0]?.type === "tournament";
  const seriesPokale = isTournamentSeries
    ? await prisma.pokal.findMany({
        where: { seriesId: series.id, isSeries: true },
        include: { user: { select: { name: true, username: true } } },
      })
    : [];

  // ── Kopf: nächster Termin ─────────────────────────────────────────────────
  const nextEventId = (activeEvents.find(e => e.status === "active") ?? openEvents[0])?.id ?? null;
  const nextSource = nextEventId ? sourceById.get(nextEventId) ?? null : null;
  const nextCard = nextSource ? toEventCardData(nextSource, viewer, userId, now) : null;
  const nextStartsIn = nextSource ? startsInLabel(nextSource.startAt, now) : null;

  // ── Saison-Verlauf ────────────────────────────────────────────────────────
  const gamePhaseDoneIds = new Set(gamePhaseCompleteEvents.map(e => e.id));
  // Abgesagte Termine sind ausgeblendet, stehen im Verlauf aber als "fällt aus"
  const timelineSource = [...series.events].filter(e => !e.hidden || e.status === "cancelled").sort(byStart);
  const timelineStateList = timelineStates(timelineSource.map(e => ({ status: e.status, gamePhaseDone: gamePhaseDoneIds.has(e.id) })));
  const timelineEvents: TimelineEvent[] = timelineSource.map((e, i) => {
    const state = timelineStateList[i];
    const winnerId = state === "done" && eventHasPlacement(e) ? parseRanking(e.finalRankingJson)[0] : undefined;
    const winner = winnerId ? e.registrations.find(r => r.userId === winnerId)?.user ?? null : null;
    return { id: e.id, title: termLabel(series.scheduleMode, e) ?? e.title, startAt: e.startAt, state, winner };
  });

  // ── Dein Stand ────────────────────────────────────────────────────────────
  const myRow = myRank > 0 ? standings[myRank - 1] : null;
  const myDelta = userId ? lastEventDelta[userId] : undefined;
  const myStanding: MyStanding | null = myRow ? {
    rank: myRank,
    points: myRow.totalPoints,
    participations: myRow.participations,
    total: standings.length,
    gapUp: myRank > 1 ? standings[myRank - 2].totalPoints - myRow.totalPoints : null,
    gapDown: myRank < standings.length ? myRow.totalPoints - standings[myRank].totalPoints : null,
    lastEvent: myDelta && gamePhaseCompleteEvents[0]
      ? { title: gamePhaseCompleteEvents[0].title, pointsDelta: myDelta.pointsDelta, rankDelta: myDelta.rankDelta, participated: myDelta.participated }
      : null,
  } : null;

  // ── Tabellen-Reiter ───────────────────────────────────────────────────────
  const userById = new Map(standingUsers.map(u => [u.id, u]));
  const podiumEntries: PodiumEntry[] = standings.slice(0, 3).flatMap(r => {
    const u = userById.get(r.userId);
    if (!u) return [];
    const name = u.username ?? u.name ?? "?";
    return [{
      id: u.id, name, image: u.image, isMe: u.id === userId,
      href: u.id === userId ? "/profile" : `/profile/${u.id}`,
      value: showPoints ? `${r.totalPoints.toLocaleString("de-DE")} Punkte` : `${r.participations} ${r.participations === 1 ? "Teilnahme" : "Teilnahmen"}`,
    }];
  });
  const seasonTable = (
    <div className="space-y-3">
      {podiumEntries.length === 3 && (
        <Podium entries={podiumEntries} size="md" className="rounded-card border border-line bg-surface shadow-card px-3 pt-6 sm:px-6" />
      )}
      {hasDelta && gamePhaseCompleteEvents[0] && (
        <p className="flex items-center gap-1 text-xs font-semibold text-success">
          <TrendingUp className="size-3.5" /> Veränderung nach {gamePhaseCompleteEvents[0].title}
        </p>
      )}
      <SeriesStandingsTable
        rows={standings}
        users={standingUsers}
        statCols={statCfg.stats}
        extraCols={extraCols}
        currentUserId={userId}
        showPoints={showPoints}
        lastEventDelta={hasDelta ? lastEventDelta : undefined}
        lastEventTitle={gamePhaseCompleteEvents[0]?.title}
        participationPoints={statCfg.participationPoints}
        dominionStreaks={dominionStreaks}
        dominionThreshold={statCfg.dominionBonus?.threshold}
        fallbackStatField={fallbackStatField}
        badges={isArchived ? undefined : standingBadges}
        mode="compact"
      />
      {standings.length === 0 && (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {isArchived ? "Keine Ergebnisse" : "Noch keine Ergebnisse"}
        </div>
      )}
      {standings.length > 0 && (
        <FullStandingsToggle
          rows={standings}
          users={standingUsers}
          statCols={statCfg.stats}
          extraCols={fullExtraCols}
          currentUserId={userId}
          showPoints={showPoints}
          lastEventDelta={hasDelta ? lastEventDelta : undefined}
          lastEventTitle={gamePhaseCompleteEvents[0]?.title}
          participationPoints={statCfg.participationPoints}
          hasSpectatorTracking={hasSpectatorTracking}
          dominionStreaks={dominionStreaks}
          dominionThreshold={statCfg.dominionBonus?.threshold}
          badges={standingBadges}
        />
      )}
    </div>
  );
  const tableTabs = [
    { key: "saison", label: isArchived ? "Endstand" : "Saison", panel: seasonTable },
    ...(showAllTime ? [{
      key: "all-time",
      label: <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> All-Time</span>,
      panel: (
        <div id="all-time" className="space-y-2 scroll-mt-24">
          <p className="text-xs text-subtle">{groupSeasons.length} Saisons zusammengezählt · Ø Platz aus den abgeschlossenen Saisons</p>
          <FullStandingsToggle
            rows={allTimeStandings}
            users={allTimeUsers}
            statCols={allTimeStatCols}
            extraCols={allTimeExtraCols}
            currentUserId={userId}
            showPoints={showPoints}
            hasSpectatorTracking={allTimeHasSpectatorTracking}
            defaultExpanded
          />
        </div>
      ),
    }] : []),
    ...(archivedSeasons.length > 0 ? [{
      key: "archiv",
      label: "Archiv",
      panel: <SaisonArchiv currentId={id} archivedSeasons={archivedSeasons} />,
    }] : []),
  ];

  const participantCount = totalParticipantIds.size;

  const scoringInfo = punkteItems.length > 0 ? (
    <>
      <p>So sammelst du Tabellenpunkte für diese Eventreihe. Wer am Ende der Saison vorn liegt, bekommt die Belohnung der Reihe.</p>
      <div className="flex flex-wrap gap-1.5">
        {punkteItems.map((p, i) => (
          <span key={i} className="flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3" title={p.who}>
            <span className="text-sm">{p.emoji}</span>
            <span className="text-xs font-semibold text-fg">{p.label}</span>
            <span className="text-xs font-extrabold text-primary-fg">{p.pts}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-muted">Tabellenpunkte gelten nur für diese Reihe. Rang-Punkte für die Rangliste gibt es zusätzlich für gute Platzierungen.</p>
    </>
  ) : null;

  // Belohnungen im Kopf: Endwertung der Reihe (zum Abschluss) + Bonus je Termin (direkt nach jedem Event)
  const finalTop = (seriesPayout.seriesFinal ?? []).slice().sort((a, b) => a.place - b.place).slice(0, 3);
  const rewardsBlock = (finalTop.length > 0 || seriesPayout.placements.length > 0) ? (
    <div className="rounded-control border border-coin/30 bg-coin-soft px-3 py-2.5 space-y-2">
      {finalTop.length > 0 && (
        <div>
          <p className="text-xs font-bold text-coin">Belohnung der Eventreihe <span className="font-semibold text-muted">· zum Abschluss</span></p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {finalTop.map(r => (
              <span key={r.place} className="flex items-center gap-1 text-sm font-semibold text-fg tabular-nums">
                <PlaceMedal place={r.place} />
                {r.coins > 0 && <span className="flex items-center gap-0.5 text-coin"><CoinIcon size={13} />{r.coins.toLocaleString("de-DE")}</span>}
                {r.rankPoints > 0 && <span className="flex items-center gap-0.5 text-primary-fg"><RankPointsIcon size={13} />{r.rankPoints}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {seriesPayout.placements.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>Bonus je Termin:</span>
          {seriesPayout.placements.slice(0, 3).map(p => (
            <span key={p.place} className="flex items-center gap-0.5 font-semibold text-coin tabular-nums">
              <PlaceMedal place={p.place} /><CoinIcon size={11} />{p.coins.toLocaleString("de-DE")}
            </span>
          ))}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className="px-5 pb-6 pt-0 sm:p-6 max-w-7xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">

      {/* ── Back ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/events" className={buttonClasses("ghost", "sm", "-ml-3")}>
          <ArrowLeft className="size-4" /> Alle Events
        </Link>
        {/* Aktive Saison-Link (wenn gerade auf archivierter Saison) */}
        {isArchived && activeSibling && (
          <Link href={`/events/series/${activeSibling.id}`}
            className={buttonClasses("secondary", "sm")}>
            <CheckCircle2 className="size-4 text-success" /> Zur aktuellen Saison
          </Link>
        )}
      </div>

      {/* ── Saison-Umschalter ─────────────────────────────────────────────────── */}
      <SeasonSwitcher
        currentId={id}
        seasons={groupSeasons.map(g => ({ id: g.id, name: g.name, seasonNumber: g.seasonNumber, status: g.status }))}
      />

      {/* ── Ausgeblendet-Banner (nur für Admins/Mods sichtbar) ────────────────── */}
      {series.hidden && isMod && (
        <div className="rounded-card px-4 py-3 flex items-center gap-3 border border-warning/40 bg-warning-soft">
          <EyeOff className="size-4 text-warning shrink-0" />
          <p className="text-sm text-fg">
            <span className="font-semibold">Ausgeblendet</span> — diese Reihe ist für normale Nutzer nicht sichtbar. Nur Admins/Mods können diese Seite über den Link aufrufen.
          </p>
        </div>
      )}

      {/* ── Kopf: Cover mit Name + nächster Termin (bzw. Gesamtsieger einer archivierten Saison) ── */}
      <section aria-label={series.name} className="rounded-card border border-line bg-surface shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        {/* Cover-Priorität: eigenes Reihen-Cover → Steam-Cover des fixen Spiels → Default. Events der Reihe
            ohne eigenes Cover erben dieses Cover auf ihrer eigenen Detailseite (tournament/[id]/page.tsx). */}
        <div className="relative aspect-[16/8] lg:aspect-auto lg:min-h-[240px] overflow-hidden">
          <GameCover
            game={series.fixedGame}
            coverUrl={series.coverImageUrl}
            className="absolute inset-0 w-full h-full"
            rounded="rounded-none"
            imgClassName="w-full h-full object-cover"
            brandBadge
            omaOriginal={seriesIsOriginal}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/50 to-transparent pointer-events-none" />
          <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: seriesColor }} />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: seriesColor }}>
              <SeriesIcon name={series.icon} className="w-3.5 h-3.5" />
              Eventreihe{series.seasonNumber ? ` · Saison ${series.seasonNumber}` : ""}
            </p>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight !text-fg leading-tight mt-1">
              {seriesIsOriginal && <OmaTitlePrefix title={series.name} />}
              {series.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {series.fixedGame && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-canvas/80 text-fg">
                  <Gamepad2 className="w-3 h-3" /> {series.fixedGame}
                </span>
              )}
              {series.fixedFormat && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-canvas/80 text-fg">
                  <Swords className="w-3 h-3" /> {FORMAT_LABELS[series.fixedFormat] ?? series.fixedFormat}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-canvas/80 text-fg tabular-nums">
                <Users className="w-3 h-3" /> {participantCount} {participantCount === 1 ? "Teilnehmer" : "Teilnehmende"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 sm:p-5 border-t lg:border-t-0 lg:border-l border-line">
          {isArchived ? (
            <>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-coin">
                <Archive className="size-4" /> Saison abgeschlossen
                {series.archivedAt && <span className="normal-case tracking-normal font-semibold text-muted">· {formatBerlinDate(series.archivedAt, { day: "2-digit", month: "long", year: "numeric" })}</span>}
              </p>
              {overallWinners.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Trophy className="size-6 text-coin shrink-0" />
                  <p className="text-lg font-extrabold text-fg">{overallWinners.map(u => u.username ?? u.name ?? "?").join(", ")}</p>
                </div>
              ) : (
                <p className="text-sm text-muted">Kein Gesamtsieger eingetragen.</p>
              )}
              {activeSibling && (
                <Link href={`/events/series/${activeSibling.id}`} className={buttonClasses("primary", "md", "mt-auto w-fit")}>
                  Zur aktuellen Saison
                </Link>
              )}
            </>
          ) : nextCard && nextSource ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-subtle">
                {nextCard.phase.phase === "live" || nextCard.phase.phase === "period" ? "Läuft gerade" : "Nächster Termin"}
              </p>
              <Link href={nextCard.href} className="text-lg font-extrabold text-fg leading-snug hover:text-primary-fg line-clamp-2">
                {nextCard.title}
              </Link>
              <p className="text-sm text-fg/90">
                {nextCard.date.top === "HEUTE" ? "Heute" : nextCard.date.top === "MORGEN" ? "Morgen" : `${nextCard.date.weekday.charAt(0)}${nextCard.date.weekday.slice(1).toLowerCase()} ${nextCard.date.day}.`}
                {" · "}{nextCard.date.time} Uhr
                {nextStartsIn && <span className="font-bold text-primary-fg"> · {nextStartsIn}</span>}
              </p>
              <p className="text-xs text-subtle">
                {nextCard.playerCount}{nextCard.maxPlayers ? `/${nextCard.maxPlayers}` : ""} dabei
                {nextCard.friendNames.length > 0 && <> · <span className="text-fg/90">{nextCard.friendNames.join(", ")}</span></>}
                {nextCard.urgency && <> · <span className="font-semibold text-warning">{nextCard.urgency}</span></>}
              </p>
              {rewardsBlock && <div className="pt-1">{rewardsBlock}</div>}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <EventCardActions ev={nextSource} card={nextCard} viewer={viewer} userId={userId} />
                <a href={`/api/events/${nextSource.id}/ics`} download
                  className={buttonClasses("secondary", "sm")}>
                  <CalendarPlus className="size-4" /> In den Kalender
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-subtle">Nächster Termin</p>
              <p className="text-sm text-muted">Gerade ist kein Termin geplant. Schau bald wieder vorbei.</p>
              {rewardsBlock && <div className="mt-auto pt-2">{rewardsBlock}</div>}
            </>
          )}
        </div>

        {series.description && (
          <p className="lg:col-span-2 px-4 sm:px-5 py-3 border-t border-line text-sm text-fg/90 leading-relaxed whitespace-pre-line">{series.description}</p>
        )}
      </section>

      {/* ── Dein Stand am Handy direkt unter dem Kopf ── */}
      <div className="lg:hidden">
        <MyStandingCard me={myStanding} loggedIn={!!userId} pointsLabel={showPoints ? "Punkte" : "Teilnahmen"} />
      </div>

      {/* ── Sprungleiste ── */}
      <EventJumpBar links={[
        ...(activePollGroups.length > 0 ? [{ target: "umfrage", label: "Umfrage", badge: { text: "läuft", tone: "alert" as const } }] : []),
        { target: "tabelle", label: "Tabelle", badge: standings.length > 0 ? { text: String(standings.length), tone: "count" as const } : undefined },
        ...(!isArchived ? [{ target: "termine", label: "Termine", badge: upcomingEventIds.length > 0 ? { text: String(upcomingEventIds.length), tone: "count" as const } : undefined }] : []),
        ...(series.rules || (isTournamentSeries && seriesPokale.length === 0 && !isArchived) ? [{ target: "regeln", label: "Regeln" }] : []),
      ]} />

      {/* ── Umfragen (nur die aktuell aktive) — direkt hier abstimmbar ───────── */}
      {activePollGroups.length > 0 && (
        <div id="umfrage" className="space-y-3 scroll-mt-36">
          {activePollGroups.map(group => (
            <div key={group.eventId} className="rounded-card border border-line bg-surface shadow-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-subtle uppercase tracking-wide">{group.eventTitle}</span>
                <Link href={`/tournament/${group.eventId}`} className="text-xs font-semibold text-primary-fg hover:text-fg transition-colors">
                  Zum Event →
                </Link>
              </div>
              <PollsSection
                eventId={group.eventId}
                userId={userId}
                initialPolls={group.polls}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Saison-Verlauf ────────────────────────────────────────────────────── */}
      <SeasonTimeline events={timelineEvents} />

      {/* ── Eventreihen-Pokal (vergeben) ──────────────────────────────────────── */}
      {seriesPokale.length > 0 && (
        <EventPokalWinners pokale={seriesPokale} label="Eventreihen-Pokal" />
      )}

      {/* ── Tabelle (Reiter) | Dein Stand + Termine ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <section id="tabelle" aria-label="Tabelle" className="lg:col-span-3 space-y-3 min-w-0 scroll-mt-36">
          <StandingsHeader info={scoringInfo} />
          <SectionTabs ariaLabel="Tabelle" tabs={tableTabs} />
        </section>

        <div className="lg:col-span-2 space-y-5 min-w-0">
          <div className="hidden lg:block">
            <MyStandingCard me={myStanding} loggedIn={!!userId} pointsLabel={showPoints ? "Punkte" : "Teilnahmen"} />
          </div>
          {!isArchived && (
            <div id="termine" className="scroll-mt-36">
            <SeriesEventList
              upcoming={[...upcomingEventIds.map(renderSeriesCard), ...cancelledUpcoming.map(renderCancelled)]}
              past={pastEventIds.map(renderSeriesCard)}
            />
            </div>
          )}
        </div>
      </div>

      {/* ── So funktioniert's: Regeln, Punktesystem, Pokal ────────────────────── */}
      {(series.rules || (isTournamentSeries && seriesPokale.length === 0 && !isArchived)) && (
        <section id="regeln" aria-label="So funktioniert's" className="space-y-3 scroll-mt-36">
          <h2 className="text-base font-extrabold text-fg flex items-center gap-2">
            <Zap className="size-4 text-primary-fg" /> So funktioniert&apos;s
          </h2>
          <RulesSection rules={series.rules} preview={4} />
          {isTournamentSeries && seriesPokale.length === 0 && !isArchived && (
            <PokalPreview category={series.category} isSeries={true} />
          )}
        </section>
      )}

    </div>
  );
}
