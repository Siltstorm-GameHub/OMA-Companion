import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const { clipUrl } = (await req.json()) as { clipUrl: string };

  if (!clipUrl?.includes("twitch.tv")) {
    return NextResponse.json({ error: "Nur Twitch-Clip-Links erlaubt" }, { status: 400 });
  }

  const sub = await prisma.eventClipSubmission.upsert({
    where: { eventId_userId: { eventId, userId: me.id } },
    update: { clipUrl },
    create: { eventId, userId: me.id, clipUrl },
  });

  return NextResponse.json(sub, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  await prisma.eventClipSubmission.deleteMany({ where: { eventId, userId: me.id } });
  return NextResponse.json({ ok: true });
}
