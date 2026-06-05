import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GIFT_MIN, GIFT_MAX_SINGLE, GIFT_MONTHLY_LIMIT } from "@/lib/shop";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const senderId = session.user.id;

  const { recipientId, amount } = await req.json();

  if (!recipientId || !amount) return NextResponse.json({ error: "Empfänger und Betrag erforderlich" }, { status: 400 });
  if (recipientId === senderId)  return NextResponse.json({ error: "Du kannst dir nicht selbst Punkte schicken" }, { status: 400 });

  const pts = Number(amount);
  if (!Number.isInteger(pts) || pts < GIFT_MIN)        return NextResponse.json({ error: `Mindestbetrag: ${GIFT_MIN} Punkte` }, { status: 400 });
  if (pts > GIFT_MAX_SINGLE)                           return NextResponse.json({ error: `Maximum pro Überweisung: ${GIFT_MAX_SINGLE} Punkte` }, { status: 400 });

  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId },    select: { points: true, name: true, username: true } }),
    prisma.user.findUnique({ where: { id: recipientId }, select: { id: true,   name: true, username: true } }),
  ]);

  if (!sender)    return NextResponse.json({ error: "Sender nicht gefunden" }, { status: 404 });
  if (!recipient) return NextResponse.json({ error: "Empfänger nicht gefunden" }, { status: 404 });
  if (sender.points < pts) return NextResponse.json({ error: "Nicht genug Punkte" }, { status: 400 });

  // Monatliches Limit prüfen
  const now       = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySum = await prisma.pointTransaction.aggregate({
    where: { userId: senderId, reason: { startsWith: "Punkte verschenkt" }, createdAt: { gte: monthStart } },
    _sum:  { amount: true },
  });
  const alreadyGifted = Math.abs(monthlySum._sum.amount ?? 0);
  if (alreadyGifted + pts > GIFT_MONTHLY_LIMIT) {
    return NextResponse.json({
      error: `Monatliches Limit erreicht (${GIFT_MONTHLY_LIMIT} Punkte). Noch ${GIFT_MONTHLY_LIMIT - alreadyGifted} verfügbar.`,
    }, { status: 400 });
  }

  const senderName    = sender.username    ?? sender.name    ?? "Jemand";
  const recipientName = recipient.username ?? recipient.name ?? "Unbekannt";

  await prisma.$transaction([
    prisma.user.update({ where: { id: senderId    }, data: { points: { decrement: pts } } }),
    prisma.user.update({ where: { id: recipientId }, data: { points: { increment: pts } } }),
    prisma.pointTransaction.create({ data: { userId: senderId,    amount: -pts, reason: `Punkte verschenkt an ${recipientName}` } }),
    prisma.pointTransaction.create({ data: { userId: recipientId, amount:  pts, reason: `Punkte erhalten von ${senderName}` } }),
  ]);

  return NextResponse.json({ ok: true, recipientName, amount: pts });
}
