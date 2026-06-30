import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

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
    newSeasonName?: string;
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

  // ── Neue Saison erstellen (optional) ─────────────────────────────────────────
  let newSeriesId: string | null = null;
  if (!isReEdit && body.startNewSeason && body.newSeasonName?.trim()) {
    const newSeason = await prisma.eventSeries.create({
      data: {
        name:                 body.newSeasonName.trim(),
        description:          series.description,
        fixedGame:            series.fixedGame,
        fixedFormat:          series.fixedFormat,
        discordChannelId:     series.discordChannelId,
        recurrenceType:       series.recurrenceType,
        recurrenceMonthlyMode: series.recurrenceMonthlyMode,
        seriesStatConfig:     series.seriesStatConfig,
        placementRewardsJson: series.placementRewardsJson,
        pollsConfigJson:      series.pollsConfigJson ?? series.pollConfigJson,
        groupId,
        status:               "active",
        seasonNumber:         (series.seasonNumber ?? 1) + 1,
      },
    });
    newSeriesId = newSeason.id;
  }

  return NextResponse.json({ ok: true, newSeriesId });
}
