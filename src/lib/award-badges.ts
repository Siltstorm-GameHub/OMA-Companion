import { prisma } from "@/lib/prisma";
import { findNewlyEarnedBadges, getBadgeDef, type BadgeStats } from "@/lib/badges";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { loadRoom } from "@/lib/room";
import { roomLevel } from "@/lib/room-layout";
import { getRoomItem } from "@/lib/room-items";

async function loadStats(userId: string): Promise<BadgeStats> {
  const [
    user, eventCount, tournamentWins, eventWins, mvpCount, job,
    room, upgradedRows, pokalCount, trophyCount, systemBadgeCount, customBadgeCount,
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
    // Idle-Job-Verdienst. `.catch` weil die Tabelle auf älteren Datenbanken
    // noch nicht existiert — ein fehlendes Zimmer darf nie die Abzeichen kippen.
    prisma.userJob
      .findUnique({ where: { userId }, select: { totalEarned: true } })
      .catch(() => null),
    // Zimmer-Ausbaustufe — faule Materialisierung, funktioniert auch ohne Room-Zeile.
    loadRoom(userId).catch(() => null),
    // Nicht-Grundausstattungs-Items: reicht, um "hasRoomUpgrade" zu prüfen
    // (mind. eins mit upgradeSlot), ohne den ganzen Katalog zu laden.
    prisma.roomItem.findMany({ where: { userId, starter: false }, select: { itemKey: true } }).catch(() => []),
    prisma.pokal.count({ where: { userId } }).catch(() => 0),
    prisma.wanderpocalHolder.count({ where: { userId } }).catch(() => 0),
    prisma.userSystemBadge.count({ where: { userId } }).catch(() => 0),
    prisma.userCustomBadge.count({ where: { userId } }).catch(() => 0),
  ]);

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
    jobCoinsEarned:  job?.totalEarned ?? 0,
    roomLevel:       room ? roomLevel(room.placed) : 0,
    hasRoomUpgrade:  upgradedRows.some(r => !!getRoomItem(r.itemKey)?.upgradeSlot),
    vitrineItemCount: pokalCount + trophyCount + systemBadgeCount + customBadgeCount,
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
