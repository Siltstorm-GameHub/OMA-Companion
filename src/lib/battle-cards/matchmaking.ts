// ============================================
// Battle-Cards-Matchmaking — "Zufallsgegner suchen"
// ============================================
// Alternative zur Direkt-Herausforderung: beitreten reiht in eine
// Warteschlange ein; sobald ein zweiter User beitritt, wird sofort (ohne
// Annahme-Schritt) ein Match zwischen den beiden ältesten wartenden Usern
// aufgelöst — wiederverwendet dieselbe Kampf-Auflösung wie direkte
// Herausforderungen (createInstantMatch).

import { prisma } from "@/lib/prisma";
import { createInstantMatch, ChallengeError } from "@/lib/battle-cards/challenge";

export type QueueJoinResult =
  | { matched: true; challengeId: string; battleId: string | null }
  | { matched: false; waiting: true };

/** Tritt der Warteschlange bei — matched sofort, falls schon jemand wartet. */
export async function joinQueue(userId: string): Promise<QueueJoinResult> {
  const mine = await prisma.battleQueueEntry.findUnique({ where: { userId } });
  if (mine) {
    if (mine.matchedChallengeId) {
      const challenge = await prisma.battleChallenge.findUnique({
        where: { id: mine.matchedChallengeId },
        select: { battleId: true },
      });
      await prisma.battleQueueEntry.delete({ where: { id: mine.id } });
      return { matched: true, challengeId: mine.matchedChallengeId, battleId: challenge?.battleId ?? null };
    }
    return { matched: false, waiting: true };
  }

  // Ältesten wartenden (noch nicht gematchten) Eintrag eines anderen Users suchen.
  const opponentEntry = await prisma.battleQueueEntry.findFirst({
    where: { userId: { not: userId }, matchedChallengeId: null },
    orderBy: { createdAt: "asc" },
  });

  if (!opponentEntry) {
    await prisma.battleQueueEntry.create({ data: { userId } });
    return { matched: false, waiting: true };
  }

  try {
    // Wer zuerst wartete, wird als "challengerId" auf der Challenge geführt.
    const challenge = await createInstantMatch(opponentEntry.userId, userId);
    await prisma.battleQueueEntry.update({
      where: { id: opponentEntry.id },
      data: { matchedChallengeId: challenge.id },
    });
    return { matched: true, challengeId: challenge.id, battleId: challenge.battleId };
  } catch (error) {
    // Der wartende User hat inzwischen keine gültige Aufstellung mehr — dessen
    // Warteschlangen-Eintrag ist wertlos, entfernen und diesen User stattdessen
    // selbst neu einreihen.
    if (error instanceof ChallengeError) {
      await prisma.battleQueueEntry.delete({ where: { id: opponentEntry.id } }).catch(() => {});
      await prisma.battleQueueEntry.create({ data: { userId } });
      return { matched: false, waiting: true };
    }
    throw error;
  }
}

export type QueueStatus =
  | { inQueue: false; matched: false }
  | { inQueue: true; matched: false }
  | { inQueue: false; matched: true; challengeId: string; battleId: string | null };

/** Für Polling: prüft, ob der wartende Eintrag zwischenzeitlich gematcht wurde. */
export async function pollQueue(userId: string): Promise<QueueStatus> {
  const entry = await prisma.battleQueueEntry.findUnique({ where: { userId } });
  if (!entry) return { inQueue: false, matched: false };

  if (entry.matchedChallengeId) {
    const challenge = await prisma.battleChallenge.findUnique({
      where: { id: entry.matchedChallengeId },
      select: { battleId: true },
    });
    await prisma.battleQueueEntry.delete({ where: { id: entry.id } });
    return { inQueue: false, matched: true, challengeId: entry.matchedChallengeId, battleId: challenge?.battleId ?? null };
  }

  return { inQueue: true, matched: false };
}

/** Verlässt die Warteschlange (nur solange noch kein Match gefunden wurde). */
export async function leaveQueue(userId: string): Promise<void> {
  await prisma.battleQueueEntry.deleteMany({ where: { userId, matchedChallengeId: null } });
}
