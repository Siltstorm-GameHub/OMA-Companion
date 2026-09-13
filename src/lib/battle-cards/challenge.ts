// ============================================
// Battle-Cards-Herausforderungen — ersetzt das alte Münzenduell
// ============================================
// Kein Wetteinsatz, keine Annahme-Verzögerung durch Cooldowns: der Gegner
// nimmt an oder lehnt ab. Bei Annahme startet (statt einer sofortigen
// serverseitigen Auflösung) ein OMA-Duels-Live-Kampf — beide Spieler steuern
// ihre Seite über simultane Runden selbst (siehe duel-live-battle.ts). Dasselbe
// gilt fürs Matchmaking (createInstantMatch, von matchmaking.ts genutzt).
//
// Ersetzt den alten sequentiellen Duell-Modus (live-battle.ts/interactive.ts,
// "PVP_CHALLENGE"/"PVP_MATCHMAKING") vollständig — der Annahme-/Warteschlangen-
// Ablauf drumherum bleibt unverändert, nur die dahinterliegende Engine/Aufstellung
// wechselt von der 5er-PVE-Lineup auf das neue Duell-Deck (siehe duel-deck.ts).

import { prisma } from "@/lib/prisma";
import { startLiveDuelBattle, LiveDuelBattleError } from "@/lib/battle-cards/duel-live-battle";
import { getActiveDuelDeck } from "@/lib/battle-cards/duel-deck";
import type { BattleChallenge } from "@prisma/client";

export class ChallengeError extends Error {}

export async function createChallenge(challengerId: string, opponentId: string): Promise<BattleChallenge> {
  if (challengerId === opponentId) {
    throw new ChallengeError("Du kannst dich nicht selbst herausfordern.");
  }

  const [opponent, challengerDeck, opponentDeck] = await Promise.all([
    prisma.user.findUnique({ where: { id: opponentId }, select: { id: true } }),
    getActiveDuelDeck(challengerId),
    getActiveDuelDeck(opponentId),
  ]);
  if (!opponent) throw new ChallengeError("Dieser Spieler wurde nicht gefunden.");
  if (!challengerDeck) {
    throw new ChallengeError("Du hast noch kein Duell-Deck zusammengestellt — stelle zuerst dein Deck zusammen.");
  }
  if (!opponentDeck) {
    throw new ChallengeError("Dieser Spieler hat noch kein Duell-Deck zusammengestellt.");
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
    await startLiveDuelBattle(challenge.id, challenge.challengerId, challenge.opponentId);
  } catch (error) {
    if (error instanceof LiveDuelBattleError) throw new ChallengeError(error.message);
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
    await startLiveDuelBattle(challenge.id, challengerId, opponentId);
  } catch (error) {
    await prisma.battleChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    if (error instanceof LiveDuelBattleError) throw new ChallengeError(error.message);
    throw error;
  }

  return prisma.battleChallenge.findUniqueOrThrow({ where: { id: challenge.id } });
}
