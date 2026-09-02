import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // Optionaler Filter für die Battle-Cards-Herausforderungs-Picker (OMA Duels + OMA
  // Gems): nur User mit AKTUELL gültiger Startaufstellung anzeigen (mind. 1 Karte
  // mit inLineup:true — dieselbe Bedingung wie buildBattleTeam und die Rangliste,
  // siehe leaderboard.ts) — sonst könnte man jemanden herausfordern, dessen Kampf
  // sich gar nicht starten lässt.
  const challengeable = req.nextUrl.searchParams.get("challengeable") === "1";

  const users = await prisma.user.findMany({
    where: {
      id:  { not: session.user.id }, // sich selbst ausschließen
      OR:  [
        { username: { contains: q, mode: "insensitive" } },
        { name:     { contains: q, mode: "insensitive" } },
      ],
      ...(challengeable && { battleCardUserCards: { some: { inLineup: true } } }),
    },
    select: { id: true, username: true, name: true, image: true, points: true, rankPoints: true },
    take: 8,
  });

  return NextResponse.json(users);
}
