// ============================================
// Battle-Cards-Matchmaking — "Zufallsgegner suchen"
// ============================================
// Alternative zur Direkt-Herausforderung: beitreten reiht in eine
// Warteschlange ein; sobald ein zweiter User beitritt, wird sofort (ohne
// Annahme-Schritt) eine Begegnung erstellt und startet direkt als interaktiver
// LiveBattle — wiederverwendet dieselbe Erstellung wie direkte Herausforderungen
// (createInstantMatch). Kämpfe hier laufen immer im DUELS-Elo-Pool (siehe
// challenge.ts: createInstantMatch setzt kein `mode`, Default ist "DUELS").
//
// Gegner-Wahl ist Elo-bewusst statt reinem FIFO: unter allen wartenden Usern
// wird der am längsten Wartende genommen, dessen Elo noch innerhalb eines mit
// seiner Wartezeit wachsenden Fensters liegt (siehe eloWindowFor) — bei
// gefundener Übereinstimmung sonst wird trotzdem selbst gewartet, statt eine
// krasse Fehlpaarung zu erzwingen. Nach ELO_WINDOW_UNLIMITED_AFTER_MINUTES
// entfällt die Elo-Schranke komplett, damit in einer kleinen Community niemand
// unbegrenzt lange auf ein "perfektes" Match warten muss.

import { prisma } from "@/lib/prisma";
import { createInstantMatch, ChallengeError } from "@/lib/battle-cards/challenge";
import { ELO_BASE } from "@/lib/battle-cards/elo";

export type QueueJoinResult =
  | { matched: true; challengeId: string; liveBattleId: string | null }
  | { matched: false; waiting: true };

const ELO_WINDOW_BASE = 150;
const ELO_WINDOW_GROWTH_PER_MINUTE = 60;
const ELO_WINDOW_UNLIMITED_AFTER_MINUTES = 5;

/** Erlaubter Elo-Abstand für einen Wartenden, abhängig davon, wie lange er schon
 *  wartet — wächst linear, ab ELO_WINDOW_UNLIMITED_AFTER_MINUTES unbegrenzt. */
function eloWindowFor(waitMs: number): number {
  const waitMinutes = waitMs / 60_000;
  if (waitMinutes >= ELO_WINDOW_UNLIMITED_AFTER_MINUTES) return Infinity;
  return ELO_WINDOW_BASE + waitMinutes * ELO_WINDOW_GROWTH_PER_MINUTE;
}

/** Tritt der Warteschlange bei — matched sofort, falls schon jemand mit passendem
 *  (oder inzwischen ausreichend geweitetem) Elo-Fenster wartet. */
export async function joinQueue(userId: string): Promise<QueueJoinResult> {
  const mine = await prisma.battleQueueEntry.findUnique({ where: { userId } });
  if (mine) {
    if (mine.matchedChallengeId) {
      const challenge = await prisma.battleChallenge.findUnique({
        where: { id: mine.matchedChallengeId },
        select: { liveBattleId: true },
      });
      await prisma.battleQueueEntry.delete({ where: { id: mine.id } });
      return { matched: true, challengeId: mine.matchedChallengeId, liveBattleId: challenge?.liveBattleId ?? null };
    }
    return { matched: false, waiting: true };
  }

  const [me, waitingEntries] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { eloDuels: true } }),
    // Älteste zuerst — bei mehreren im Elo-Fenster passenden Kandidaten gewinnt
    // der am längsten Wartende (Fairness vor perfekter Passgenauigkeit).
    prisma.battleQueueEntry.findMany({
      where: { userId: { not: userId }, matchedChallengeId: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const myElo = me?.eloDuels ?? ELO_BASE;

  let opponentEntry: (typeof waitingEntries)[number] | null = null;
  if (waitingEntries.length > 0) {
    const opponentUsers = await prisma.user.findMany({
      where: { id: { in: waitingEntries.map((e) => e.userId) } },
      select: { id: true, eloDuels: true },
    });
    const eloByUserId = new Map(opponentUsers.map((u) => [u.id, u.eloDuels]));
    const now = Date.now();

    for (const entry of waitingEntries) {
      const opponentElo = eloByUserId.get(entry.userId) ?? ELO_BASE;
      const window = eloWindowFor(now - entry.createdAt.getTime());
      if (Math.abs(opponentElo - myElo) <= window) {
        opponentEntry = entry;
        break;
      }
    }
  }

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
    return { matched: true, challengeId: challenge.id, liveBattleId: challenge.liveBattleId };
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
  | { inQueue: false; matched: true; challengeId: string; liveBattleId: string | null };

/** Für Polling: prüft, ob der wartende Eintrag zwischenzeitlich gematcht wurde. */
export async function pollQueue(userId: string): Promise<QueueStatus> {
  const entry = await prisma.battleQueueEntry.findUnique({ where: { userId } });
  if (!entry) return { inQueue: false, matched: false };

  if (entry.matchedChallengeId) {
    const challenge = await prisma.battleChallenge.findUnique({
      where: { id: entry.matchedChallengeId },
      select: { liveBattleId: true },
    });
    await prisma.battleQueueEntry.delete({ where: { id: entry.id } });
    return { inQueue: false, matched: true, challengeId: entry.matchedChallengeId, liveBattleId: challenge?.liveBattleId ?? null };
  }

  return { inQueue: true, matched: false };
}

/** Verlässt die Warteschlange (nur solange noch kein Match gefunden wurde). */
export async function leaveQueue(userId: string): Promise<void> {
  await prisma.battleQueueEntry.deleteMany({ where: { userId, matchedChallengeId: null } });
}
