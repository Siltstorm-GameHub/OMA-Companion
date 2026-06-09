import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: spieltagId } = await params;

  const { role } = await req.json() as { role?: string };
  const entryRole = role === "spectator" ? "spectator" : "player";

  const spieltag = await prisma.lulSpieltag.findUnique({ where: { id: spieltagId } });
  if (!spieltag) return NextResponse.json({ error: "Spieltag nicht gefunden" }, { status: 404 });
  if (spieltag.status === "finished") return NextResponse.json({ error: "Spieltag bereits beendet" }, { status: 400 });

  await prisma.lulEntry.upsert({
    where:  { spieltagId_userId: { spieltagId, userId } },
    create: { spieltagId, userId, role: entryRole },
    update: { role: entryRole },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: spieltagId } = await params;

  await prisma.lulEntry.deleteMany({ where: { spieltagId, userId } });
  return NextResponse.json({ ok: true });
}
