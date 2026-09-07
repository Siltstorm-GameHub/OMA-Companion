import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { COIN_PREFIX, POINT_RULES, reasonVariants } from "@/lib/points";

// Reine Status-/Log-Ansicht fuers Touchscreen-Widget: das eigentliche Gutschreiben laeuft
// serverseitig im Cron (/api/cron/twitch-chat-coins), das Widget zeigt hier nur, was zuletzt
// vergeben wurde.
export async function GET(req: NextRequest) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const limitParam = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  const transactions = await prisma.pointTransaction.findMany({
    where: { reason: { in: reasonVariants(COIN_PREFIX, POINT_RULES.TWITCH_CHAT_ACTIVITY.reason) } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { username: true, name: true } } },
  });

  return NextResponse.json({
    entries: transactions.map((t) => ({
      id: t.id,
      username: t.user.username ?? t.user.name ?? "Unbekannt",
      amount: t.amount,
      createdAt: t.createdAt,
    })),
  });
}
