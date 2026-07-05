import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type SeriesStatConfig = {
  participationPoints?: number;
  stats?: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  aggregatedStatFields?: string[];
  winnerStatKeys?: string[];
  winnerSeriesStatKey?: string;
  matchWinStatKeys?: string[];
  dominionBonus?: {
    triggerStats?: string[];
    triggerStat?: string;
  };
};

type PollResult = { label: string; winnerIds: string[]; coins: number; rankPoints: number };
type EventPollReward = {
  pollId: string; winnerIds: string[]; voterIds: string[];
  participationCoins: number; participationSeriesPoints: number;
  winnerCoins: number; winnerRankPoints: number; label: string;
};
type DominionChange = { streakBefore: number; streakAfter: number; bonusAwarded: boolean; coins: number; seriesPoints: number };

type CompletionData = {
  mvpUserId?: string | null;
  eventWinnerId?: string | null;
  eventWinnerIds?: string[] | null;
  seriesWinnerTargetField?: string | null;
  pollWinnerIds?: string[] | null;
  pollWinnerId?: string | null;
  pollLabel?: string | null;
  pollBonusCoins?: number | null;
  pollBonusRankPoints?: number | null;
  pollResults?: PollResult[] | null;
  spectatorAttendedIds?: string[] | null;
  appliedAggregatedStats?: Record<string, Record<string, number>> | null;
  eventPollRewards?: EventPollReward[] | null;
  dominionChanges?: Record<string, DominionChange> | null;
  finalRanking?: string[] | null;
  finalRankingGroups?: string[][] | null;
};

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

type RevertOptions = {
  // Welche Währungen tatsächlich zurückgebucht werden sollen
  revertCoins?: boolean;
  revertRankPoints?: boolean;
  // Auch Teilnahme-/Platzierungs-/Zuschauer-Basis-Belohnungen zurückbuchen (siehe Hinweis unten)
  includeBaseRewards?: boolean;
  // Label für die PointTransaction-Begründung, z.B. "Status zurückgesetzt" oder "Reihe gelöscht"
  reasonLabel?: string;
};

/**
 * Macht alle Punkte-Effekte eines vorherigen Event-Abschlusses rückgängig:
 * Umfrage-Belohnungen (legacy + Multi-Poll + DB-Umfragen), Dominion-Bonus,
 * sowie die Reihen-Standings (Teilnahmen, Stats, MVP, Sieger-Stats, Umfrage-Felder,
 * Dominion-Streak). Wird aufgerufen, wenn ein Event von "finished"/"umfrage"
 * zurück auf "active" gesetzt wird, damit die Liga-Tabelle das Event nicht
 * mehr zählt (computeStatStandings prüft nur completionData.gamePhaseComplete).
 *
 * Die Reihen-Standings-Bereinigung läuft immer, unabhängig von den revert-Flags,
 * da das Event so oder so nicht mehr in der Liga-Tabelle auftauchen soll.
 *
 * Mit `includeBaseRewards: true` werden zusätzlich Teilnahme-/Platzierungs-/
 * Zuschauer-Basis-Münzen und -Rangpunkte zurückgebucht. Das ist ein Best-Effort:
 * die dafür genutzte Rewards-Konfiguration wird aus dem aktuellen
 * event.placementRewardsJson / event.series.placementRewardsJson gelesen, nicht
 * aus einem zum Vergabezeitpunkt gespeicherten Snapshot — wurde die Konfiguration
 * seitdem geändert, kann der zurückgebuchte Betrag vom ursprünglich vergebenen
 * abweichen. Für den regulären Status-Revert (kein includeBaseRewards) bleibt das
 * Verhalten unverändert, da dort bewusst auf diese Rückbuchung verzichtet wird.
 */
