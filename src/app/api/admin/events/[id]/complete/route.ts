import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendPushToUsers } from "@/lib/push";
import { checkAndAwardBadges } from "@/lib/award-badges";
import { createNotificationForUsers } from "@/lib/notifications";
import { recomputeWanderpocalHolders } from "@/lib/recompute-wanderpocal";

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
  spectatorParticipationPoints?: number;
  transferToGlobalRanking?: boolean;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  aggregatedStatFields?: string[];
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

  type PollResult = {
    label: string;
    winnerIds: string[];
    coins: number;
    rankPoints: number;
    type: "player" | "spectator";
  };

  const body = await req.json() as {
    mvpUserId?: string;
    winnerStatField?: string;
    seriesWinnerTargetField?: string;
    // Legacy single-poll fields (kept for backward compat)
    pollWinnerIds?: string[];
    pollLabel?: string;
    pollBonusCoins?: number;
    pollBonusRankPoints?: number;
    pollExcludedUserIds?: string[];
    // Multi-poll results
    pollResults?: PollResult[];
    finalRanking?: string[];
    finalRankingGroups?: string[][];
    finalRankingNote?: string;
    participationCoins?: number;
    placements?: PlacementReward[];
    // Spectator rewards
    spectatorAttendedIds?: string[];
  };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: { select: { userId: true, role: true } },
      series: true,
      polls: {
        where: { rewardsPaid: false },
        include: { votes: { select: { voterId: true, targetId: true } } },
      },
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
  const playerIds = event.registrations.filter(r => r.role === "player").map(r => r.userId);
  const spectatorIds = event.registrations.filter(r => r.role === "spectator").map(r => r.userId);

  // ── Coin/RankPoint-Vergabe (nur beim ersten Abschluss) ──────────────────────
  if (!isReEdit) {
    const rewards: RewardsConfig = {
      participationCoins: body.participationCoins ?? parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson).participationCoins,
      placements: body.placements ?? parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson).placements,
    };

    // Teilnahme-Münzen für alle Spieler
    if (rewards.participationCoins > 0 && playerIds.length > 0) {
      await prisma.$transaction(
        playerIds.flatMap(userId => [
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

    // Zuschauer-Basis-Belohnung für anwesende Zuschauer
    if (event.spectatorMode && body.spectatorAttendedIds?.length && event.spectatorRewardJson) {
      const spectatorReward = (() => {
        try { return JSON.parse(event.spectatorRewardJson) as { coins: number; rankPoints: number }; }
        catch { return null; }
      })();
      const attendedSpectators = (body.spectatorAttendedIds ?? []).filter(id => spectatorIds.includes(id));
      if (spectatorReward && attendedSpectators.length > 0) {
        const txns: Prisma.PrismaPromise<unknown>[] = [];
        for (const userId of attendedSpectators) {
          if (spectatorReward.coins > 0) {
            txns.push(
              prisma.user.update({ where: { id: userId }, data: { points: { increment: spectatorReward.coins } } }),
              prisma.pointTransaction.create({ data: { userId, amount: spectatorReward.coins, reason: `[Münzen] Zuschauer: ${event.title}` } })
            );
          }
          if (spectatorReward.rankPoints > 0) {
            txns.push(
              prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: spectatorReward.rankPoints } } }),
              prisma.pointTransaction.create({ data: { userId, amount: spectatorReward.rankPoints, reason: `[Rang-Punkte] Zuschauer: ${event.title}` } })
            );
          }
        }
        if (txns.length > 0) await prisma.$transaction(txns);
      }
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

  // Neue Poll-Gewinner vergeben (legacy single poll)
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

  // Multi-Poll-Belohnungen (pollResults array)
  if (body.pollResults?.length) {
    for (const poll of body.pollResults) {
      const eligibleIds = poll.type === "spectator" ? spectatorIds : playerIds;
      const winners = (poll.winnerIds ?? []).filter(id => eligibleIds.includes(id));
      for (const userId of winners) {
        const txns: Prisma.PrismaPromise<unknown>[] = [];
        if (poll.coins > 0) {
          txns.push(
            prisma.user.update({ where: { id: userId }, data: { points: { increment: poll.coins } } }),
            prisma.pointTransaction.create({ data: { userId, amount: poll.coins, reason: `[Münzen] ${poll.label}: ${event.title}` } })
          );
        }
        if (poll.rankPoints > 0) {
          txns.push(
            prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: poll.rankPoints } } }),
            prisma.pointTransaction.create({ data: { userId, amount: poll.rankPoints, reason: `[Rang-Punkte] ${poll.label}: ${event.title}` } })
          );
        }
        if (txns.length > 0) await prisma.$transaction(txns);
      }
    }
  }

  // ── EventPoll-Belohnungen (DB-basiert, automatisch beim Abschluss) ───────────
  // Re-Edit: Rückbuchung bereits bezahlter Poll-Belohnungen
  if (isReEdit) {
    const oldPollRewards = (oldCompletion.eventPollRewards as Array<{
      pollId: string; winnerIds: string[]; voterIds: string[];
      participationCoins: number; participationSeriesPoints: number;
      winnerCoins: number; winnerRankPoints: number; label: string;
    }> | undefined) ?? [];

    for (const old of oldPollRewards) {
      const txns: Prisma.PrismaPromise<unknown>[] = [];
      // Reverse participation coins
      if (old.participationCoins > 0) {
        for (const uid of old.voterIds) {
          txns.push(
            prisma.user.update({ where: { id: uid }, data: { points: { increment: -old.participationCoins } } }),
            prisma.pointTransaction.create({ data: { userId: uid, amount: -old.participationCoins, reason: `[Korrektur] Poll Teilnahme: ${old.label}` } })
          );
        }
      }
      // Reverse winner coins/rankPoints
      if (old.winnerCoins > 0 || old.winnerRankPoints > 0) {
        for (const uid of old.winnerIds) {
          if (old.winnerCoins > 0) {
            txns.push(
              prisma.user.update({ where: { id: uid }, data: { points: { increment: -old.winnerCoins } } }),
              prisma.pointTransaction.create({ data: { userId: uid, amount: -old.winnerCoins, reason: `[Korrektur] Poll Gewinner: ${old.label}` } })
            );
          }
          if (old.winnerRankPoints > 0) {
            txns.push(
              prisma.user.update({ where: { id: uid }, data: { rankPoints: { increment: -old.winnerRankPoints } } }),
              prisma.pointTransaction.create({ data: { userId: uid, amount: -old.winnerRankPoints, reason: `[Korrektur] Poll Rang-Punkte: ${old.label}` } })
            );
          }
        }
      }
      if (txns.length > 0) await prisma.$transaction(txns);
      // Reset rewardsPaid on old polls so they get re-processed
      await prisma.eventPoll.update({ where: { id: old.pollId }, data: { rewardsPaid: false } });
    }
  }

  // Fetch polls with rewardsPaid=false (includes re-opened ones from re-edit)
  const unpaidPolls = event.polls ?? [];
  const eventPollRewards: Array<{
    pollId: string; winnerIds: string[]; voterIds: string[];
    participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number; label: string;
  }> = [];

  for (const poll of unpaidPolls) {
    // Determine winner(s): targetId with most votes; ties = all with max
    const voteCounts: Record<string, number> = {};
    const voterIds: string[] = [];
    for (const vote of poll.votes) {
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
      voterIds.push(vote.voterId);
    }

    let maxVotes = 0;
    for (const c of Object.values(voteCounts)) {
      if (c > maxVotes) maxVotes = c;
    }
    const winnerIds = maxVotes > 0
      ? Object.entries(voteCounts).filter(([, c]) => c === maxVotes).map(([id]) => id)
      : [];

    const txns: Prisma.PrismaPromise<unknown>[] = [];

    // Participation rewards (once per voter)
    const uniqueVoterIds = [...new Set(voterIds)];
    if (poll.participationCoins > 0) {
      for (const uid of uniqueVoterIds) {
        txns.push(
          prisma.user.update({ where: { id: uid }, data: { points: { increment: poll.participationCoins } } }),
          prisma.pointTransaction.create({ data: { userId: uid, amount: poll.participationCoins, reason: `[Münzen] Poll Teilnahme: ${poll.label}` } })
        );
      }
    }
    // Winner rewards
    if (poll.winnerCoins > 0 || poll.winnerRankPoints > 0) {
      for (const uid of winnerIds) {
        if (poll.winnerCoins > 0) {
          txns.push(
            prisma.user.update({ where: { id: uid }, data: { points: { increment: poll.winnerCoins } } }),
            prisma.pointTransaction.create({ data: { userId: uid, amount: poll.winnerCoins, reason: `[Münzen] Poll Gewinner: ${poll.label}` } })
          );
        }
        if (poll.winnerRankPoints > 0) {
          txns.push(
            prisma.user.update({ where: { id: uid }, data: { rankPoints: { increment: poll.winnerRankPoints } } }),
            prisma.pointTransaction.create({ data: { userId: uid, amount: poll.winnerRankPoints, reason: `[Rang-Punkte] Poll Gewinner: ${poll.label}` } })
          );
        }
      }
    }

    if (txns.length > 0) await prisma.$transaction(txns);

    // Mark poll as paid and store winnerIds
    await prisma.eventPoll.update({
      where: { id: poll.id },
      data: { rewardsPaid: true, winnerIds: winnerIds.length > 0 ? JSON.stringify(winnerIds) : null },
    });

    eventPollRewards.push({
      pollId: poll.id, winnerIds, voterIds: uniqueVoterIds,
      participationCoins: poll.participationCoins,
      participationSeriesPoints: poll.participationSeriesPoints,
      winnerCoins: poll.winnerCoins,
      winnerRankPoints: poll.winnerRankPoints,
      label: poll.label,
    });
  }

  // ── Series-Standings (optional, nur wenn Event in einer Reihe ist) ──────────
  let updatedStandings: SeriesStandings | null = null;
  let appliedAggregatedStats: Record<string, Record<string, number>> = {};

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
      // Mitspieler-Teilnahmen
      for (const { userId, role } of event.registrations) {
        if (role !== "player") continue;
        addToUser(userId, "participations", 1);
        const eStats = userStats[userId] ?? {};
        for (const { field } of (statCfg.stats ?? [])) {
          const val = eStats[field] ?? 0;
          if (val > 0) addToUser(userId, field, val);
        }
        for (const field of (statCfg.aggregatedStatFields ?? [])) {
          const val = eStats[field] ?? 0;
          if (val > 0) {
            addToUser(userId, field, val);
            if (!appliedAggregatedStats[userId]) appliedAggregatedStats[userId] = {};
            appliedAggregatedStats[userId][field] = (appliedAggregatedStats[userId][field] ?? 0) + val;
          }
        }
      }
      // Zuschauer-Teilnahmen (nur bestätigte Zuschauer)
      for (const userId of (body.spectatorAttendedIds ?? [])) {
        addToUser(userId, "Zuschauer-Teilnahmen", 1);
      }
      // Zuschauer-Teilnahmepunkte auf globale Rangliste übertragen (wenn aktiviert)
      const spectatorPts = statCfg.spectatorParticipationPoints ?? 0;
      if (statCfg.transferToGlobalRanking && spectatorPts > 0 && body.spectatorAttendedIds?.length) {
        await Promise.all((body.spectatorAttendedIds).flatMap(userId => [
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: spectatorPts } } }),
          prisma.pointTransaction.create({ data: { userId, amount: spectatorPts, reason: `[Rang-Punkte] Ligatabelle Zuschauer: ${event.title}` } }),
        ]));
      }
      if (eventWinnerIds.length > 0 && body.seriesWinnerTargetField) {
        for (const uid of eventWinnerIds) addToUser(uid, body.seriesWinnerTargetField, 1);
      }

      // Tabellenpunkte auf globale Rangliste übertragen
      if (statCfg.transferToGlobalRanking && statCfg.participationPoints > 0 && event.registrations.length > 0) {
        const pts = statCfg.participationPoints;
        await Promise.all(event.registrations.flatMap(({ userId }) => [
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: pts } } }),
          prisma.pointTransaction.create({ data: { userId, amount: pts, reason: `[Rang-Punkte] Ligatabelle Teilnahme: ${event.title}` } }),
        ]));
      }
    }

    // MVP: alten Eintrag rückgängig, neuen setzen
    if (isReEdit && oldCompletion.mvpUserId && statCfg.mvpStatField) {
      addToUser(oldCompletion.mvpUserId as string, statCfg.mvpStatField, -1);
    }
    if (body.mvpUserId && statCfg.mvpStatField) {
      addToUser(body.mvpUserId, statCfg.mvpStatField, 1);
    }

    // Re-Edit: Zuschauer-Teilnahmen rückbuchen und neu setzen
    if (isReEdit) {
      const oldSpectators = (oldCompletion.spectatorAttendedIds as string[] | undefined) ?? [];
      for (const userId of oldSpectators) addToUser(userId, "Zuschauer-Teilnahmen", -1);
      for (const userId of (body.spectatorAttendedIds ?? [])) addToUser(userId, "Zuschauer-Teilnahmen", 1);
    }

    // Re-Edit: aggregierte Stats rückbuchen und neu berechnen
    if (isReEdit && statCfg.aggregatedStatFields?.length) {
      const oldApplied = (oldCompletion.appliedAggregatedStats ?? {}) as Record<string, Record<string, number>>;
      // Alte Werte abziehen
      for (const [userId, fields] of Object.entries(oldApplied)) {
        for (const [field, val] of Object.entries(fields)) {
          if (val > 0) addToUser(userId, field, -val);
        }
      }
      // Neue Werte addieren
      for (const { userId } of event.registrations) {
        const eStats = userStats[userId] ?? {};
        for (const field of statCfg.aggregatedStatFields) {
          const val = eStats[field] ?? 0;
          if (val > 0) {
            addToUser(userId, field, val);
            if (!appliedAggregatedStats[userId]) appliedAggregatedStats[userId] = {};
            appliedAggregatedStats[userId][field] = (appliedAggregatedStats[userId][field] ?? 0) + val;
          }
        }
      }
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

    // Poll-Siege in Reihen-Tabelle: Label → +1 pro Gewinner
    // Re-Edit: alte Poll-Siege rückbuchen
    if (isReEdit) {
      const oldPolls = (oldCompletion.pollResults as typeof body.pollResults | undefined) ?? [];
      for (const poll of (oldPolls ?? [])) {
        if (!poll.label) continue;
        for (const uid of (poll.winnerIds ?? [])) addToUser(uid, poll.label, -1);
      }
      // Legacy single poll
      const oldLabel = oldCompletion.pollLabel as string | undefined;
      const oldPollWinners = (oldCompletion.pollWinnerIds as string[] | undefined) ?? [];
      if (oldLabel) {
        for (const uid of oldPollWinners) addToUser(uid, oldLabel, -1);
      }
    }
    // Neue Poll-Siege eintragen (multi-poll)
    for (const poll of (body.pollResults ?? [])) {
      if (!poll.label || !poll.winnerIds?.length) continue;
      for (const uid of poll.winnerIds) addToUser(uid, poll.label, 1);
    }
    // Legacy single poll
    if (body.pollLabel && newPollWinners.length > 0) {
      for (const uid of newPollWinners) addToUser(uid, body.pollLabel, 1);
    }

    // EventPoll series points: participationSeriesPoints per voter, +1 win per winner per poll label
    for (const ep of eventPollRewards) {
      if (ep.participationSeriesPoints > 0) {
        for (const uid of ep.voterIds) {
          addToUser(uid, `${ep.label}_teilnahme`, ep.participationSeriesPoints);
        }
      }
      for (const uid of ep.winnerIds) {
        addToUser(uid, ep.label, 1);
      }
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
    // Legacy single poll
    pollWinnerIds:           newPollWinners.length > 0 ? newPollWinners : null,
    pollLabel:               body.pollLabel ?? null,
    pollBonusCoins:          pollCoins > 0 ? pollCoins : null,
    pollBonusRankPoints:     pollRankPts > 0 ? pollRankPts : null,
    pollExcludedUserIds:     body.pollExcludedUserIds && body.pollExcludedUserIds.length > 0 ? body.pollExcludedUserIds : null,
    // Multi-poll results
    pollResults:             body.pollResults?.length ? body.pollResults : null,
    // Spectator
    spectatorAttendedIds:    body.spectatorAttendedIds?.length ? body.spectatorAttendedIds : null,
    finalRanking:            body.finalRanking ?? null,
    finalRankingGroups:      body.finalRankingGroups ?? null,
    appliedAggregatedStats:  Object.keys(appliedAggregatedStats).length > 0 ? appliedAggregatedStats : null,
    gamePhaseComplete:       true,
    pollPhaseComplete:       newPollWinners.length > 0 || (body.pollResults?.some(p => p.winnerIds.length > 0) ?? false),
    eventPollRewards:        eventPollRewards.length > 0 ? eventPollRewards : null,
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

  // Push + In-App Notification an alle Teilnehmer
  const participantIds = event.registrations.map(r => r.userId);
  const eventNotifTitle = `✅ Event abgeschlossen: ${event.title}`;
  const eventNotifBody  = "Schau dir deine Punkte und das Ergebnis an!";
  sendPushToUsers(participantIds, { title: eventNotifTitle, body: eventNotifBody, url: "/events" }).catch(() => {});
  createNotificationForUsers(participantIds, { type: "event_result", title: eventNotifTitle, body: eventNotifBody, url: "/events" }).catch(() => {});

  // Badge-Check für alle Teilnehmer (fire-and-forget)
  for (const userId of participantIds) {
    checkAndAwardBadges(userId).catch(() => {});
  }

  // Wanderpokal: Trophäen-Halter neu berechnen (fire-and-forget)
  recomputeWanderpocalHolders().catch((err) =>
    console.error("[Wanderpokal] Recompute failed:", err)
  );

  return NextResponse.json({ ok: true, completionData, eventWinnerId });
}
