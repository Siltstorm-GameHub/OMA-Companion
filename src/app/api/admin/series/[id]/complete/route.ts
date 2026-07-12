import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("moderator");
  const { id: seriesId } = await params;

  const body = await req.json() as {
    finalRanking?: string[];
    finalRankingGroups?: string[][];
    pollWinnerIds?: string[];
    pollLabel?: string;
    pollBonusCoins?: number;
    pollBonusRankPoints?: number;
    pollExcludedUserIds?: string[];
    startNewSeason?: boolean;
  };

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const isReEdit = series.status === "archived";
  const oldCompletion: Record<string, unknown> = (() => {
    try { return series.seriesCompletionData ? JSON.parse(series.seriesCompletionData) : {}; } catch { return {}; }
  })();

  // All participants = all users who registered for any event in this series
  const registrations = await prisma.eventRegistration.findMany({
    where: { event: { seriesId } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const participantSet = new Set(registrations.map(r => r.userId));

  // ── Poll: Rückbuchung alter Gewinner ────────────────────────────────────────
  if (isReEdit) {
    const oldWinners: string[] = (oldCompletion.pollWinnerIds as string[] | undefined) ?? [];
    const oldCoins   = (oldCompletion.pollBonusCoins as number | undefined) ?? 0;
    const oldRankPts = (oldCompletion.pollBonusRankPoints as number | undefined) ?? 0;
    for (const userId of oldWinners) {
      const txns: Prisma.PrismaPromise<unknown>[] = [];
      if (oldCoins > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { points: { increment: -oldCoins } } }),
          prisma.pointTransaction.create({ data: { userId, amount: -oldCoins, reason: `[Korrektur] Saison-Poll: ${series.name}` } })
        );
      }
      if (oldRankPts > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: -oldRankPts } } }),
          prisma.pointTransaction.create({ data: { userId, amount: -oldRankPts, reason: `[Korrektur] Saison-Poll Rang-Punkte: ${series.name}` } })
        );
      }
      if (txns.length > 0) await prisma.$transaction(txns);
    }
  }

  // ── Endplatzierung: Rückbuchung alter Belohnungen (bei Re-Edit) ─────────────
  if (isReEdit) {
    const oldPlacementRewards = (oldCompletion.placementRewards as Array<{ userId: string; coins: number; rankPoints: number }> | undefined) ?? [];
    for (const { userId, coins, rankPoints } of oldPlacementRewards) {
      const txns: Prisma.PrismaPromise<unknown>[] = [];
      if (coins > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { points: { increment: -coins } } }),
          prisma.pointTransaction.create({ data: { userId, amount: -coins, reason: `[Korrektur] Endplatzierung: ${series.name}` } })
        );
      }
      if (rankPoints > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: -rankPoints } } }),
          prisma.pointTransaction.create({ data: { userId, amount: -rankPoints, reason: `[Korrektur] Endplatzierung Rang-Punkte: ${series.name}` } })
        );
      }
      if (txns.length > 0) await prisma.$transaction(txns);
    }
  }

  // ── Endplatzierung: Belohnungen vergeben ("Belohnungen (Endplatzierung der Eventreihe)") ──────
  // Ersetzt die frühere Vergabe pro Einzel-Event: die konfigurierten Platz-Belohnungen gelten jetzt
  // für die finale Gesamtplatzierung der kompletten Eventreihe, vergeben bei deren Abschluss.
  const rewards = parseRewards(series.placementRewardsJson);
  const newPlacementRewards: Array<{ userId: string; place: number; coins: number; rankPoints: number }> = [];

  if (body.finalRankingGroups?.length) {
    let place = 1;
    for (const group of body.finalRankingGroups) {
      const reward = rewards.placements.find(p => p.place === place);
      if (reward) {
        for (const userId of group.filter(id => participantSet.has(id))) {
          const txns: Prisma.PrismaPromise<unknown>[] = [];
          if (reward.coins > 0) {
            txns.push(
              prisma.user.update({ where: { id: userId }, data: { points: { increment: reward.coins } } }),
              prisma.pointTransaction.create({ data: { userId, amount: reward.coins, reason: `[Münzen] Endplatzierung ${place}: ${series.name}` } })
            );
          }
          if (reward.rankPoints > 0) {
            txns.push(
              prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: reward.rankPoints } } }),
              prisma.pointTransaction.create({ data: { userId, amount: reward.rankPoints, reason: `[Rang-Punkte] Endplatzierung ${place}: ${series.name}` } })
            );
          }
          if (txns.length > 0) await prisma.$transaction(txns);
          newPlacementRewards.push({ userId, place, coins: reward.coins, rankPoints: reward.rankPoints });
        }
      }
      place += group.length;
    }
  } else {
    const ranking = (body.finalRanking ?? []).filter(id => participantSet.has(id));
    for (let i = 0; i < ranking.length; i++) {
      const place = i + 1;
      const reward = rewards.placements.find(p => p.place === place);
      if (!reward) continue;
      const userId = ranking[i];
      const txns: Prisma.PrismaPromise<unknown>[] = [];
      if (reward.coins > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { points: { increment: reward.coins } } }),
          prisma.pointTransaction.create({ data: { userId, amount: reward.coins, reason: `[Münzen] Endplatzierung ${place}: ${series.name}` } })
        );
      }
      if (reward.rankPoints > 0) {
        txns.push(
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: reward.rankPoints } } }),
          prisma.pointTransaction.create({ data: { userId, amount: reward.rankPoints, reason: `[Rang-Punkte] Endplatzierung ${place}: ${series.name}` } })
        );
      }
      if (txns.length > 0) await prisma.$transaction(txns);
      newPlacementRewards.push({ userId, place, coins: reward.coins, rankPoints: reward.rankPoints });
    }
  }

  // ── Poll: Neue Gewinner vergeben ─────────────────────────────────────────────
  const newPollWinners = (body.pollWinnerIds ?? []).filter(id => participantSet.has(id));
  const pollCoins   = body.pollBonusCoins ?? 0;
  const pollRankPts = body.pollBonusRankPoints ?? 0;
  for (const userId of newPollWinners) {
    const txns: Prisma.PrismaPromise<unknown>[] = [];
    if (pollCoins > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { points: { increment: pollCoins } } }),
        prisma.pointTransaction.create({ data: { userId, amount: pollCoins, reason: `[Münzen] Saison-Poll-Sieger: ${series.name}` } })
      );
    }
    if (pollRankPts > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: pollRankPts } } }),
        prisma.pointTransaction.create({ data: { userId, amount: pollRankPts, reason: `[Rang-Punkte] Saison-Poll-Sieger: ${series.name}` } })
      );
    }
    if (txns.length > 0) await prisma.$transaction(txns);
  }

  // ── seriesCompletionData zusammenbauen ───────────────────────────────────────
  const overallWinnerIds: string[] = body.finalRankingGroups?.[0]?.filter(id => participantSet.has(id)) ??
    (body.finalRanking?.[0] ? [body.finalRanking[0]] : []);

  const seriesCompletionData = {
    overallWinnerIds:    overallWinnerIds.length > 0 ? overallWinnerIds : null,
    finalRanking:        body.finalRanking ?? null,
    finalRankingGroups:  body.finalRankingGroups ?? null,
    pollWinnerIds:       newPollWinners.length > 0 ? newPollWinners : null,
    pollLabel:           body.pollLabel ?? null,
    pollBonusCoins:      pollCoins > 0 ? pollCoins : null,
    pollBonusRankPoints: pollRankPts > 0 ? pollRankPts : null,
    pollExcludedUserIds: body.pollExcludedUserIds?.length ? body.pollExcludedUserIds : null,
    pollPhaseComplete:   newPollWinners.length > 0,
    placementRewards:    newPlacementRewards.length > 0 ? newPlacementRewards : null,
    lockedAt:            new Date().toISOString(),
  };

  // ── Series archivieren ───────────────────────────────────────────────────────
  const groupId = series.groupId ?? randomUUID();

  await prisma.eventSeries.update({
    where: { id: seriesId },
    data: {
      status:               "archived",
      archivedAt:           new Date(),
      groupId,
      seasonNumber:         series.seasonNumber ?? 1,
      seriesCompletionData: JSON.stringify(seriesCompletionData),
    },
  });

  // Die neue Saison wird nicht mehr hier direkt angelegt, sondern über den
  // Saison-Setup-Assistenten unter /admin/series/[id]/new-season, wo der Admin
  // alle Einstellungen (inkl. Start-/Enddatum) vor dem Erstellen noch anpassen kann.

  return NextResponse.json({
    ok: true,
    startNewSeason: !isReEdit && !!body.startNewSeason,
    groupId,
    seasonNumber: (series.seasonNumber ?? 1) + 1,
  });
}
