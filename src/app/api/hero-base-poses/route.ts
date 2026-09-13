import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lese-Zugriff für jeden eingeloggten Nutzer -- der Baukasten und die
// Kartenkunst-Zusammensetzung brauchen die Basis-Posen zur Laufzeit.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const archetypeId = req.nextUrl.searchParams.get("archetypeId");
  const poseKey = req.nextUrl.searchParams.get("poseKey");

  const items = await prisma.heroBasePose.findMany({
    where: {
      ...(archetypeId ? { archetypeId } : {}),
      ...(poseKey ? { poseKey } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, archetypeId: true, poseKey: true, name: true, imageUrl: true, width: true, height: true },
  });

  return NextResponse.json({ items });
}
