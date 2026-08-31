// ============================================
// Battle-Cards-Herausforderungen — ersetzt das alte Münzenduell
// ============================================
// Kein Wetteinsatz, keine Annahme-Verzögerung durch Cooldowns: der Gegner
// nimmt an oder lehnt ab, bei Annahme wird der Kampf serverseitig sofort mit
// der aktuellen Startaufstellung beider Spieler aufgelöst und persistiert
// (Replay über battle-log.ts). playMatch() wird außerdem vom Matchmaking
// (matchmaking.ts) für sofortige Zufallsgegner-Matches wiederverwendet.

import { prisma } from "@/lib/prisma";
import { runBattle } from "@/lib/battle-engine/engine";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import { buildBattleTeam } from "@/lib/battle-cards/team-builder";
import { applyWinStreak } from "@/lib/battle-cards/win-streak";
import type { Battle, BattleChallenge } from "@prisma/client";

export class ChallengeError extends Error {}

/** Löst einen Kampf zwischen zwei Usern serverseitig auf und persistiert das Battle-Ergebnis. */
async function playMatch(
  challengerId: string,
  opponentId: string,
  opponentType: "PVP_CHALLENGE" | "PVP_MATCHMAKING"
): Promise<{ battle: Battle; winnerId: string | null }> {
  const [teamA, teamB] = await Promise.all([buildBattleTeam(challengerId), buildBattleTeam(opponentId)]);
  if (teamA.units.length === 0 || teamB.units.length === 0) {
    throw new ChallengeError("Ein Spieler hat keine gültige Startaufstellung mehr.");
  }

  const result = runBattle(teamA.units, teamB.units);
  const winnerId =
    result.winner === "A" ? challengerId : result.winner === "B" ? opponentId : null;

  const battle = await prisma.battle.create({
    data: {
      playerId: challengerId,
      opponentType,
      result: result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW",
      teamSnapshot: { challengerId, opponentId },
      battleLog: serializeBattleLog(result.log, result.roster),
    },
  });

  const loserId = winnerId === challengerId ? opponentId : challengerId;
  await applyWinStreak(winnerId, loserId);

  return { battle, winnerId };
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

  const { battle, winnerId } = await playMatch(challenge.challengerId, challenge.opponentId, "PVP_CHALLENGE");
  return prisma.battleChallenge.update({
    where: { id: challenge.id },
    data: { status: "resolved", battleId: battle.id, winnerId, respondedAt: new Date() },
  });
}

/**
 * Erstellt und löst sofort ein Match zwischen zwei Usern auf — für das
 * Matchmaking (kein Einladen/Annehmen nötig, Beitritt zur Warteschlange gilt
 * als Zustimmung). `challengerId` ist hier einfach, wer zuerst in der
 * Warteschlange wartete.
 */
export async function createInstantMatch(challengerId: string, opponentId: string): Promise<BattleChallenge> {
  if (challengerId === opponentId) {
    throw new ChallengeError("Du kannst nicht gegen dich selbst antreten.");
  }
  const { battle, winnerId } = await playMatch(challengerId, opponentId, "PVP_MATCHMAKING");
  return prisma.battleChallenge.create({
    data: {
      challengerId,
      opponentId,
      status: "resolved",
      battleId: battle.id,
      winnerId,
      respondedAt: new Date(),
    },
  });
}
