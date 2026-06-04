import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { color } = await req.json(); // hex string or null to reset

  if (color !== null) {
    const owned = await prisma.shopPurchase.findFirst({
      where: { userId, item: { type: "name_color", value: color } },
    });
    if (!owned) return NextResponse.json({ error: "Farbe nicht besessen" }, { status: 403 });
  }

  await prisma.user.update({ where: { id: userId }, data: { nameColor: color } });
  return NextResponse.json({ ok: true });
}
