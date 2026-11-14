import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { recalculateTiedEventPredictions } from "@/lib/predictions";

/**
 * POST /api/admin/predictions/recalculate-ties  { dryRun: boolean }
 * Wertet die Sieger-Tipps aller abgeschlossenen Events mit Gleichstand auf Platz 1 nach der
 * aktuellen Regel neu aus (jeder Tipp auf einen der Erstplatzierten ist richtig). Ohne
 * Benachrichtigungen; dryRun liefert nur, was sich ändern würde.
 */
export async function POST(req: NextRequest) {
  await requireRole("admin");
  const { dryRun = true } = await req.json().catch(() => ({})) as { dryRun?: boolean };
  const report = await recalculateTiedEventPredictions({ dryRun: dryRun !== false });

  const userIds = [...new Set(report.flatMap(e => [...e.winnerUserIds, ...e.changes.flatMap(c => [c.userId, c.predictedUserId])]))];
  const names = new Map((await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true },
  })).map(u => [u.id, u.username ?? u.name ?? "?"]));
  const nm = (id: string) => names.get(id) ?? "?";

  return NextResponse.json({
    dryRun: dryRun !== false,
    events: report.map(e => ({
      eventId: e.eventId,
      title: e.title,
      startAt: e.startAt,
      winners: e.winnerUserIds.map(nm),
      predictionCount: e.predictionCount,
      changes: e.changes.map(c => ({
        user: nm(c.userId),
        predicted: nm(c.predictedUserId),
        wager: c.wager,
        before: c.before,
        after: c.after,
      })),
    })),
  });
}
