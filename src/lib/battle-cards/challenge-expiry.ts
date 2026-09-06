// ============================================
// Aufräumen liegen gelassener OMA-Duels-Herausforderungen
// ============================================
// createChallenge blockt eine neue Herausforderung zwischen zwei Usern, solange
// zwischen ihnen noch eine "pending" oder "live" BattleChallenge existiert (siehe
// challenge.ts) — ohne Aufräumen würde eine schlicht ignorierte Einladung oder ein
// angenommener, aber nie weitergespielter Kampf die beiden für immer blockieren.
//
// Zwei Fälle:
//  - "pending": nie beantwortet (weder angenommen noch abgelehnt) — läuft nach
//    PENDING_CHALLENGE_EXPIRY_HOURS ab.
//  - "live": angenommen, aber die zugehörige LiveBattle wurde seit
//    LIVE_BATTLE_ABANDON_HOURS nicht mehr fortgesetzt (niemand hat die Seite
//    geöffnet — der reguläre Zug-Timeout in live-battle.ts greift nur bei
//    Poll/Seitenaufruf). Wird ohne Sieger/Niederlage abgebrochen
//    (countsForRanking: false), damit niemand fürs bloße Nicht-Spielen bestraft
//    wird — siehe dieselbe Fairness-Überlegung wie bei OMA Gems.
//
// Beide Fälle landen auf status "expired" (siehe BattleChallenge.mode-Kommentar
// im Schema) statt "resolved"/"declined", damit sie in der Rangliste (die nur
// "resolved" zählt, siehe leaderboard.ts) und in der Historie klar als
// "einfach verfallen" erkennbar bleiben.

import { prisma } from "@/lib/prisma";

export const PENDING_CHALLENGE_EXPIRY_HOURS = 72;
export const LIVE_BATTLE_ABANDON_HOURS = 24;

export interface ExpireStaleChallengesResult {
  expiredPending: number;
  expiredLive: number;
}

export async function expireStaleChallenges(): Promise<ExpireStaleChallengesResult> {
  const now = new Date();

  const pendingCutoff = new Date(now.getTime() - PENDING_CHALLENGE_EXPIRY_HOURS * 60 * 60 * 1000);
  const { count: expiredPending } = await prisma.battleChallenge.updateMany({
    where: { status: "pending", createdAt: { lt: pendingCutoff } },
    data: { status: "expired", respondedAt: now },
  });

  const liveCutoff = new Date(now.getTime() - LIVE_BATTLE_ABANDON_HOURS * 60 * 60 * 1000);
  const staleLiveChallenges = await prisma.battleChallenge.findMany({
    where: { status: "live", liveBattleId: { not: null } },
    select: { id: true, liveBattleId: true },
  });

  let expiredLive = 0;
  for (const challenge of staleLiveChallenges) {
    if (!challenge.liveBattleId) continue;
    const live = await prisma.liveBattle.findUnique({
      where: { id: challenge.liveBattleId },
      select: { status: true, updatedAt: true },
    });
    if (!live || live.status !== "active" || live.updatedAt >= liveCutoff) continue;

    await prisma.$transaction([
      prisma.liveBattle.update({ where: { id: challenge.liveBattleId }, data: { status: "finished" } }),
      prisma.battleChallenge.update({
        where: { id: challenge.id },
        data: { status: "expired", winnerId: null, countsForRanking: false, respondedAt: now },
      }),
    ]);
    expiredLive++;
  }

  return { expiredPending, expiredLive };
}