export async function revertEventCompletion(eventId: string, opts: RevertOptions = {}) {
  const {
    revertCoins = true,
    revertRankPoints = true,
    includeBaseRewards = false,
    reasonLabel = "Status zurückgesetzt",
  } = opts;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, seriesId: true, completionData: true,
      placementRewardsJson: true, spectatorRewardJson: true,
      registrations: { select: { userId: true, role: true } },
      matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
      series: { select: { seriesStandingsJson: true, seriesStatConfig: true, placementRewardsJson: true } },
    },
  });
  if (!event?.completionData) return;

  let cd: CompletionData;
  try { cd = JSON.parse(event.completionData); } catch { return; }

  const reason = `[Korrektur] ${reasonLabel}: ${event.title}`;
  const txns: Prisma.PrismaPromise<unknown>[] = [];

  function reverse(userId: string, coins: number, rankPoints: number) {
    if (revertCoins && coins > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { points: { increment: -coins } } }),
        prisma.pointTransaction.create({ data: { userId, amount: -coins, reason } })
      );
    }
    if (revertRankPoints && rankPoints > 0) {
      txns.push(
        prisma.user.update({ where: { id: userId }, data: { rankPoints: { increment: -rankPoints } } }),
        prisma.pointTransaction.create({ data: { userId, amount: -rankPoints, reason } })
      );
    }
  }

  // Legacy Einzel-Umfrage
  const legacyWinners = cd.pollWinnerIds ?? (cd.pollWinnerId ? [cd.pollWinnerId] : []);
  for (const userId of legacyWinners) {
    reverse(userId, cd.pollBonusCoins ?? 0, cd.pollBonusRankPoints ?? 0);
  }

  // Multi-Poll-Ergebnisse (body.pollResults)
  for (const poll of cd.pollResults ?? []) {
    for (const userId of poll.winnerIds ?? []) {
      reverse(userId, poll.coins ?? 0, poll.rankPoints ?? 0);
    }
  }

  // DB-basierte EventPoll-Belohnungen (Teilnahme + Sieger, Münzen + Rang-Punkte)
  for (const ep of cd.eventPollRewards ?? []) {
    for (const userId of ep.voterIds ?? []) {
      reverse(userId, ep.participationCoins ?? 0, ep.participationSeriesPoints ?? 0);
    }
    for (const userId of ep.winnerIds ?? []) {
      reverse(userId, ep.winnerCoins ?? 0, ep.winnerRankPoints ?? 0);
    }
  }

  // Teilnahme-/Platzierungs-/Zuschauer-Basis-Belohnungen (nur wenn explizit angefordert, siehe Docstring)
  if (includeBaseRewards) {
    const rewards = parseRewards(event.placementRewardsJson ?? event.series?.placementRewardsJson);
    const registeredSet = new Set(event.registrations.map(r => r.userId));

    if (rewards.participationCoins > 0) {
      for (const { userId, role } of event.registrations) {
        if (role !== "player") continue;
        reverse(userId, rewards.participationCoins, 0);
      }
    }

    if (cd.finalRankingGroups?.length) {
      let place = 1;
      for (const group of cd.finalRankingGroups) {
        const reward = rewards.placements.find(p => p.place === place);
        if (reward) {
          for (const userId of group.filter(id => registeredSet.has(id))) {
            reverse(userId, reward.coins, reward.rankPoints);
          }
        }
        place += group.length;
      }
    } else if (cd.finalRanking?.length) {
      const ranking = cd.finalRanking.filter(id => registeredSet.has(id));
      ranking.forEach((userId, i) => {
        const reward = rewards.placements.find(p => p.place === i + 1);
        if (reward) reverse(userId, reward.coins, reward.rankPoints);
      });
    }

    if (cd.spectatorAttendedIds?.length && event.spectatorRewardJson) {
      try {
        const sr = JSON.parse(event.spectatorRewardJson) as { coins: number; rankPoints: number };
        for (const userId of cd.spectatorAttendedIds) reverse(userId, sr.coins ?? 0, sr.rankPoints ?? 0);
      } catch { /* ungültige JSON-Daten - ignorieren */ }
    }
  }

  // Dominion-Bonus
  for (const [userId, change] of Object.entries(cd.dominionChanges ?? {})) {
    if (!change.bonusAwarded) continue;
    reverse(userId, change.coins ?? 0, change.seriesPoints ?? 0);
  }

  if (txns.length > 0) await prisma.$transaction(txns);

  // Reihen-Standings-Snapshot bereinigen (Teilnahmen/Stats/MVP/Sieger/Umfragen/Dominion-Streak)
  if (event.seriesId && event.series?.seriesStandingsJson) {
    try {
      const standings = JSON.parse(event.series.seriesStandingsJson) as {
        raw: Record<string, Record<string, number>>;
        lastUpdated: string;
        processedEventIds: string[];
      };

      if (standings.processedEventIds.includes(eventId)) {
        const statCfg: SeriesStatConfig = event.series.seriesStatConfig
          ? JSON.parse(event.series.seriesStatConfig) : {};

        function sub(uid: string, field: string, val: number) {
          if (!standings.raw[uid]) return;
          standings.raw[uid][field] = (standings.raw[uid][field] ?? 0) - val;
          if (standings.raw[uid][field] <= 0) delete standings.raw[uid][field];
          if (Object.keys(standings.raw[uid]).length === 0) delete standings.raw[uid];
        }

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

        for (const { userId, role } of event.registrations) {
          if (role !== "player") continue;
          sub(userId, "participations", 1);
          for (const { field } of statCfg.stats ?? []) {
            const val = statCfg.matchWinStatKeys?.includes(field)
              ? (userStats[userId]?.["Match Win"] ?? 0)
              : (userStats[userId]?.[field] ?? 0);
            if (val > 0) sub(userId, field, val);
          }
        }
        for (const userId of cd.spectatorAttendedIds ?? []) {
          sub(userId, "Zuschauer-Teilnahmen", 1);
        }
        for (const [userId, fields] of Object.entries(cd.appliedAggregatedStats ?? {})) {
          for (const [field, val] of Object.entries(fields)) {
            if (val > 0) sub(userId, field, val);
          }
        }
        if (cd.mvpUserId && statCfg.mvpStatField) {
          sub(cd.mvpUserId, statCfg.mvpStatField, 1);
        }

        const winnerTargetKeys: string[] = statCfg.winnerStatKeys
          ?? (statCfg.winnerSeriesStatKey ? [statCfg.winnerSeriesStatKey] : (cd.seriesWinnerTargetField ? [cd.seriesWinnerTargetField] : []));
        const eventWinnerIds = cd.eventWinnerIds ?? (cd.eventWinnerId ? [cd.eventWinnerId] : []);
        for (const uid of eventWinnerIds) {
          for (const key of winnerTargetKeys) sub(uid, key, 1);
        }

        for (const uid of legacyWinners) {
          if (cd.pollLabel) sub(uid, cd.pollLabel, 1);
        }
        for (const poll of cd.pollResults ?? []) {
          if (!poll.label) continue;
          for (const uid of poll.winnerIds ?? []) sub(uid, poll.label, 1);
        }

        const pollVoterSet = new Set<string>();
        for (const ep of cd.eventPollRewards ?? []) {
          for (const uid of ep.voterIds ?? []) {
            sub(uid, `${ep.label}_Abstimmungen`, 1);
            pollVoterSet.add(uid);
            if (ep.participationSeriesPoints > 0) sub(uid, `${ep.label}_Teilnahmepunkte`, ep.participationSeriesPoints);
          }
          for (const uid of ep.winnerIds ?? []) {
            sub(uid, ep.label, 1);
            if (ep.winnerRankPoints > 0) sub(uid, `${ep.label}_Siegerpunkte`, ep.winnerRankPoints);
          }
        }
        for (const uid of pollVoterSet) sub(uid, "Umfrage-Teilnahmen", 1);

        const dominionTriggerStats = statCfg.dominionBonus?.triggerStats
          ?? (statCfg.dominionBonus?.triggerStat ? [statCfg.dominionBonus.triggerStat] : []);
        const streakKey = `_streak_[${dominionTriggerStats.join(",")}]`;
        for (const [userId, change] of Object.entries(cd.dominionChanges ?? {})) {
          sub(userId, streakKey, change.streakAfter - change.streakBefore);
          if (change.bonusAwarded) {
            sub(userId, "Dominion Bonus", 1);
            if (change.seriesPoints > 0) sub(userId, "Dominion Bonus Punkte", change.seriesPoints);
          }
        }

        standings.processedEventIds = standings.processedEventIds.filter(id => id !== eventId);
        standings.lastUpdated = new Date().toISOString();
        await prisma.eventSeries.update({
          where: { id: event.seriesId },
          data: { seriesStandingsJson: JSON.stringify(standings) },
        });
      }
    } catch { /* ungültige JSON-Daten - ignorieren */ }
  }

  // Betroffene EventPoll-Reihen zurücksetzen, damit sie beim nächsten Abschluss neu ausgewertet werden
  const pollIds = (cd.eventPollRewards ?? []).map(ep => ep.pollId).filter(Boolean);
  if (pollIds.length > 0) {
    await prisma.eventPoll.updateMany({ where: { id: { in: pollIds } }, data: { rewardsPaid: false, winnerIds: null } });
  }

  // completionData löschen, damit die Liga-Tabelle (computeStatStandings) das Event
  // nicht mehr zählt — die Anzeige liest ausschließlich aus event.completionData.
  await prisma.event.update({ where: { id: eventId }, data: { completionData: null } });
}
