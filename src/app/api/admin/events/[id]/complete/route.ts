import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendPushToUsers } from "@/lib/push";

type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };

const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};

function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}

type SeriesStatConfig = {
  participationPoints: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
};

type StandingsRaw = Record<string, Record<string, number>>;
type SeriesStandings = {
  lastUpdated: string;
  processedEventIds: string[];
  raw: StandingsRaw;
};

/**
 * POST /api/admin/events/[id]/complete
 *
 * Schließt ein Event ab:
 * - Setzt status → "finished" (nur beim ersten Abschluss)
 * - Speichert completionData am Event
 * - Vergabe von Teilnahme-Münzen + Platzierungs-Münzen/-Punkte (nur beim ersten Abschluss)
 * - Poll-Gewinner-Belohnung (auch beim Re-Edit, mit Rückbuchung)
 * - Aktualisiert seriesStandingsJson (falls Event in einer Reihe ist)
 * - Speichert finalRankingJson + finalRankingNote
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("moderator");
  const { id: eventId } = await params;

  const body = await req.json() as {
    mvpUserId?: string;
    winnerStatField?: string;
    seriesWinnerTargetField?: string;
    pollWinnerIds?: string[];
    pollLabel?: string;
    pollBonusCoins?: number;
    pollBonusRankPoints?: number;
    finalRanking?: string[];
    finalRankingGroups?: string[][];  // tied groups – if provided, used for point awards
    finalRankingNote?: string;
    participationCoins?: number;
    placements?: PlacementReward[];
  };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: { select: { userId: true } },
      series: true,
      matches: {
        include: {
          entries: { select: { userId: true, statsJson: true } },
        },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });

  const isReEdit = !!event.completionData;
  const oldCompletion: Record<string, unknown> = isReEdit
    ? (() => { try { return JSON.parse(event.completionData as string); } catch { return {}; } })()
    : {};

  // Per-User-Stats aus Match-Einträgen
  const userStats: Record<string, Record<string, number>> = {};
  for (const match of event.matches) {
    for (const entry of match.entries) {
      if (!entry.userId || !entry.statsJson) continue;
      let parsed: Record<string, number> = {};
      try { parsed = JSON.parse(entry.statsJson); } catch { continue; }
      if (!userStats[entry.userId]) userStats[entry.userId] = {};
      for (const [field, val] of Object.entries(parsed)) {
        userStats[entry.userId][field] = (userStats[entry.userId][field] ?? 0) + Number(val);
      }
    }
  }

  // Event-Gewinner (höchster Wert im winnerStatField — alle bei Gleichstand)
  let eventWinnerId: string | undefined;       // compat: erster Gewinner
  let eventWinnerIds: string[] = [];
  if (body.winnerStatField) {
    let maxVal = -Infinity;
    for (const [uid, stats] of Object.entries(userStats)) {
      const val = stats[body.winnerStatField] ?? 0;
      if (val > maxVal) { maxVal = val; eventWinnerId = uid; eventWinnerIds = [uid]; }
      else if (val === maxVal && maxVal > -Infinity) { eventWinnerIds.push(uid); }
    }
  }

  const registeredSet = new Set(event.registrations.map(r => r.userId));

  // ── Coin/RankPoint-Vergabe (nur beim ersten Abschluss) ──────────────────────
  if (!isReEdit) {
    const rewards: RewardsConfig = {
      participationCoins: body.participationCoins ?? parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson).participationCoins,
      placements: body.placements ?? parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson).placements,
    };

    const participantIds = event.registrations.map(r => r.userId);

    // Teilnahme-Münzen für alle Registrierten
    if (rewards.participationCoins > 0 && participantIds.length > 0) {
      await prisma.$transaction(
        participantIds.flatMap(userId => [
          prisma.user.update({
            where: { id: userId },
            data: { points: { increment: rewards.participationCoins } },
          }),
          prisma.pointTransaction.create({
            data: { userId, amount: rewards.participationCoins, reason: `[Münzen] Teilnahme: ${event.title}` },
          }),
        ])
      );
    }

    // Platzierungs-Münzen + Rang-Punkte (unterstützt Gleichstand via finalRankingGroups)
    if (body.finalRankingGroups?.length) {
      // Groups format: [[uid1, uid2], [uid3], ...] where all in same group share placement
      let place = 1;
      for (const group of body.finalRankingGroups) {
        const reward = rewards.placements.find(p => p.place === place);
        if (reward) {
          for (const userId of group.filter(id => registeredSet.has(id))) {
            const txns: Prisma.PrismaPromise<unknown>[] = [];
            if (reward.coins > 0) {
              txns.push(
                prisma.user.update({ where: { id: userId }, data: { points: { increment: reward.coins } } }),
                prisma.pointTransaction.create({ data: { userId, amount: reward.coins, reason: `[Münzen] Platz ${place}: ${event.title}` } })
              );
            }
            if (reward.rankPoints > 0) {
              txns.push(
                prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: reward.rankPoints } } }),
                prisma.pointTransaction.create({ data: { userId, amount: reward.rankPoints, reason: `[Rang-Punkte] Platz ${place}: ${event.title}` } })
              );
            }
            if (txns.length > 0) await prisma.$transaction(txns);
          }
        }
        place += group.length; // standard competition ranking: skip positions for the size of this group
      }
    } else {
      // Legacy flat format
      const ranking = (body.finalRanking ?? []).filter(id => registeredSet.has(id));
      for (let i = 0; i < ranking.length; i++) {
        const place = i + 1;
        const reward = rewards.placements.find(p => p.place === place);
        if (!reward) continue;
        const userId = ranking[i];
        const txns: Prisma.PrismaPromise<unknown>[] = [];
        if (reward.coins > 0) {
          txns.push(
            prisma.user.update({ where: { id: userId }, data: { points: { increment: reward.coins } } }),
            prisma.pointTransaction.create({ data: { userId, amount: reward.coins, reason: `[Münzen] Platz ${place}: ${event.title}` } })
          );
        }
        if (reward.rankPoints > 0) {
          txns.push(
            prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: reward.rankPoints } } }),
            prisma.pointTransaction.create({ data: { userId, amount: reward.rankPoints, reason: `[Rang-Punkte] Platz ${place}: ${event.title}` } })
          );
        }
        if (txns.length > 0) await prisma.$transaction(txns);
      }
    }
  }

  // ── Poll-Belohnungen (auch beim Re-Edit, mit Rückbuchung) ───────────────────
  // Alte Poll-Gewinner rückbuchen
  if (isReEdit) {
    const oldWinners: string[] = (oldCompletion.pollWinnerIds as string[] | undefined) ??
      (oldCompletion.pollWinnerId ? [oldCompletion.pollWinnerId as string] : []);
    const oldCoins = (oldCompletion.pollBonusCoins as number | undefined) ?? 0;
    const oldRankPts = (oldCompletion.pollBonusRankPoints as number | undefined) ?? 0;

    for (const userId of oldWinners) {
      const txns: Prisma.PrismaPromise<unknown>[] = [];
      if (oldCoins > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { points: { increment: -oldCoins } } }),
          prisma.pointTransaction.create({ data: { userId, amount: -oldCoins, reason: `[Korrektur] Poll-Gewinner: ${event.title}` } })
        );
      }
      if (oldRankPts > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: -oldRankPts } } }),
          prisma.pointTransaction.create({ data: { userId, amount: -oldRankPts, reason: `[Korrektur] Poll-Rang-Punkte: ${event.title}` } })
        );
      }
      if (txns.length > 0) await prisma.$transaction(txns);
    }
  }

  // Neue Poll-Gewinner vergeben
  const newPollWinners = (body.pollWinnerIds ?? []).filter(id => registeredSet.has(id));
  const pollCoins = body.pollBonusCoins ?? 0;
  const pollRankPts = body.pollBonusRankPoints ?? 0;

  for (const userId of newPollWinners) {
    const txns: Prisma.PrismaPromise<unknown>[] = [];
    if (pollCoins > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { points: { increment: pollCoins } } }),
        prisma.pointTransaction.create({ data: { userId, amount: pollCoins, reason: `[Münzen] Poll-Sieger: ${event.title}` } })
      );
    }
    if (pollRankPts > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: pollRankPts } } }),
        prisma.pointTransaction.create({ data: { userId, amount: pollRankPts, reason: `[Rang-Punkte] Poll-Sieger: ${event.title}` } })
      );
    }
    if (txns.length > 0) await prisma.$transaction(txns);
  }

  // ── Series-Standings (optional, nur wenn Event in einer Reihe ist) ──────────
  let updatedStandings: SeriesStandings | null = null;

  if (event.series) {
    const statCfg: SeriesStatConfig = (() => {
      try { return event.series!.seriesStatConfig ? JSON.parse(event.series!.seriesStatConfig) : {}; }
      catch { return {} as SeriesStatConfig; }
    })();

    const existingJson: SeriesStandings = (() => {
      try {
        return event.series!.seriesStandingsJson
          ? JSON.parse(event.series!.seriesStandingsJson)
          : { lastUpdated: "", processedEventIds: [], raw: {} };
      } catch { return { lastUpdated: "", processedEventIds: [], raw: {} }; }
    })();

    const raw = existingJson.raw as StandingsRaw;

    function addToUser(userId: string, field: string, value: number) {
      if (!raw[userId]) raw[userId] = {};
      raw[userId][field] = (raw[userId][field] ?? 0) + value;
    }

    if (!isReEdit) {
      for (const { userId } of event.registrations) {
        addToUser(userId, "participations", 1);
        const eStats = userStats[userId] ?? {};
        for (const { field } of (statCfg.stats ?? [])) {
          const val = eStats[field] ?? 0;
          if (val > 0) addToUser(userId, field, val);
        }
      }
      if (eventWinnerIds.length > 0 && body.seriesWinnerTargetField) {
        for (const uid of eventWinnerIds) addToUser(uid, body.seriesWinnerTargetField, 1);
      }
    }

    // MVP: alten Eintrag rückgängig, neuen setzen
    if (isReEdit && oldCompletion.mvpUserId && statCfg.mvpStatField) {
      addToUser(oldCompletion.mvpUserId as string, statCfg.mvpStatField, -1);
    }
    if (body.mvpUserId && statCfg.mvpStatField) {
      addToUser(body.mvpUserId, statCfg.mvpStatField, 1);
    }

    // Event-Gewinner (seriesWinnerTargetField): alten Eintrag rückgängig, neuen setzen
    if (isReEdit && body.seriesWinnerTargetField) {
      const oldWinnerIds: string[] = (oldCompletion.eventWinnerIds as string[] | undefined) ??
        (oldCompletion.eventWinnerId ? [oldCompletion.eventWinnerId as string] : []);
      for (const uid of oldWinnerIds) addToUser(uid, body.seriesWinnerTargetField, -1);
    }
    if (isReEdit && eventWinnerIds.length > 0 && body.seriesWinnerTargetField) {
      for (const uid of eventWinnerIds) addToUser(uid, body.seriesWinnerTargetField, 1);
    }

    updatedStandings = {
      lastUpdated: new Date().toISOString(),
      processedEventIds: existingJson.processedEventIds.includes(eventId)
        ? existingJson.processedEventIds
        : [...existingJson.processedEventIds, eventId],
      raw,
    };
  }

  // ── Completion-Daten speichern ───────────────────────────────────────────────
  const completionData = {
    mvpUserId:               body.mvpUserId ?? null,
    winnerStatField:         body.winnerStatField ?? null,
    seriesWinnerTargetField: body.seriesWinnerTargetField ?? null,
    eventWinnerId:           eventWinnerId ?? null,
    eventWinnerIds:          eventWinnerIds.length > 0 ? eventWinnerIds : null,
    pollWinnerIds:           newPollWinners.length > 0 ? newPollWinners : null,
    pollLabel:               body.pollLabel ?? null,
    pollBonusCoins:          pollCoins > 0 ? pollCoins : null,
    pollBonusRankPoints:     pollRankPts > 0 ? pollRankPts : null,
    finalRanking:            body.finalRanking ?? null,
    finalRankingGroups:      body.finalRankingGroups ?? null,
    gamePhaseComplete:       true,
    pollPhaseComplete:       newPollWinners.length > 0,
    lockedAt:                new Date().toISOString(),
  };

  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: {
        ...(!isReEdit && { status: "finished" }),
        ...(body.finalRankingGroups !== undefined && {
          finalRankingJson: body.finalRankingGroups.length > 0 ? JSON.stringify(body.finalRankingGroups.flat()) : null,
        }),
        ...(body.finalRankingGroups === undefined && body.finalRanking !== undefined && {
          finalRankingJson: body.finalRanking.length > 0 ? JSON.stringify(body.finalRanking) : null,
        }),
        ...(body.finalRankingNote !== undefined && { finalRankingNote: body.finalRankingNote?.trim() || null }),
        completionData: JSON.stringify(completionData),
      },
    }),
    ...(event.series && updatedStandings
      ? [prisma.eventSeries.update({
          where: { id: event.seriesId! },
          data: { seriesStandingsJson: JSON.stringify(updatedStandings) },
        })]
      : []),
  ]);

  // Push an alle Teilnehmer
  const participantIds = event.registrations.map(r => r.userId);
  sendPushToUsers(participantIds, {
    title: `✅ Event abgeschlossen: ${event.title}`,
    body:  "Schau dir deine Punkte und das Ergebnis an!",
    url:   "/events",
  }).catch(() => {});

  return NextResponse.json({ ok: true, completionData, eventWinnerId });
}
