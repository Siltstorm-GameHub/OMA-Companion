import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Täglich 18:00 CET (= 17:00 UTC) — definiert in vercel.json
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

const DISCORD_REASONS = new Set([
  "Stunde im Sprachkanal 🎙",
  "Täglich im Voice aktiv",
  "10 Nachrichten gesendet",
  "Täglich im Chat aktiv",
  "Reaktion erhalten",
]);

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Alle heutigen Discord-Aktivitäts-Transaktionen laden
  const transactions = await prisma.pointTransaction.findMany({
    where: {
      createdAt: { gte: today },
      reason: {
        // Münzen-Transaktionen haben das Präfix "[Münzen] "
        in: [...DISCORD_REASONS].map((r) => `[Münzen] ${r}`),
      },
    },
    select: { userId: true, amount: true },
  });

  if (!transactions.length) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Summe pro User berechnen
  const sumByUser = new Map<string, number>();
  for (const tx of transactions) {
    sumByUser.set(tx.userId, (sumByUser.get(tx.userId) ?? 0) + tx.amount);
  }

  // Je User eine Benachrichtigung erstellen
  let notified = 0;
  for (const [userId, total] of sumByUser) {
    await createNotification(userId, {
      type:  "coins",
      title: "Heutige Discord-Aktivität",
      body:  `Du hast heute +${total} Münzen durch deine Discord-Aktivität verdient 🎙💬`,
      url:   "/profile",
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
