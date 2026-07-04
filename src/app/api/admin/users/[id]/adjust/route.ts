import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { syncDiscordRole } from "@/lib/discord-roles";

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
    reasonCoins?:  string;
    reasonRank?:   string;
  };

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, points: true, rankPoints: true, discordId: true },
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

    // Korrekturbuchung für Münzen
    if (body.coins !== undefined && !body.clearHistory) {
      const delta = newCoins - user.points;
      if (delta !== 0) {
        const reason = body.reasonCoins
          ? `⚙️ ${body.reasonCoins}`
          : "⚙️ Admin-Korrektur (Münzen)";
        await tx.pointTransaction.create({ data: { userId, amount: delta, reason } });
      }
    } else if (body.coins !== undefined && body.clearHistory && newCoins > 0) {
      const reason = body.reasonCoins
        ? `⚙️ ${body.reasonCoins}`
        : "⚙️ Admin-Festlegung (Münzen)";
      await tx.pointTransaction.create({ data: { userId, amount: newCoins, reason } });
    }

    // Korrekturbuchung für Rang-Punkte (nur als Nachweis in der Historie)
    if (body.rankPoints !== undefined && !body.clearHistory) {
      const delta = newRankPoints - user.rankPoints;
      if (delta !== 0) {
        const reason = body.reasonRank
          ? `⚙️ ${body.reasonRank}`
          : "⚙️ Admin-Korrektur (Rang-Punkte)";
        await tx.pointTransaction.create({ data: { userId, amount: delta, reason } });
      }
    } else if (body.rankPoints !== undefined && body.clearHistory && newRankPoints > 0) {
      const reason = body.reasonRank
        ? `⚙️ ${body.reasonRank}`
        : "⚙️ Admin-Festlegung (Rang-Punkte)";
      await tx.pointTransaction.create({ data: { userId, amount: newRankPoints, reason } });
    }
  });

  const updated = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, points: true, rankPoints: true },
  });

  // Notification bei Münzen-Änderung (nur bei Erhalt, nicht bei Abzug)
  const coinsDelta = (body.coins ?? user.points) - user.points;
  if (coinsDelta > 0) {
    const reason = body.reasonCoins ? body.reasonCoins : "Admin-Korrektur";
    createNotification(userId, {
      type:  "coins",
      title: `💰 +${coinsDelta} Münzen erhalten`,
      body:  reason,
      url:   "/profile",
    }).catch(() => {});
  }
  const rankDelta = (body.rankPoints ?? user.rankPoints) - user.rankPoints;
  if (rankDelta > 0) {
    const reason = body.reasonRank ? body.reasonRank : "Admin-Korrektur";
    createNotification(userId, {
      type:  "points",
      title: `⭐ +${rankDelta} Rang-Punkte erhalten`,
      body:  reason,
      url:   "/leaderboard",
    }).catch(() => {});
  }

  // Discord-Rolle synchronisieren wenn rankPoints sich geändert haben
  if (body.rankPoints !== undefined) {
    syncDiscordRole(userId, user.discordId, user.rankPoints, updated?.rankPoints ?? user.rankPoints).catch(() => {});
  }

  return NextResponse.json({ ok: true, user: updated });
}
