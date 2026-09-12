import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lese-Zugriff auf den Accessoire-Katalog für jeden eingeloggten Nutzer — der
// Baukasten und die Karten-Zusammensetzung brauchen diese Liste zur Laufzeit,
// um ausrüstbare Items pro Basis-Pose/Kategorie anzuzeigen.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const basePoseId = req.nextUrl.searchParams.get("basePoseId");
  const slot = req.nextUrl.searchParams.get("slot");

  const items = await prisma.heroAccessory.findMany({
    where: {
      ...(basePoseId ? { basePoseId } : {}),
      ...(slot ? { slot } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slot: true, imageUrl: true, width: true, height: true, basePoseId: true, anchorX: true, anchorY: true },
  });

  return NextResponse.json({ items });
}
