import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendPushToUsers } from "@/lib/push";
import { checkAndAwardBadges } from "@/lib/award-badges";
import { createNotificationForUsers } from "@/lib/notifications";
import { recomputeWanderpocalHolders } from "@/lib/recompute-wanderpocal";
import { resolveEventPredictions } from "@/lib/predictions";
import { createPollsForEvent, parsePollsConfigJson } from "@/lib/event-polls";

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
  participationCoins?: number;
  spectatorParticipationCoins?: number;
  transferToGlobalRanking?: boolean;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  aggregatedStatFields?: string[];
  winnerStatKeys?: string[];        // new: array of series stat fields to +1 on event win
  winnerSeriesStatKey?: string;     // old: single field (backward compat)
  matchWinStatKeys?: string[];      // array of series stat fields fed by the per-round "Match Win" flag
  dominionBonus?: {
    enabled: boolean;
    triggerStats: string[];   // new: array (any match keeps streak)
    triggerStat?: string;     // old: single (backward compat)
    threshold: number;
    coins: number;
    seriesPoints: number;
  };
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
 * - Setzt status → "umfrage", solange eine Umfrage (EventPoll mit offenem Zeitfenster, oder eine
 *   konfigurierte Legacy-/Multi-Umfrage ohne Sieger) noch offen ist, sonst → "finished"
 * - Speichert completionData am Event
 * - Vergabe von Teilnahme-Münzen (nur beim ersten Abschluss) — bei Events innerhalb einer Reihe
 *   landen die daraus resultierenden Ligapunkte sofort in der Ligatabelle der Eventreihe, auch wenn
 *   die Umfrage noch läuft. Platzierungs-Münzen/-Rang-Punkte ("Belohnungen (Endplatzierung der
 *   Eventreihe)") werden bei Events innerhalb einer Reihe NICHT hier vergeben, sondern erst bei
 *   Abschluss der gesamten Eventreihe anhand von deren Endplatzierung (siehe
 *   /api/admin/series/[id]/complete) — nur eigenständige Events ohne Reihe erhalten sie direkt hier.
 * - Poll-Gewinner-Belohnung (auch beim Re-Edit, mit Rückbuchung); EventPoll-Umfragen werden erst
 *   ausgewertet, sobald ihr Abstimmungsfenster (endAt) vorbei ist — die zusätzlichen Ligapunkte des
 *   Umfrage-Gewinners kommen erst dann (mit Abschluss der Umfrage) in die Ligatabelle
 * - Aktualisiert seriesStandingsJson (falls Event in einer Reihe ist)
 * - Speichert finalRankingJson + finalRankingNote
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireRole("moderator");
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
    /** Nur bei Format "avg_stats": höchster oder niedrigster kombinierter Ø pro Runde gewinnt */
    avgWinnerDirection?: "high" | "low";
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
    /** Admin-only: noch offene EventPolls sofort schließen (endAt -> jetzt) und mit abschließen */
    closeOpenPolls?: boolean;
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

  // Parse per-event series config (winnerMode etc.)
  const seriesEventCfg = (() => {
    try {
      return (event as { seriesEventConfigJson?: string | null } | null)?.seriesEventConfigJson
        ? JSON.parse((event as { seriesEventConfigJson: string }).seriesEventConfigJson)
        : null;
    } catch { return null; }
  })() as { winnerMode?: string; winnerStatField?: string } | null;

  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });

  // Gesamttabellen-Konfiguration der Reihe (Ligapunkte + Teilnahme-Münzen, seriesweit fix)
  const statCfg: SeriesStatConfig = (() => {
    try { return event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : {}; }
    catch { return {} as SeriesStatConfig; }
  })();

  const isReEdit = !!event.completionData;
  const oldCompletion: Record<string, unknown> = isReEdit
    ? (() => { try { return JSON.parse(event.completionData as string); } catch { return {}; } })()
    : {};

  // Ob überhaupt eine Legacy-Einzel-Umfrage konfiguriert ist. Nötig, um zu wissen, ob ein fehlender
  // Poll-Sieger "noch offen" oder schlicht "nicht vorhanden" bedeutet.
  const legacyPollConfigured = (() => {
    const raw = event.pollConfigJson ?? event.series?.pollConfigJson;
    if (!raw) return false;
    try { return !!(JSON.parse(raw) as { enabled?: boolean } | null)?.enabled; } catch { return false; }
  })();

  // Falls für dieses Event noch nie eine Umfrage angelegt wurde (z.B. weil die Multi-Umfragen erst
  // nachträglich in den Reihen-Einstellungen konfiguriert wurden, nachdem dieses Event schon
  // existierte — createPollsForEvent läuft normalerweise nur bei Event-Erstellung), beim ersten
  // Abschluss der Spielphase jetzt aus der (Event- oder Reihen-)Konfiguration anlegen. Startzeitpunkt
  // ist bewusst "jetzt" (Abschluss der Spielphase) statt des ursprünglichen Event-Starts, damit die
  // konfigurierte Umfragedauer ab dem tatsächlichen Start der Umfragephase läuft.
  if (!isReEdit && event.polls.length === 0) {
    const pollsCfg = parsePollsConfigJson(event.pollsConfigJson ?? event.series?.pollsConfigJson);
    if (pollsCfg.length > 0) {
      await createPollsForEvent(eventId, new Date(), pollsCfg);
      event.polls = await prisma.eventPoll.findMany({
        where: { eventId, rewardsPaid: false },
        include: { votes: { select: { voterId: true, targetId: true } } },
      });
    }
  }

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

  // Event-Gewinner — determined by seriesEventCfg.winnerMode, or fallback to body fields
  let eventWinnerId: string | undefined;       // compat: erster Gewinner
  let eventWinnerIds: string[] = [];

  const effectiveWinnerMode = seriesEventCfg?.winnerMode ?? ((body.winnerStatField || body.avgWinnerDirection) ? "stat" : "manual");

  if (effectiveWinnerMode === "bracket") {
    // winner = first entry of finalRankingJson
    const finalRanking: string[] = (() => {
      try { return (event as { finalRankingJson?: string | null } | null)?.finalRankingJson ? JSON.parse((event as { finalRankingJson: string }).finalRankingJson) : []; }
      catch { return []; }
    })();
    if (finalRanking.length > 0) {
      eventWinnerId = finalRanking[0];
      eventWinnerIds = [finalRanking[0]];
    }
  } else if (effectiveWinnerMode === "stat" && event.format === "avg_stats") {
    // Durchschnittswerte: kombinierter Ø pro Runde über alle Stat-Felder entscheidet (nicht die Summe)
    const fields: string[] = event.statFields ? JSON.parse(event.statFields) : [];
    const direction = body.avgWinnerDirection ?? "high";
    const rounds: Record<string, number> = {};
    for (const match of event.matches) {
      for (const entry of match.entries) {
        if (!entry.userId) continue;
        rounds[entry.userId] = (rounds[entry.userId] ?? 0) + 1;
      }
    }
    let bestVal: number | null = null;
    for (const [uid, stats] of Object.entries(userStats)) {
      const r = rounds[uid] ?? 0;
      if (r === 0) continue;
      const fieldAvgs = fields.map(f => (stats[f] ?? 0) / r);
      const combined = fieldAvgs.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / fieldAvgs.length : 0;
      const better = bestVal === null || (direction === "high" ? combined > bestVal : combined < bestVal);
      if (better) { bestVal = combined; eventWinnerId = uid; eventWinnerIds = [uid]; }
      else if (combined === bestVal) { eventWinnerIds.push(uid); }
    }
  } else if (effectiveWinnerMode === "stat") {
    const statField = seriesEventCfg?.winnerStatField ?? body.winnerStatField;
    if (statField) {
      let maxVal = -Infinity;
      for (const [uid, stats] of Object.entries(userStats)) {
        const val = stats[statField] ?? 0;
        if (val > maxVal) { maxVal = val; eventWinnerId = uid; eventWinnerIds = [uid]; }
        else if (val === maxVal && maxVal > -Infinity) { eventWinnerIds.push(uid); }
      }
    }
  } else {
    // manual: use body.finalRanking[0] or body.mvpUserId as winner
    const manualWinner = body.finalRanking?.[0] ?? body.mvpUserId;
    if (manualWinner) {
      eventWinnerId = manualWinner;
      eventWinnerIds = [manualWinner];
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

    // Teilnahme-Münzen für alle Spieler — bei Events innerhalb einer Reihe kommt der Betrag
    // seriesweit fix aus der Gesamttabellen-Konfiguration, sonst aus den Event-Belohnungen
    const effectiveParticipationCoins = event.seriesId ? (statCfg.participationCoins ?? 0) : rewards.participationCoins;
    if (effectiveParticipationCoins > 0 && playerIds.length > 0) {
      await prisma.$transaction(
        playerIds.flatMap(userId => [
          prisma.user.update({
            where: { id: userId },
            data: { points: { increment: effectiveParticipationCoins } },
          }),
          prisma.pointTransaction.create({
            data: { userId, amount: effectiveParticipationCoins, reason: `[Münzen] Teilnahme: ${event.title}` },
          }),
        ])
      );
    }

    // Zuschauer-Basis-Belohnung für anwesende Zuschauer
    if (event.spectatorMode && body.spectatorAttendedIds?.length) {
      const spectatorRankPoints = (() => {
        if (!event.spectatorRewardJson) return 0;
        try { return (JSON.parse(event.spectatorRewardJson) as { rankPoints: number }).rankPoints ?? 0; }
        catch { return 0; }
      })();
      // Zuschauer-Münzen: bei Events innerhalb einer Reihe seriesweit fix aus der
      // Gesamttabellen-Konfiguration, sonst aus der Event-eigenen Zuschauer-Belohnung
      const spectatorCoins = event.seriesId
        ? (statCfg.spectatorParticipationCoins ?? 0)
        : (() => {
            if (!event.spectatorRewardJson) return 0;
            try { return (JSON.parse(event.spectatorRewardJson) as { coins: number }).coins ?? 0; }
            catch { return 0; }
          })();
      const attendedSpectators = (body.spectatorAttendedIds ?? []).filter(id => spectatorIds.includes(id));
      if (attendedSpectators.length > 0) {
        const txns: Prisma.PrismaPromise<unknown>[] = [];
        for (const userId of attendedSpectators) {
          if (spectatorCoins > 0) {
            txns.push(
              prisma.user.update({ where: { id: userId }, data: { points: { increment: spectatorCoins } } }),
              prisma.pointTransaction.create({ data: { userId, amount: spectatorCoins, reason: `[Münzen] Zuschauer: ${event.title}` } })
            );
          }
          if (spectatorRankPoints > 0) {
            txns.push(
              prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: spectatorRankPoints } } }),
              prisma.pointTransaction.create({ data: { userId, amount: spectatorRankPoints, reason: `[Rang-Punkte] Zuschauer: ${event.title}` } })
            );
          }
        }
        if (txns.length > 0) await prisma.$transaction(txns);
      }
    }

    // Platzierungs-Münzen + Rang-Punkte (unterstützt Gleichstand via finalRankingGroups) — nur für
    // eigenständige Events ohne Reihe. Events innerhalb einer Eventreihe erhalten ihre
    // Platzierungs-Belohnung erst bei Abschluss der gesamten Reihe (Endplatzierung).
    if (!event.seriesId) {
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
      // Reverse winner coins (Ligapunkte-Rollback läuft über series standings)
      if (old.winnerCoins > 0) {
        for (const uid of old.winnerIds) {
          txns.push(
            prisma.user.update({ where: { id: uid }, data: { points: { increment: -old.winnerCoins } } }),
            prisma.pointTransaction.create({ data: { userId: uid, amount: -old.winnerCoins, reason: `[Korrektur] Poll Gewinner: ${old.label}` } })
          );
        }
      }
      if (txns.length > 0) await prisma.$transaction(txns);
      // Reset rewardsPaid on old polls so they get re-processed
      await prisma.eventPoll.update({ where: { id: old.pollId }, data: { rewardsPaid: false } });
    }

    // Reverse the one-time, event-wide Umfrage-Teilnahme-Belohnung (nicht pro Poll)
    const oldParticipationReward = (oldCompletion.pollParticipationReward as Array<{ userId: string; coins: number }> | undefined) ?? [];
    if (oldParticipationReward.length > 0) {
      const txns: Prisma.PrismaPromise<unknown>[] = [];
      for (const { userId: uid, coins } of oldParticipationReward) {
        txns.push(
          prisma.user.update({ where: { id: uid }, data: { points: { increment: -coins } } }),
          prisma.pointTransaction.create({ data: { userId: uid, amount: -coins, reason: `[Korrektur] Umfrage Teilnahme: ${event.title}` } })
        );
      }
      await prisma.$transaction(txns);
    }
  }

  // Fetch polls with rewardsPaid=false (includes re-opened ones from re-edit).
  // Nur Umfragen, deren Abstimmungsfenster (endAt) bereits vorbei ist, werden jetzt final ausgewertet —
  // noch laufende Umfragen bleiben unbezahlt, bis das Event erneut abgeschlossen wird (Ligapunkte des
  // Umfrage-Gewinners kommen dann erst mit Abschluss der Umfrage dazu, nicht vorher).
  const now = new Date();
  const allUnpaidPolls = event.polls ?? [];

  // Admin-only: noch offene Umfragen sofort schließen (Umfragephase manuell beenden,
  // statt auf das natürliche Ablaufen von endAt zu warten).
  if (body.closeOpenPolls && currentUser.role === "admin") {
    const stillOpenIds = allUnpaidPolls.filter(p => new Date(p.endAt) > now).map(p => p.id);
    if (stillOpenIds.length > 0) {
      await prisma.eventPoll.updateMany({ where: { id: { in: stillOpenIds } }, data: { endAt: now } });
      for (const p of allUnpaidPolls) {
        if (stillOpenIds.includes(p.id)) p.endAt = now;
      }
    }
  }

  const unpaidPolls = allUnpaidPolls.filter(p => new Date(p.endAt) <= now);
  const hasOpenEventPoll = allUnpaidPolls.some(p => new Date(p.endAt) > now);
  const eventPollRewards: Array<{
    pollId: string; winnerIds: string[]; voterIds: string[];
    participationCoins: number; participationSeriesPoints: number;
    winnerCoins: number; winnerRankPoints: number; label: string;
  }> = [];

  // Teilnahme-Münzen werden einmalig pro Event vergeben, nicht je Umfrage: über alle in diesem
  // Lauf verarbeiteten Umfragen hinweg bekommt jeder Voter die Belohnung nur einmal, in Höhe des
  // höchsten konfigurierten Betrags unter den Umfragen, an denen er teilgenommen hat.
  const participationCoinsByVoter: Record<string, number> = {};

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

    // Teilnahme (einmal pro Voter über alle Umfragen des Events hinweg, siehe unten)
    const uniqueVoterIds = [...new Set(voterIds)];
    for (const uid of uniqueVoterIds) {
      if (poll.participationCoins > (participationCoinsByVoter[uid] ?? 0))
        participationCoinsByVoter[uid] = poll.participationCoins;
    }
    // Winner rewards
    if (poll.winnerCoins > 0) {
      for (const uid of winnerIds) {
        txns.push(
          prisma.user.update({ where: { id: uid }, data: { points: { increment: poll.winnerCoins } } }),
          prisma.pointTransaction.create({ data: { userId: uid, amount: poll.winnerCoins, reason: `[Münzen] Poll Gewinner: ${poll.label}` } })
        );
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

  // Einmalige Teilnahme-Belohnung pro Event auszahlen (Betrag = höchster konfigurierter Wert
  // unter den Umfragen, an denen der jeweilige User teilgenommen hat)
  const pollParticipationReward: { userId: string; coins: number }[] = [];
  const participationTxns: Prisma.PrismaPromise<unknown>[] = [];
  for (const [uid, coins] of Object.entries(participationCoinsByVoter)) {
    if (coins <= 0) continue;
    pollParticipationReward.push({ userId: uid, coins });
    participationTxns.push(
      prisma.user.update({ where: { id: uid }, data: { points: { increment: coins } } }),
      prisma.pointTransaction.create({ data: { userId: uid, amount: coins, reason: `[Münzen] Umfrage Teilnahme: ${event.title}` } })
    );
  }
  if (participationTxns.length > 0) await prisma.$transaction(participationTxns);

  // ── Series-Standings (optional, nur wenn Event in einer Reihe ist) ──────────
  let updatedStandings: SeriesStandings | null = null;
  let appliedAggregatedStats: Record<string, Record<string, number>> = {};
  type DominionChange = { streakBefore: number; streakAfter: number; bonusAwarded: boolean; coins: number; seriesPoints: number };
  let dominionChanges: Record<string, DominionChange> = {};

  if (event.series) {
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

    // Determine which series stat fields get +1 for event winners (hoisted for use in dominion check)
    const winnerTargetKeys: string[] = statCfg.winnerStatKeys
      ?? (statCfg.winnerSeriesStatKey
        ? [statCfg.winnerSeriesStatKey]
        : (body.seriesWinnerTargetField ? [body.seriesWinnerTargetField] : []));

    if (!isReEdit) {
      // Mitspieler-Teilnahmen
      for (const { userId, role } of event.registrations) {
        if (role !== "player") continue;
        addToUser(userId, "participations", 1);
        const eStats = userStats[userId] ?? {};
        for (const { field } of (statCfg.stats ?? [])) {
          const val = statCfg.matchWinStatKeys?.includes(field) ? (eStats["Match Win"] ?? 0) : (eStats[field] ?? 0);
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
      if (eventWinnerIds.length > 0 && winnerTargetKeys.length > 0) {
        for (const uid of eventWinnerIds) {
          for (const key of winnerTargetKeys) addToUser(uid, key, 1);
        }
      }

      // Teilnahme-Ligapunkte → globale Rangliste
      if (statCfg.transferToGlobalRanking && statCfg.participationPoints > 0 && event.registrations.length > 0) {
        const pts = statCfg.participationPoints;
        await Promise.all(playerIds.flatMap(userId => [
          prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: pts } } }),
          prisma.pointTransaction.create({ data: { userId, amount: pts, reason: `[Rang-Punkte] Ligatabelle Teilnahme: ${event.title}` } }),
        ]));
      }

      // Stat-Tabellen-Punkte (pointsPer) → globale Rangliste
      if (statCfg.transferToGlobalRanking && (statCfg.stats ?? []).length > 0) {
        for (const { userId } of event.registrations.filter(r => r.role === "player")) {
          const eStats = userStats[userId] ?? {};
          let total = 0;
          for (const { field, pointsPer } of statCfg.stats) {
            const val = statCfg.matchWinStatKeys?.includes(field) ? (eStats["Match Win"] ?? 0) : (eStats[field] ?? 0);
            total += val * pointsPer;
          }
          if (total > 0) {
            await prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: total } } });
            await prisma.pointTransaction.create({ data: { userId, amount: total, reason: `[Rang-Punkte] Ligatabelle Stats: ${event.title}` } });
          }
        }
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

    // Event-Gewinner (winnerStatKeys): alten Eintrag rückgängig, neuen setzen
    // Also handle legacy completionData that stored a single seriesWinnerTargetField
    const oldWinnerTargetField = (oldCompletion.seriesWinnerTargetField as string | undefined);
    if (isReEdit) {
      const oldWinnerIds: string[] = (oldCompletion.eventWinnerIds as string[] | undefined) ??
        (oldCompletion.eventWinnerId ? [oldCompletion.eventWinnerId as string] : []);
      const keysToRollback = winnerTargetKeys.length > 0
        ? winnerTargetKeys
        : (oldWinnerTargetField ? [oldWinnerTargetField] : []);
      for (const uid of oldWinnerIds) {
        for (const key of keysToRollback) addToUser(uid, key, -1);
      }
    }
    if (isReEdit && eventWinnerIds.length > 0 && winnerTargetKeys.length > 0) {
      for (const uid of eventWinnerIds) {
        for (const key of winnerTargetKeys) addToUser(uid, key, 1);
      }
    }

    // Poll-Siege in Reihen-Tabelle: Label → +1 pro Gewinner
    // Re-Edit: alte Poll-Siege (body.pollResults) rückbuchen
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

      // Re-Edit: DB-basierte EventPoll-Standings rückbuchen
      const oldEpRewards = (oldCompletion.eventPollRewards as Array<{
        label: string; winnerIds: string[]; voterIds: string[];
        participationSeriesPoints: number; winnerRankPoints: number;
      }> | undefined) ?? [];
      const oldEventVoterSet = new Set<string>();
      for (const old of oldEpRewards) {
        for (const uid of old.voterIds) {
          addToUser(uid, `${old.label}_Abstimmungen`, -1);
          oldEventVoterSet.add(uid);
          if (old.participationSeriesPoints > 0)
            addToUser(uid, `${old.label}_Teilnahmepunkte`, -old.participationSeriesPoints);
        }
        for (const uid of old.winnerIds) {
          addToUser(uid, old.label, -1);
          if (old.winnerRankPoints > 0)
            addToUser(uid, `${old.label}_Siegerpunkte`, -old.winnerRankPoints);
        }
      }
      for (const uid of oldEventVoterSet) {
        addToUser(uid, "Umfrage-Teilnahmen", -1);
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

    // EventPoll series points: Abstimmungs-Tracking + Punkte pro Voter/Sieger
    const eventVoterSet = new Set<string>(); // einmal pro Event für Umfrage-Teilnahmen
    for (const ep of eventPollRewards) {
      for (const uid of ep.voterIds) {
        // Abstimmungs-Zähler pro Umfrage
        addToUser(uid, `${ep.label}_Abstimmungen`, 1);
        eventVoterSet.add(uid);

        // Ligapunkte für Abstimmung (nur wenn konfiguriert)
        if (ep.participationSeriesPoints > 0) {
          addToUser(uid, `${ep.label}_Teilnahmepunkte`, ep.participationSeriesPoints);
          if (statCfg.transferToGlobalRanking) {
            await prisma.user.update({ where: { id: uid }, data: { rankPoints: { increment: ep.participationSeriesPoints } } });
            await prisma.pointTransaction.create({ data: { userId: uid, amount: ep.participationSeriesPoints, reason: `[Rang-Punkte] Umfrage Teilnahme (${ep.label}): ${event.title}` } });
          }
        }
      }
      for (const uid of ep.winnerIds) {
        addToUser(uid, ep.label, 1);
        if (ep.winnerRankPoints > 0) {
          addToUser(uid, `${ep.label}_Siegerpunkte`, ep.winnerRankPoints);
          if (statCfg.transferToGlobalRanking) {
            await prisma.user.update({ where: { id: uid }, data: { rankPoints: { increment: ep.winnerRankPoints } } });
            await prisma.pointTransaction.create({ data: { userId: uid, amount: ep.winnerRankPoints, reason: `[Rang-Punkte] Umfrage Sieger (${ep.label}): ${event.title}` } });
          }
        }
      }
    }
    // +1 Umfrage-Teilnahmen pro Event (nicht pro Poll)
    for (const uid of eventVoterSet) {
      addToUser(uid, "Umfrage-Teilnahmen", 1);
    }

    // ── Dominion Bonus ───────────────────────────────────────────────────────────
    const dominionCfg = statCfg.dominionBonus;

    const dominionTriggerStats = dominionCfg?.triggerStats ?? (dominionCfg?.triggerStat ? [dominionCfg.triggerStat] : []);
    const streakKey = `_streak_[${dominionTriggerStats.join(",")}]`;

    if (dominionCfg?.enabled && dominionTriggerStats.length > 0) {
      const allUserIds = [...new Set([...event.registrations.map(r => r.userId), ...Object.keys(raw)])];

      // Re-Edit: roll back previous dominion changes
      if (isReEdit) {
        const oldChanges = (oldCompletion.dominionChanges ?? {}) as Record<string, DominionChange>;
        for (const [userId, ch] of Object.entries(oldChanges)) {
          // Undo streak delta
          const streakDelta = ch.streakAfter - ch.streakBefore;
          addToUser(userId, streakKey, -streakDelta);
          // Undo bonus
          if (ch.bonusAwarded) {
            addToUser(userId, "Dominion Bonus", -1);
            if (ch.seriesPoints > 0) addToUser(userId, "Dominion Bonus Punkte", -ch.seriesPoints);
          }
        }
      }

      for (const userId of allUserIds) {
        const userRow = raw[userId] ?? {};
        const streakBefore = userRow[streakKey] ?? 0;

        // Did this user get +1 in ANY of the trigger stats this event?
        const gotTrigger = dominionTriggerStats.some(t => {
          if (t === "Teilnahmen") return event.registrations.some(r => r.userId === userId && r.role === "player");
          if (t === "Zuschauer-Teilnahmen") return (body.spectatorAttendedIds ?? []).includes(userId);
          const pollMatch = eventPollRewards.find(ep => ep.label === t);
          if (pollMatch) return pollMatch.winnerIds.includes(userId);
          if (appliedAggregatedStats[userId]?.[t]) return true;
          if (winnerTargetKeys.includes(t) && eventWinnerIds.includes(userId)) return true;
          const pollResult = (body.pollResults ?? []).find(p => p.label === t);
          if (pollResult) return (pollResult.winnerIds ?? []).includes(userId);
          return false;
        });

        let streakAfter: number;
        let bonusAwarded = false;

        if (gotTrigger) {
          streakAfter = streakBefore + 1;
          if (streakAfter >= dominionCfg.threshold) {
            // Award bonus
            bonusAwarded = true;
            streakAfter = 0; // reset after bonus
            addToUser(userId, "Dominion Bonus", 1);
            if (dominionCfg.seriesPoints > 0) {
              addToUser(userId, "Dominion Bonus Punkte", dominionCfg.seriesPoints);
              if (statCfg.transferToGlobalRanking) {
                await prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: dominionCfg.seriesPoints } } });
                await prisma.pointTransaction.create({ data: { userId, amount: dominionCfg.seriesPoints, reason: `[Rang-Punkte] Dominion Bonus: ${event.series!.name}` } });
              }
            }
            if (dominionCfg.coins > 0) {
              await prisma.user.update({ where: { id: userId }, data: { points: { increment: dominionCfg.coins } } });
              await prisma.pointTransaction.create({ data: { userId, amount: dominionCfg.coins, reason: `[Münzen] Dominion Bonus: ${event.series!.name}` } });
            }
          }
        } else {
          streakAfter = 0; // reset on miss
        }

        // Update streak in standings
        const streakDelta = streakAfter - streakBefore;
        if (streakDelta !== 0) addToUser(userId, streakKey, streakDelta);

        if (streakBefore !== streakAfter || bonusAwarded) {
          dominionChanges[userId] = { streakBefore, streakAfter, bonusAwarded, coins: dominionCfg.coins, seriesPoints: dominionCfg.seriesPoints };
        }
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
  // Solange eine Umfrage noch läuft (EventPoll mit offenem Abstimmungsfenster, oder die konfigurierte
  // Legacy-Einzel-Umfrage noch keinen Sieger hat) bleibt das Event in der Umfragephase — auch wenn die
  // Spielergebnisse (und damit die Ligapunkte daraus) bereits final sind. Erst wenn die Umfrage
  // abgeschlossen ist, wechselt der Status auf "finished" (zusammen mit den Umfrage-Ligapunkten).
  // Echte DB-Umfragen (EventPoll) werden ausschließlich über hasOpenEventPoll erkannt.
  const legacyPollResolved = !legacyPollConfigured || newPollWinners.length > 0;
  const hasPendingPollPhase = hasOpenEventPoll || !legacyPollResolved;
  // Wird im Client gespeichert/gelesen, um zwischen "nur noch Umfrage ausstehend" (isPollOnly) und
  // "alles abgeschlossen" zu unterscheiden — muss daher exakt hasPendingPollPhase widerspiegeln.
  const pollPhaseComplete = !hasPendingPollPhase;

  const completionData = {
    mvpUserId:               body.mvpUserId ?? null,
    winnerStatField:         body.winnerStatField ?? null,
    avgWinnerDirection:      body.avgWinnerDirection ?? null,
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
    pollPhaseComplete,
    eventPollRewards:        eventPollRewards.length > 0 ? eventPollRewards : null,
    pollParticipationReward: pollParticipationReward.length > 0 ? pollParticipationReward : null,
    dominionChanges:         Object.keys(dominionChanges).length > 0 ? dominionChanges : null,
    lockedAt:                new Date().toISOString(),
  };

  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: {
        status: hasPendingPollPhase ? "umfrage" : "finished",
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

  // Event-Gesamtsieger-Vorhersagen auswerten — beim ersten Abschluss, oder erneut beim Re-Edit,
  // falls sich der Sieger nachträglich geändert hat (Pott wird dann automatisch zurückgebucht
  // und mit dem neuen Sieger neu verteilt, siehe resolveEventPredictions()).
  const oldEventWinnerId = (oldCompletion.eventWinnerId as string | undefined) ?? null;
  const newEventWinnerId = eventWinnerId ?? null;
  if (!isReEdit || oldEventWinnerId !== newEventWinnerId) {
    try {
      await resolveEventPredictions(eventId, newEventWinnerId);
    } catch (err) {
      console.error("[Predictions] Auswertung fehlgeschlagen:", err);
    }
  }

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
