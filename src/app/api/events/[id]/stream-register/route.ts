import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureOverlayToken, buildOverlaySettingsUrl } from "@/lib/overlay";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  const userId = session.user.id;

  const streamer = await prisma.eventCommunityStreamer.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!streamer) return NextResponse.json({ error: "Nicht als Streamer angemeldet" }, { status: 403 });

  const token = await ensureOverlayToken(eventId);
  return NextResponse.json({ overlayUrl: buildOverlaySettingsUrl(eventId, token, userId) });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { twitchLogin: true } });
  if (!user?.twitchLogin) {
    return NextResponse.json({ error: "Kein Twitch-Konto hinterlegt", code: "NO_TWITCH" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, status: true } });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.status === "finished" || event.status === "closed") {
    return NextResponse.json({ error: "Event ist bereits beendet" }, { status: 400 });
  }

  const record = await prisma.eventCommunityStreamer.upsert({
    where:  { eventId_userId: { eventId, userId } },
    create: { eventId, userId },
    update: {},
    include: { user: { select: { id: true, name: true, username: true, image: true, twitchLogin: true } } },
  });

  const token = await ensureOverlayToken(eventId);
  return NextResponse.json({ ...record, overlayUrl: buildOverlaySettingsUrl(eventId, token, userId) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id: eventId } = await params;
  const userId = session.user.id;

  await prisma.eventCommunityStreamer.deleteMany({ where: { eventId, userId } });
  return NextResponse.json({ ok: true });
}
