import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBlockedClipIds, getChannelClips, invalidateClipBlocks, invalidateClipPool } from "@/lib/overlay-clips";

/** Eigene Clips im Community-Clip-Loop: abmelden/wieder anmelden und einzelne Clips ausschließen. */

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, twitchLogin: true, overlayClipsOptOut: true } });
}

/** `optIn` = Clips laufen im Loop (Standard), gespeichert wird die Abmeldung (overlayClipsOptOut). */
async function describe(user: { twitchLogin: string | null; overlayClipsOptOut: boolean }) {
  if (!user.twitchLogin) return { optIn: !user.overlayClipsOptOut, clips: [] };
  const [clips, blocked] = await Promise.all([getChannelClips(user.twitchLogin), getBlockedClipIds()]);
  return {
    optIn: !user.overlayClipsOptOut,
    clips: [...clips].sort((a, b) => b.views - a.views).map(c => ({ ...c, blocked: blocked.has(c.id) })),
  };
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!user.twitchLogin) return NextResponse.json({ error: "Kein Twitch-Konto hinterlegt", code: "NO_TWITCH" }, { status: 400 });
  return NextResponse.json(await describe(user));
}

/**
 * PUT { optIn?: boolean } oder { clipId: string, blocked: boolean } — nur Clips des eigenen Kanals.
 * Eine Sperre durch Moderatoren kann der Inhaber nicht aufheben (sie bleibt bestehen).
 */
export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!user.twitchLogin) return NextResponse.json({ error: "Kein Twitch-Konto hinterlegt", code: "NO_TWITCH" }, { status: 400 });
  const body = await req.json().catch(() => null) as { optIn?: unknown; clipId?: unknown; blocked?: unknown } | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

  if ("optIn" in body) {
    const optOut = body.optIn !== true;
    await prisma.user.update({ where: { id: user.id }, data: { overlayClipsOptOut: optOut } });
    user.overlayClipsOptOut = optOut;
    invalidateClipPool();
  }

  if (typeof body.clipId === "string") {
    const login = user.twitchLogin.toLowerCase();
    const own = (await getChannelClips(login)).some(c => c.id === body.clipId);
    if (!own) return NextResponse.json({ error: "Das ist kein Clip deines Kanals" }, { status: 403 });
    if (body.blocked === true) {
      await prisma.overlayClipBlock.upsert({
        where: { clipId: body.clipId },
        create: { clipId: body.clipId, broadcasterLogin: login, blockedByUserId: user.id },
        update: {},
      });
    } else {
      const existing = await prisma.overlayClipBlock.findUnique({ where: { clipId: body.clipId } });
      if (existing && existing.blockedByUserId !== user.id) {
        return NextResponse.json({ error: "Dieser Clip wurde von der Moderation ausgeschlossen" }, { status: 403 });
      }
      await prisma.overlayClipBlock.deleteMany({ where: { clipId: body.clipId } });
    }
    invalidateClipBlocks();
  }

  return NextResponse.json(await describe(user));
}
