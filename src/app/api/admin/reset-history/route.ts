import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/reset-history
 *
 * Bereinigt die Punktehistorie:
 * 1. Löscht alle PointTransactions VOR dem 5.6.2026 (Datenschnitt: exklusive 2026-06-05 00:00 UTC)
 * 2. Setzt user.points für alle User auf 0
 * 3. Berechnet user.points neu als Summe der verbleibenden Transaktionen
 * 4. Setzt user.rankPoints neu aus rank-relevanten Transaktionen (Turnier, Event)
 *
 * Verbleiben: LUL-Transaktionen + R6-Siege-Event (6.6.2026) + alles ab 5.6.2026
 */
export async function POST() {
  await requireRole("admin");

  const CUTOFF = new Date("2026-06-05T00:00:00.000Z");

  // 1. Alle Transactions vor dem Stichtag löschen
  const { count: deleted } = await prisma.pointTransaction.deleteMany({
    where: { createdAt: { lt: CUTOFF } },
  });

  // 2. Alle User: points + rankPoints auf 0 setzen
  await prisma.user.updateMany({ data: { points: 0, rankPoints: 0 } });

  // Transaktionen die rankPoints geben (LUL + Turnier-Platzierungen)
  // Diese zählen NICHT zu den Münzen (user.points)
  const rankKeywords = ["Turnier", "turnier", "Match gewonnen", "Top-3", "Finale", "LUL Spieltag"];
  const rankPattern  = rankKeywords.map(k => ({ reason: { contains: k } }));

  // 3a. Münzen-Transaktionen (alles AUSSER LUL + Turnier-Platzierungen)
  const coinSums = await prisma.pointTransaction.groupBy({
    by:    ["userId"],
    where: { NOT: { OR: rankPattern } },
    _sum:  { amount: true },
  });

  // 3b. Rang-Punkte-Transaktionen (nur LUL + Turnier-Platzierungen)
  const rankSums = await prisma.pointTransaction.groupBy({
    by:    ["userId"],
    where: { OR: rankPattern },
    _sum:  { amount: true },
  });

  const rankMap = new Map(rankSums.map(r => [r.userId, r._sum.amount ?? 0]));
  const coinMap = new Map(coinSums.map(r => [r.userId, r._sum.amount ?? 0]));

  // Alle betroffenen UserIds sammeln
  const allUserIds = new Set([...coinMap.keys(), ...rankMap.keys()]);

  // 4. User-Balances aktualisieren
  if (allUserIds.size > 0) {
    await Promise.all(
      Array.from(allUserIds).map(userId =>
        prisma.user.update({
          where: { id: userId },
          data:  {
            points:     Math.max(0, coinMap.get(userId) ?? 0),
            rankPoints: Math.max(0, rankMap.get(userId) ?? 0),
          },
        })
      )
    );
  }

  const sums = Array.from(allUserIds).map(userId => ({ userId }));

  return NextResponse.json({
    ok: true,
    deletedTransactions: deleted,
    affectedUsers:       sums.length,
  });
}
