import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: eventId } = await params;
  const { userIds } = await req.json();
  if (!userIds?.length) return NextResponse.json({ error: "Keine User angegeben" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });

  let added = 0, skipped = 0;
  for (const userId of userIds) {
    const exists = await prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (exists) { skipped++; continue; }
    await prisma.eventRegistration.create({ data: { userId, eventId } });
    added++;
  }
  return NextResponse.json({ success: true, added, skipped });
}
