import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lese-Zugriff auf den Accessoire-Katalog für jeden eingeloggten Nutzer — im
// Gegensatz zu /api/admin/hero-accessories (nur Admins) wird diese Liste vom
// Rig zur Laufzeit gebraucht, um ausrüstbare Items pro Slot anzuzeigen.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const slot = req.nextUrl.searchParams.get("slot");

  const items = await prisma.heroAccessory.findMany({
    where: slot ? { slot } : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slot: true, imageUrl: true, pivotX: true, pivotY: true },
  });

  return NextResponse.json({ items });
}
