import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/lobby?after=<ISO>  →  letzte 50 Nachrichten (oder neue seit Timestamp)
export async function GET(req: NextRequest) {
  const after = req.nextUrl.searchParams.get("after");

  const messages = await prisma.lobbyMessage.findMany({
    where: after ? { createdAt: { gt: new Date(after) } } : undefined,
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  });

  return NextResponse.json(messages);
}

// POST /api/lobby  →  Nachricht senden (Auth erforderlich)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content || content.length > 500) {
    return NextResponse.json({ error: "Ungültiger Inhalt" }, { status: 400 });
  }

  // Einfaches Rate-Limit: max. 1 Nachricht pro 2 Sekunden
  const recent = await prisma.lobbyMessage.findFirst({
    where: {
      userId: session.user.id,
      createdAt: { gt: new Date(Date.now() - 2000) },
    },
  });
  if (recent) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  const message = await prisma.lobbyMessage.create({
    data: { content, userId: session.user.id },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
