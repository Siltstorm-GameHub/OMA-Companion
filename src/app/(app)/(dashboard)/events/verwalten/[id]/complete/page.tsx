import { requireEventManager, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventCompleteClient from "./EventCompleteClient";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { capParticipationCoins, capPlacements, capValue } from "@/lib/captain-reward-limits";
import { applyEventStatOverride, computeTurnierpunkte, hasEventPoints, resolveRankStatField, TURNIERPUNKTE_STAT } from "@/lib/series-event-points";
import { computeAvgTotals, resolveAvgDirection } from "@/lib/avg-stats";
import { eventHasPlacement } from "@/lib/event-placement";

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; participationRankPts?: number; placements: PlacementReward[] };
type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };
type MultiPollConfig = { label: string; question: string; coins: number; rankPoints: number; type: "player" | "spectator" };
type SeriesStatConfig = {
  participationPoints: number;
  participationCoins?: number;
  spectatorParticipationCoins?: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  eventPlacementCoins?: { place: number; coins: number }[];
  eventPlacementPoints?: { place: number; points: number }[];
  placementPoints?: Record<string, number>;
  matchWinStatKeys?: string[];
  dominionBonus?: {
    enabled: boolean;
    triggerStats?: string[];
    triggerStat?: string;
    threshold: number;
    coins: number;
    seriesPoints: number;
  };
};

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
const DEFAULT_POLL: PollConfig = { enabled: false, question: "MVP", coins: 250, rankPoints: 3 };

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
function parsePoll(json: string | null | undefined): PollConfig {
  if (!json) return DEFAULT_POLL;
  try { return { ...DEFAULT_POLL, ...JSON.parse(json) }; } catch { return DEFAULT_POLL; }
}

