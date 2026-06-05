import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      pointTransactions: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { eventRegistrations: true, tournamentParticipants: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  return NextResponse.json(user);
}
