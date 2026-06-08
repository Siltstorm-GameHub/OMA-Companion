import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/users/[id]/adjust
 * Body: {
 *   coins?:         number   – neuer Münzen-Stand (user.points)
 *   rankPoints?:    number   – neuer Rang-Punkte-Stand (user.rankPoints)
 *   clearHistory?:  boolean  – alle Transaktionen dieses Users löschen
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("admin");
  const { id: userId } = await params;
  const body = await req.json() as {
    coins?:        number;
    rankPoints?:   number;
    clearHistory?: boolean;
  };

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, points: true, rankPoints: true },
  });
  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  await prisma.$transaction(async tx => {
    // Transaktionen löschen (optional)
    if (body.clearHistory) {
      await tx.pointTransaction.deleteMany({ where: { userId } });
    }

    // Münzen anpassen
    const newCoins      = body.coins      !== undefined ? Math.max(0, body.coins)      : user.points;
    const newRankPoints = body.rankPoints !== undefined ? Math.max(0, body.rankPoints) : user.rankPoints;

    await tx.user.update({
      where: { id: userId },
      data:  { points: newCoins, rankPoints: newRankPoints },
    });

    // Korrekturbuchung für Münzen (damit die Historie stimmt)
    if (body.coins !== undefined && !body.clearHistory) {
      const delta = newCoins - user.points;
      if (delta !== 0) {
        await tx.pointTransaction.create({
          data: { userId, amount: delta, reason: "⚙️ Admin-Korrektur (Münzen)" },
        });
      }
    } else if (body.coins !== undefined && body.clearHistory && newCoins > 0) {
      // Startbuchung nach Löschen der Historie
      await tx.pointTransaction.create({
        data: { userId, amount: newCoins, reason: "⚙️ Admin-Festlegung (Münzen)" },
      });
    }

    // Korrekturbuchung für Rang-Punkte
    if (body.rankPoints !== undefined && !body.clearHistory) {
      const delta = newRankPoints - user.rankPoints;
      if (delta !== 0) {
        await tx.pointTransaction.create({
          data: { userId, amount: delta, reason: "⚙️ Admin-Korrektur (Rang-Punkte)" },
        });
      }
    } else if (body.rankPoints !== undefined && body.clearHistory && newRankPoints > 0) {
      await tx.pointTransaction.create({
        data: { userId, amount: newRankPoints, reason: "⚙️ Admin-Festlegung (Rang-Punkte)" },
      });
    }
  });

  const updated = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, points: true, rankPoints: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
