import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { message } = await req.json();

  const owned = await prisma.shopPurchase.findFirst({
    where: { userId, item: { type: "status_message" } },
  });
  if (!owned) return NextResponse.json({ error: "Status-Nachricht nicht freigeschaltet" }, { status: 403 });

  const trimmed = typeof message === "string" ? message.trim().slice(0, 60) : null;
  await prisma.user.update({ where: { id: userId }, data: { statusMessage: trimmed || null } });
  return NextResponse.json({ ok: true });
}
