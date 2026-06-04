import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { activateTitle } from "@/lib/shop";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { title } = await req.json();

  // Prüfen ob Titel besessen wird (oder null = Titel entfernen)
  if (title !== null) {
    const owned = await prisma.shopPurchase.findFirst({
      where: { userId: session.user.id, item: { type: "title", value: title } },
    });
    if (!owned) return NextResponse.json({ error: "Titel nicht besessen" }, { status: 403 });
  }

  await activateTitle(session.user.id, title);
  return NextResponse.json({ ok: true });
}
