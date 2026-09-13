import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lese-Zugriff für jeden eingeloggten Nutzer -- der Baukasten zeigt Archetyp-
// Namen (nie den internen Klassen-Schlüssel) zur Auswahl an, jeweils mit
// ihren Posen für die Vorschau.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const items = await prisma.heroArchetype.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, classKey: true, name: true,
      basePoses: { select: { id: true, poseKey: true, name: true, imageUrl: true, width: true, height: true } },
    },
  });

  return NextResponse.json({ items });
}