export default async function AdminEventCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await requireEventManager(id);

  const [event, allUsers, pendingSubmissions] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: {
          select: {
            id: true,
            name: true,
            icon: true,
            seriesStatConfig: true,
            placementRewardsJson: true,
            pollConfigJson: true,
            seriesStandingsJson: true,
          },
        },
        registrations: { select: { userId: true, role: true, checkedInAt: true } },
        participants: { select: { userId: true } },
        matches: {
          include: {
            entries: { select: { userId: true, statsJson: true } },
          },
        },
        polls: {
          where: { rewardsPaid: false },
          select: { label: true, endAt: true },
        },
      },
    }),
    // Nur die Angemeldeten (Spieler und Zuschauer) — früher kam hier die komplette Mitgliederliste mit
    prisma.user.findMany({
      where: { eventRegistrations: { some: { eventId: id } } },
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
    // Ungeprüfte Screenshot-/Ergebnis-Meldungen — Hinweis oben auf der Seite
    prisma.matchResultSubmission.count({ where: { match: { eventId: id }, status: "pending" } }),
  ]);

  if (!event) notFound();

  // Spiele ohne Ergebnis bzw. nur vorläufig (Spieler-Meldung, noch nicht bestätigt) — Hinweis oben
  const isByeMatch = (m: { winnerId: string | null; player1Id: string | null; player2Id: string | null }) =>
    !!m.winnerId && (!m.player1Id || !m.player2Id);
  // Zuschauer: wer war beim Event aktiv (Absprachen, Abstimmung, Tipp, Spielwahl, Stream)? Hilft beim
  // Entscheiden über die Anwesenheit (Zuschauer-Belohnung)
  const spectatorIdList = event.registrations.filter(r => r.role === "spectator").map(r => r.userId);
  const spectatorActivity: Record<string, string[]> = {};
  if (spectatorIdList.length) {
    const [comments, pollVotes, tips, ballots, streams] = await Promise.all([
      prisma.eventComment.findMany({ where: { eventId: id, userId: { in: spectatorIdList } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.eventPollVote.findMany({ where: { poll: { eventId: id }, voterId: { in: spectatorIdList } }, select: { voterId: true }, distinct: ["voterId"] }),
      prisma.eventWinnerPrediction.findMany({ where: { eventId: id, userId: { in: spectatorIdList } }, select: { userId: true } }),
      prisma.gameVoteBallot.findMany({ where: { vote: { eventId: id }, userId: { in: spectatorIdList } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.eventCommunityStreamer.findMany({ where: { eventId: id, userId: { in: spectatorIdList } }, select: { userId: true } }),
    ]);
    const add = (uid: string, label: string) => { (spectatorActivity[uid] ??= []).push(label); };
    comments.forEach(c => add(c.userId, "Absprachen"));
    pollVotes.forEach(v => add(v.voterId, "abgestimmt"));
    tips.forEach(t => add(t.userId, "getippt"));
    ballots.forEach(b => add(b.userId, "Spielwahl"));
    streams.forEach(s => add(s.userId, "gestreamt"));
  }

  // Sieger-Tipps: werden mit dem festgelegten Sieger ausgewertet bzw. bei Korrektur neu verteilt
  const predictionRows = await prisma.eventWinnerPrediction.findMany({ where: { eventId: id }, select: { wager: true, resolved: true } });
  const predictionInfo = predictionRows.length
    ? { count: predictionRows.length, pot: predictionRows.reduce((n, p) => n + p.wager, 0), resolved: predictionRows.some(p => p.resolved) }
    : null;

  const matchCheck = {
    open: event.matches.filter(m => !m.playedAt && !isByeMatch(m)
      && (m.entries.length > 0 || (!!m.player1Id && !!m.player2Id))).length,
    provisional: event.matches.filter(m => !!m.playedAt && !m.resultConfirmed).length,
  };

  // Separate players and spectators
  const playerIds    = new Set(event.registrations.filter(r => r.role !== "spectator").map(r => r.userId));
  const spectatorIds = new Set(event.registrations.filter(r => r.role === "spectator").map(r => r.userId));
  const registeredUsers = allUsers.filter(u => playerIds.has(u.id));
  const spectatorUsers  = allUsers.filter(u => spectatorIds.has(u.id));

  // Pre-compute userStats server-side to avoid sending raw match data to client
  const userStats: Record<string, Record<string, number>> = {};
  for (const match of event.matches) {
    for (const entry of match.entries) {
      if (!entry.userId || !entry.statsJson) continue;
      let parsed: Record<string, number> = {};
      try { parsed = JSON.parse(entry.statsJson); } catch { continue; }
      if (!userStats[entry.userId]) userStats[entry.userId] = {};
      for (const [field, val] of Object.entries(parsed)) {
        // Interne Felder ("_team" = "A"/"B") und Nicht-Zahlen überspringen — sonst entsteht NaN
        if (field.startsWith("_") || !Number.isFinite(Number(val))) continue;
        userStats[entry.userId][field] = (userStats[entry.userId][field] ?? 0) + Number(val);
      }
    }
  }

  // Tournament stat fields
  const tournamentStatFields: string[] = (() => {
    if (!event.statFields) return [];
    try { return JSON.parse(event.statFields) as string[]; } catch { return []; }
  })();

  // Für "Durchschnittswerte" (avg_stats): kombinierter Durchschnitt pro Runde über alle Stat-Felder
  // (nicht die Summe) je Spieler — Grundlage für die Gewinner-Ermittlung "höchster/niedrigster Ø".
  // Gleiche Regeln wie Turnierseite/Abschluss-Route, siehe avg-stats.ts (nur gespielte Runden,
  // nicht eingetragene Felder zählen nicht als 0).
  const userAvgScore: Record<string, number> = {};
  if (event.format === "avg_stats") {
    for (const [uid, t] of computeAvgTotals(event.matches, tournamentStatFields)) {
      if (t.combined !== null) userAvgScore[uid] = t.combined;
    }
  }
  // Vorbelegung "höchster/niedrigster Ø gewinnt" aus den Turnier-Einstellungen des Events
  const defaultAvgDirection = resolveAvgDirection(null, event.statConfigJson);

  // Reine Reihen-Konfiguration (KEIN applyEventStatOverride!) — wird 1:1 als seriesStatConfig-Prop an
  // den Client durchgereicht und bestimmt dort u.a. die Optionen im Dropdown "Sieg in Reihentabelle
  // tracken als …" (seriesStatFields in EventCompleteClient.tsx). Dort sollen ausschließlich die
  // seriesweiten Reihentabellen-Stats erscheinen — NIE die Event-eigenen Stat-Felder dieses einzelnen
  // Events (deren Sieger erkennt man dort schon an der Eventpunkte-basierten Platzierung).
  const rawSeriesStatConfig: SeriesStatConfig | null = (() => {
    try { return event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : null; } catch { return null; }
  })();

  // Mit der Event-eigenen statConfigJson zusammengeführte Konfiguration — ausschließlich für die
  // Eventpunkte-Berechnung (Sieger-Ermittlung dieses einzelnen Events), siehe computeTurnierpunkte.
  // NIE als seriesStatConfig-Prop verwenden (s.o.).
  const turnierpunkteCfg: SeriesStatConfig = applyEventStatOverride(
    rawSeriesStatConfig ?? { participationPoints: 0, stats: [] }, event.statConfigJson,
  );

  // Eventpunkte-Vorschau je User (Stats × Punkte-pro-Stat + Platzierungspunkte, siehe
  // computeTurnierpunkte) — als zusätzliche, auswählbare "Gewinner-Stat"-Option (winnerStatField),
  // damit bei coop_stats-Events der Sieger auch nach der berechneten Gesamtpunktzahl dieses Events
  // statt nach einem einzelnen rohen Stat-Feld bestimmt werden kann. KEINE Tabellenpunkte — die bleiben
  // ausschließlich Sache der Eventreihen-Einstellungen (Teilnahme, Sieger-Ziel-Feld, …); der so
  // ermittelte Sieger erhält seine Tabellenpunkte ganz normal über den bestehenden Weg. Direkt in
  // userStats injiziert, damit die bestehende Sortier-/Anzeige-Logik (userStats[uid]?.[winnerStatField])
  // sie ohne weitere Änderungen mitbenutzt.
  // Geben alle Stats 0 Punkte, wäre "Eventpunkte" für alle 0 (alle gleichauf) — dann nicht anbieten,
  // die Platzierung kommt direkt aus dem Sieger-Stat (z.B. "Erfolgreiche Schüsse").
  const hasTurnierpunkteOption = hasEventPoints(turnierpunkteCfg);
  if (hasTurnierpunkteOption) {
    const turnierpunkteByUser = computeTurnierpunkte(event.matches, turnierpunkteCfg, event.format ?? undefined);
    for (const uid of Object.keys(userStats)) {
      userStats[uid][TURNIERPUNKTE_STAT] = turnierpunkteByUser[uid] ?? 0;
    }
  }
  const winnerStatFieldOptions = hasTurnierpunkteOption ? [...tournamentStatFields, TURNIERPUNKTE_STAT] : tournamentStatFields;

  // Vorbelegung des Gewinner-Stats: Event-eigene Einstellung (Reiter "Reihe" im Event) → Sieger-
  // Ermittlung der Reihe (winnerStatField, Wizard/Reihen-Einstellungen) → Altfeld defaultWinnerStatField.
  // Vorher wurde nur das Altfeld gelesen, die Sieger-Ermittlung der Reihe kam beim Abschluss nie an.
  // Für den Gewinner-Stat-Kasten der Abschluss-Seite: woher die Vorbelegung stammt und welchen Stat
  // die Reihe vorsieht (Vergleich, falls beides auseinanderläuft — häufige Ursache falscher Platzierungen)
  const seriesCfgForWinner = rawSeriesStatConfig as { winnerStatField?: string; defaultWinnerStatField?: string } | null;
  const eventCfgForWinner = (() => {
    try { return event.seriesEventConfigJson ? JSON.parse(event.seriesEventConfigJson) as { winnerStatField?: string } : null; }
    catch { return null; }
  })();
  const seriesWinnerStatField = [seriesCfgForWinner?.winnerStatField, seriesCfgForWinner?.defaultWinnerStatField]
    .find((f): f is string => !!f && winnerStatFieldOptions.includes(f)) ?? null;
  const winnerStatSource: "event" | "series" | "auto" =
    eventCfgForWinner?.winnerStatField && winnerStatFieldOptions.includes(eventCfgForWinner.winnerStatField) ? "event"
      : seriesWinnerStatField ? "series" : "auto";

  const defaultWinnerStatField = (() => {
    const eventCfg = eventCfgForWinner;
    const seriesCfg = seriesCfgForWinner;
    const candidates = [eventCfg?.winnerStatField, seriesCfg?.winnerStatField, seriesCfg?.defaultWinnerStatField];
    return candidates.find((f): f is string => !!f && winnerStatFieldOptions.includes(f))
      // Keine gültige Voreinstellung (z.B. "Eventpunkte" ohne Eventpunkte, umbenanntes Feld): gleiche
      // Regel wie die Sortierung der Endtabelle auf der Eventseite — mit Eventpunkten nach diesen,
      // sonst nach dem passenden echten Stat (bzw. dem ersten Stat-Feld).
      ?? (hasTurnierpunkteOption
        ? TURNIERPUNKTE_STAT
        : resolveRankStatField(tournamentStatFields, event.seriesEventConfigJson, seriesCfg))
      ?? "";
  })();

  // Aktueller Dominion-Streak je registriertem User, VOR diesem Event — aus der Reihen-Rohtabelle
  // (seriesStandingsJson), damit Moderatoren beim Ausfüllen sehen, wer bereits auf eine Serie
  // aufbaut, statt es erst nach dem Speichern aus completionData.dominionChanges zu erfahren.
  const currentDominionStreaks: Record<string, number> = (() => {
    const cfg = rawSeriesStatConfig?.dominionBonus;
    const triggerStats = cfg?.triggerStats ?? (cfg?.triggerStat ? [cfg.triggerStat] : []);
    if (!cfg?.enabled || triggerStats.length === 0 || !event.series?.seriesStandingsJson) return {};
    const streakKey = `_streak_[${triggerStats.join(",")}]`;
    try {
      const standings = JSON.parse(event.series.seriesStandingsJson) as { raw?: Record<string, Record<string, number>> };
      const out: Record<string, number> = {};
      for (const [uid, row] of Object.entries(standings.raw ?? {})) {
        const val = row[streakKey] ?? 0;
        if (val > 0) out[uid] = val;
      }
      return out;
    } catch { return {}; }
  })();

  // Rewards: event-level overrides series, series overrides defaults
  const rewardsConfig = parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson);

  // Mitglieder: Beträge so anzeigen, wie der Server sie auszahlt — auf die Obergrenzen gekürzt
  // (gleiche Kappung wie /api/admin/events/[id]/complete)
  const isMod = hasMinRole(currentUser.role, "moderator");
  let rewardsCapped = false;
  if (!isMod) {
    const all = await getCommunityLimits();
    const L = event.seriesId ? all.seriesEvent : all.standalone;
    const capped = {
      participationCoins: capParticipationCoins(rewardsConfig.participationCoins, L),
      participationRankPts: capValue(rewardsConfig.participationRankPts ?? 0, L.participationRankPts),
      placements: capPlacements(rewardsConfig.placements, L),
    };
    rewardsCapped = JSON.stringify(capped) !== JSON.stringify({
      participationCoins: rewardsConfig.participationCoins,
      participationRankPts: rewardsConfig.participationRankPts ?? 0,
      placements: rewardsConfig.placements,
    });
    Object.assign(rewardsConfig, capped);
  }

  // Override participationCoins from legacy pointReward if no placementRewardsJson set
  if (!event.placementRewardsJson && !event.series?.placementRewardsJson && event.pointReward) {
    rewardsConfig.participationCoins = event.pointReward;
  }

  // Poll config: event-level overrides series (legacy)
  const pollConfig = parsePoll(event.pollConfigJson ?? event.series?.pollConfigJson);

  // Multi-poll configs
  const pollsConfig: MultiPollConfig[] = (() => {
    const src = event.pollsConfigJson;
    if (!src) return [];
    try {
      const parsed = JSON.parse(src);
      return Array.isArray(parsed) ? parsed as MultiPollConfig[] : [];
    } catch { return []; }
  })();

  // Spectator reward config
  const spectatorRewardJson: { coins: number; rankPoints: number } | null = (() => {
    if (!event.spectatorRewardJson) return null;
    try { return JSON.parse(event.spectatorRewardJson as string); } catch { return null; }
  })();

  // Completion data for re-edit
  const isReEdit = !!event.completionData;

  // Protokoll: Buchungen aus Abschluss, Korrekturen und Rückbuchungen dieses Events. PointTransaction hat
  // keinen Event-Bezug — die Gründe enden aber immer auf ": <Eventtitel>" (siehe complete/route.ts,
  // revert-event-completion.ts). Begrenzt auf die Angemeldeten und die letzten 200 Buchungen.
  const historyRows = isReEdit
    ? await prisma.pointTransaction.findMany({
        where: { userId: { in: event.registrations.map(r => r.userId) }, reason: { endsWith: `: ${event.title}` } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { createdAt: true, amount: true, reason: true, userId: true },
      })
    : [];
  const rewardHistory = historyRows.map(h => {
    const u = allUsers.find(x => x.id === h.userId);
    return { at: h.createdAt.toISOString(), name: u?.username ?? u?.name ?? "?", amount: h.amount, reason: h.reason.replace(`: ${event.title}`, "") };
  });
  const initialData: Record<string, unknown> | null = isReEdit
    ? (() => { try { return JSON.parse(event.completionData as string); } catch { return null; } })()
    : null;

  // Nur bei bestehendem Abschluss: nach "Abschluss zurücksetzen" ist completionData leer, eine alte
  // finalRankingJson darf dann nicht als (manuelle, gleichstandslose) Platzierung wieder auftauchen.
  const initialFinalRanking: string[] | null = (() => {
    if (!isReEdit || !event.finalRankingJson) return null;
    try { return JSON.parse(event.finalRankingJson); } catch { return null; }
  })();

  const initialRankingGroups: string[][] | null =
    (initialData?.finalRankingGroups as string[][] | undefined) ?? null;

  const pendingEventPolls = event.polls.map(p => ({ label: p.label, endAt: p.endAt.toISOString() }));

  return (
    <EventCompleteClient
      eventId={event.id}
      eventTitle={event.title}
      eventStartAt={event.startAt.toISOString()}
      eventEndAt={event.endAt?.toISOString() ?? null}
      seriesId={event.series?.id ?? null}
      seriesName={event.series?.name ?? null}
      seriesIcon={event.series?.icon ?? null}
      registeredUsers={registeredUsers}
      spectatorUsers={spectatorUsers}
      allUsers={allUsers}
      tournamentStatFields={tournamentStatFields}
      winnerStatFieldOptions={winnerStatFieldOptions}
      defaultWinnerStatField={defaultWinnerStatField}
      winnerStatSource={winnerStatSource}
      seriesWinnerStatField={seriesWinnerStatField}
      userStats={userStats}
      format={event.format}
      userAvgScore={userAvgScore}
      defaultAvgDirection={defaultAvgDirection}
      currentDominionStreaks={currentDominionStreaks}
      seriesStatConfig={rawSeriesStatConfig}
      rewardsConfig={rewardsConfig}
      hasPlacement={eventHasPlacement(event)}
      pollConfig={pollConfig}
      pollsConfig={pollsConfig}
      pendingEventPolls={pendingEventPolls}
      spectatorRewardJson={spectatorRewardJson}
      isAdmin={currentUser.role === "admin"}
      isMod={isMod}
      rewardHistory={rewardHistory}
      defaultAbsentIds={event.checkInEnabled && event.matches.length > 0
        ? event.registrations.filter(r => r.role !== "spectator" && !r.checkedInAt && !event.participants.some(p => p.userId === r.userId)).map(r => r.userId)
        : []}
      rewardsCapped={rewardsCapped}
      isReEdit={isReEdit}
      status={event.status}
      initialData={initialData}
      initialFinalRanking={initialFinalRanking}
      initialRankingGroups={initialRankingGroups}
      initialFinalRankingNote={event.finalRankingNote ?? null}
      pendingSubmissions={pendingSubmissions}
      matchCheck={matchCheck}
      predictionInfo={predictionInfo}
      spectatorActivity={spectatorActivity}
    />
  );
}
