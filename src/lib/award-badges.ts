import { prisma } from "@/lib/prisma";
import { findNewlyEarnedBadges, getBadgeDef, type BadgeStats } from "@/lib/badges";
import { dispatchNotification } from "@/lib/notify-dispatch";

async function loadStats(userId: string): Promise<BadgeStats> {
  const [
    user, eventCount, tournamentWins, eventWins, mvpCount,
    pokalCount, trophyCount, systemBadgeCount, customBadgeCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, voiceMinutesTotal: true, messagesTotal: true },
    }),
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.tournamentParticipant.count({ where: { userId, finalRank: 1 } }),
    // Event wins: user appears in eventWinnerIds of completionData — count via raw events
    prisma.event.count({
      where: {
        status: "finished",
        completionData: { contains: userId },
      },
    }),
    // MVP: events where mvpUserId === userId
    prisma.event.count({
      where: {
        status: "finished",
        completionData: { contains: `"mvpUserId":"${userId}"` },
      },
    }),
    prisma.pokal.count({ where: { userId } }).catch(() => 0),
    prisma.wanderpocalHolder.count({ where: { userId } }).catch(() => 0),
    prisma.userSystemBadge.count({ where: { userId } }).catch(() => 0),
    prisma.userCustomBadge.count({ where: { userId } }).catch(() => 0),
  ]);

  const communityJobVoteCount = await Promise.all([
    prisma.jobReportVote.count({ where: { voterId: userId } }),
    prisma.jobReportContributionVote.count({ where: { voterId: userId } }),
    prisma.jobMediaAssetVote.count({ where: { voterId: userId } }),
    prisma.marketingPostVote.count({ where: { voterId: userId } }),
    prisma.coachRating.count({ where: { raterId: userId } }),
    prisma.communityIdeaVote.count({ where: { voterId: userId } }),
  ]).then(counts => counts.reduce((a, b) => a + b, 0)).catch(() => 0);

  // Tournament count = any tournament participation
  const tournamentCount = await prisma.tournamentParticipant.count({ where: { userId } });

  return {
    points:          user?.points ?? 0,
    voiceHours:      Math.floor((user?.voiceMinutesTotal ?? 0) / 60),
    messageCount:    user?.messagesTotal ?? 0,
    eventCount,
    tournamentCount,
    tournamentWins,
    eventWins,
    mvpCount,
    vitrineItemCount: pokalCount + trophyCount + systemBadgeCount + customBadgeCount,
    communityJobVoteCount,
  };
}

/**
 * Checks which system badges a user has newly earned and writes them to DB.
 * Sends a push notification for each new badge.
 * Safe to call multiple times — already-earned badges are skipped via @@id constraint.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const [stats, existing] = await Promise.all([
    loadStats(userId),
    prisma.userSystemBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
  ]);

  const alreadyEarned = new Set(existing.map(b => b.badgeKey));
  const newKeys = findNewlyEarnedBadges(stats, alreadyEarned);
  if (newKeys.length === 0) return [];

  // Write new badges (ignore conflicts in case of race conditions)
  await prisma.userSystemBadge.createMany({
    data: newKeys.map(badgeKey => ({ userId, badgeKey })),
    skipDuplicates: true,
  });

  // Push + In-App Notification (fire-and-forget)
  for (const key of newKeys) {
    const def = getBadgeDef(key);
    if (!def) continue;
    dispatchNotification("badge_earned", {
      users: [userId],
      placeholders: { "{badgeIcon}": def.icon, "{badgeName}": def.name, "{badgeDesc}": def.desc },
    }).catch(() => {});
  }

  return newKeys;
}
