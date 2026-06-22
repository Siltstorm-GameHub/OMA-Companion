import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendPushToUsers } from "@/lib/push";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("admin");
  const session = await auth();
  const adminId = (session?.user as { id?: string })?.id;
  if (!adminId) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id: badgeId } = await params;
  const body = await req.json() as { userId?: string; note?: string };

  if (!body.userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  const [badge, user] = await Promise.all([
    prisma.customBadge.findUnique({ where: { id: badgeId } }),
    prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, name: true, username: true, points: true } }),
  ]);

  if (!badge) return NextResponse.json({ error: "Abzeichen nicht gefunden" }, { status: 404 });
  if (!user)  return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  // Upsert – already awarded is idempotent (no double coins)
  const existing = await prisma.userCustomBadge.findUnique({
    where: { userId_customBadgeId: { userId: user.id, customBadgeId: badgeId } },
  });
  if (existing) return NextResponse.json({ error: "Abzeichen wurde diesem Nutzer bereits vergeben" }, { status: 409 });

  await prisma.$transaction(async tx => {
    await tx.userCustomBadge.create({
      data: {
        userId:        user.id,
        customBadgeId: badgeId,
        awardedBy:     adminId,
        note:          body.note?.trim() || null,
      },
    });

    if (badge.coins > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: badge.coins } },
      });
      await tx.pointTransaction.create({
        data: { userId: user.id, amount: badge.coins, reason: `[Münzen] Abzeichen: ${badge.name}` },
      });
    }
  });

  const userName = user.name ?? user.username ?? user.id;

  sendPushToUsers([user.id], {
    title: `${badge.icon} Neues Abzeichen erhalten!`,
    body:  `„${badge.name}" — ${badge.desc}`,
    url:   "/profile",
  }).catch(() => {});

  return NextResponse.json({ ok: true, userName });
}
