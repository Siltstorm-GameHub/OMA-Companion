import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lese-Zugriff für jeden eingeloggten Nutzer -- der Baukasten braucht Anker +
// Rotationswinkel pro Pose/Slot zur Laufzeit, um Accessoires zu plazieren.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const basePoseId = req.nextUrl.searchParams.get("basePoseId");
  if (!basePoseId) return NextResponse.json({ error: "basePoseId ist Pflicht" }, { status: 400 });

  const items = await prisma.heroPoseSlot.findMany({
    where: { basePoseId },
    select: { id: true, slot: true, anchorX: true, anchorY: true, rotation: true },
  });

  return NextResponse.json({ items });
}
