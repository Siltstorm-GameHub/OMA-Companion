import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("admin");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, username: true, email: true,
      image: true, role: true, points: true,
      createdAt: true, discordId: true,
      _count: { select: { eventRegistrations: true, tournamentParticipants: true } },
    },
  });
  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const me = await requireRole("admin");
  const { userId, role } = await req.json();
  if (!["user", "moderator", "admin"].includes(role)) {
    return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
  }
  // Eigene Rolle nicht ändern — sonst sperrt man sich versehentlich selbst aus
  if (userId === me.id) {
    return NextResponse.json({ error: "Deine eigene Rolle kannst du nicht ändern" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, username: true, role: true },
  });
  return NextResponse.json(user);
}
