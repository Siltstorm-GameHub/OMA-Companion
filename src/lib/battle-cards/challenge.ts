// ============================================
// Battle-Cards-Herausforderungen — ersetzt das alte Münzenduell
// ============================================
// Kein Wetteinsatz, keine Annahme-Verzögerung durch Cooldowns: der Gegner
// nimmt an oder lehnt ab. Bei Annahme startet (statt einer sofortigen
// serverseitigen Auflösung) ein interaktiver LiveBattle — beide Spieler
// steuern ihre Seite zugweise selbst (siehe live-battle.ts). Dasselbe gilt
// fürs Matchmaking (createInstantMatch, von matchmaking.ts genutzt).

import { prisma } from "@/lib/prisma";
import { startLivePvpBattle, LiveBattleError } from "@/lib/battle-cards/live-battle";
import type { BattleChallenge } from "@prisma/client";

export class ChallengeError extends Error {}

export async function createChallenge(challengerId: string, opponentId: string): Promise<BattleChallenge> {
  if (challengerId === opponentId) {
    throw new ChallengeError("Du kannst dich nicht selbst herausfordern.");
  }

  const [opponent, challengerLineupCount, opponentLineupCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: opponentId }, select: { id: true } }),
    prisma.userCard.count({ where: { userId: challengerId, inLineup: true } }),
    prisma.userCard.count({ where: { userId: opponentId, inLineup: true } }),
  ]);
  if (!opponent) throw new ChallengeError("Dieser Spieler wurde nicht gefunden.");
  if (challengerLineupCount === 0) {
    throw new ChallengeError("Du hast noch keine Startaufstellung — stelle zuerst deine Karten auf.");
  }
  if (opponentLineupCount === 0) {
    throw new ChallengeError("Dieser Spieler hat noch keine Startaufstellung.");
  }

  const existing = await prisma.battleChallenge.findFirst({
    where: {
      status: { in: ["pending", "live"] },
      OR: [
        { challengerId, opponentId },
        { challengerId: opponentId, opponentId: challengerId },
      ],
    },
  });
  if (existing) {
    throw new ChallengeError("Es gibt bereits eine offene Herausforderung oder einen laufenden Kampf zwischen euch.");
  }

  return prisma.battleChallenge.create({ data: { challengerId, opponentId } });
}

export async function respondToChallenge(
  challengeId: string,
  responderId: string,
  action: "accept" | "decline"
): Promise<BattleChallenge> {
  const challenge = await prisma.battleChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new ChallengeError("Herausforderung nicht gefunden.");
  if (challenge.opponentId !== responderId) {
    throw new ChallengeError("Nur der Herausgeforderte kann antworten.");
  }
  if (challenge.status !== "pending") {
    throw new ChallengeError("Diese Herausforderung ist nicht mehr offen.");
  }

  if (action === "decline") {
    return prisma.battleChallenge.update({
      where: { id: challengeId },
      data: { status: "declined", respondedAt: new Date() },
    });
  }

  try {
    await startLivePvpBattle(challenge.id, challenge.challengerId, challenge.opponentId, "PVP_CHALLENGE");
  } catch (error) {
    if (error instanceof LiveBattleError) throw new ChallengeError(error.message);
    throw error;
  }

  return prisma.battleChallenge.findUniqueOrThrow({ where: { id: challenge.id } });
}

/**
 * Erstellt eine bereits "angenommene" Begegnung zwischen zwei Usern — für das
 * Matchmaking (kein Einladen/Annehmen nötig, Beitritt zur Warteschlange gilt
 * als Zustimmung). `challengerId` ist hier einfach, wer zuerst in der
 * Warteschlange wartete. Startet direkt einen LiveBattle (siehe oben).
 */
export async function createInstantMatch(challengerId: string, opponentId: string): Promise<BattleChallenge> {
  if (challengerId === opponentId) {
    throw new ChallengeError("Du kannst nicht gegen dich selbst antreten.");
  }

  const challenge = await prisma.battleChallenge.create({
    data: { challengerId, opponentId, status: "pending", respondedAt: new Date() },
  });

  try {
    await startLivePvpBattle(challenge.id, challengerId, opponentId, "PVP_MATCHMAKING");
  } catch (error) {
    await prisma.battleChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    if (error instanceof LiveBattleError) throw new ChallengeError(error.message);
    throw error;
  }

  return prisma.battleChallenge.findUniqueOrThrow({ where: { id: challenge.id } });
}
