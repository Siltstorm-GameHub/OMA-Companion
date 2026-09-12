import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lese-Zugriff auf den Accessoire-Katalog für jeden eingeloggten Nutzer — der
// Baukasten braucht diese Liste zur Laufzeit, um ausrüstbare Items pro
// Kategorie (slot) anzuzeigen. Posen-unabhängig -- Platzierung kommt aus
// HeroPoseSlot (siehe /api/hero-pose-slots).
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const slot = req.nextUrl.searchParams.get("slot");

  const items = await prisma.heroAccessory.findMany({
    where: slot ? { slot } : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slot: true, imageUrl: true, width: true, height: true },
  });

  return NextResponse.json({ items });
}
