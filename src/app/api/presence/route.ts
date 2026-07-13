import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Nutzer gilt als "aktiv", wenn er innerhalb dieses Zeitfensters einen Heartbeat gesendet hat
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

// GET /api/presence  →  Anzahl + Liste aktiver Nutzer
export async function GET() {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const users = await prisma.user.findMany({
    where: { lastActiveAt: { gt: since } },
    orderBy: { lastActiveAt: "desc" },
    select: { id: true, name: true, username: true, image: true },
  });

  return NextResponse.json({ count: users.length, users });
}

// POST /api/presence  →  Heartbeat (Auth erforderlich)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
