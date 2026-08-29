// ============================================
// Battle-Cards-Herausforderungen — ersetzt das alte Münzenduell
// ============================================
// Kein Wetteinsatz, keine Annahme-Verzögerung durch Cooldowns: der Gegner
// nimmt an oder lehnt ab, bei Annahme wird der Kampf serverseitig sofort mit
// der aktuellen Startaufstellung beider Spieler aufgelöst und persistiert
// (Replay über battleLog, siehe battle-log.ts).

import { prisma } from "@/lib/prisma";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl } from "@/lib/battle-cards/resolve-image";
import type { BattleChallenge } from "@prisma/client";

export class ChallengeError extends Error {}

async function getLineupUnits(userId: string) {
  const userCards = await prisma.userCard.findMany({
    where: { userId, inLineup: true },
    include: { card: true },
  });
  const avatarByDiscordId = await resolveAvatarsForCards(userCards.map((uc) => uc.card));
  return userCards.map((uc) =>
    cardToBattleUnitDefinition(uc.card, uc.level, resolveCardImageUrl(uc.card, avatarByDiscordId))
  );
}

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
      status: "pending",
      OR: [
        { challengerId, opponentId },
        { challengerId: opponentId, opponentId: challengerId },
      ],
    },
  });
  if (existing) {
    throw new ChallengeError("Es gibt bereits eine offene Herausforderung zwischen euch.");
  }

  return prisma.battleChallenge.create({ data: { challengerId, opponentId } });
}

/** Kampf auflösen und Ergebnis auf der Challenge persistieren. Gibt die aktualisierte Challenge zurück. */
async function resolveBattle(challenge: BattleChallenge): Promise<BattleChallenge> {
  const [teamA, teamB] = await Promise.all([
    getLineupUnits(challenge.challengerId),
    getLineupUnits(challenge.opponentId),
  ]);
  if (teamA.length === 0 || teamB.length === 0) {
    throw new ChallengeError("Ein Spieler hat keine gültige Startaufstellung mehr.");
  }

  const result = runBattle(teamA, teamB);
  const winnerId =
    result.winner === "A" ? challenge.challengerId : result.winner === "B" ? challenge.opponentId : null;

  const battle = await prisma.battle.create({
    data: {
      playerId: challenge.challengerId,
      opponentType: "PVP_CHALLENGE",
      result: result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW",
      teamSnapshot: {
        challengerId: challenge.challengerId,
        opponentId: challenge.opponentId,
      },
      battleLog: serializeBattleLog(result.log, result.roster),
    },
  });

  return prisma.battleChallenge.update({
    where: { id: challenge.id },
    data: { status: "resolved", battleId: battle.id, winnerId, respondedAt: new Date() },
  });
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

  return resolveBattle(challenge);
}
