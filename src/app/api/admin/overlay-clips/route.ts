import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  getClipPoolWithRestrictions, getMatureGames, invalidateClipBlocks, invalidateMatureGames,
} from "@/lib/overlay-clips";

/**
 * Moderation des Community-Clip-Loops: alle Clips der teilnehmenden Kanäle mit Grund, falls sie
 * nicht laufen (ausgeschlossen, Kanal mit Inhaltskennzeichnung, Spiel ab 18), plus die Liste der
 * gesperrten Spiele.
 */
export async function GET() {
  await requireRole("moderator");
  const [{ clips, labelledChannels }, mature] = await Promise.all([getClipPoolWithRestrictions(), getMatureGames()]);
  return NextResponse.json({
    clips: [...clips].sort((a, b) => b.views - a.views),
    labelledChannels,
    matureGames: [...mature].map(([gameId, g]) => ({ gameId, ...g })).sort((a, b) => a.name.localeCompare(b.name)),
  });
}

/** PUT { clipId, blocked } oder { gameId, gameName, mature } */
export async function PUT(req: NextRequest) {
  const user = await requireRole("moderator");
  const body = await req.json().catch(() => null) as
    { clipId?: unknown; blocked?: unknown; gameId?: unknown; gameName?: unknown; mature?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

  if (typeof body.gameId === "string" && body.gameId) {
    if (body.mature === true) {
      const name = typeof body.gameName === "string" && body.gameName ? body.gameName.slice(0, 120) : body.gameId;
      await prisma.overlayMatureGame.upsert({
        where: { gameId: body.gameId },
        create: { gameId: body.gameId, name, source: "admin" },
        update: {},
      });
    } else {
      await prisma.overlayMatureGame.deleteMany({ where: { gameId: body.gameId } });
    }
    invalidateMatureGames();
    return NextResponse.json({ ok: true });
  }

  if (typeof body.clipId !== "string") return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  const clip = (await getClipPoolWithRestrictions()).clips.find(c => c.id === body.clipId);
  if (body.blocked === true) {
    if (!clip) return NextResponse.json({ error: "Clip nicht im Pool" }, { status: 404 });
    await prisma.overlayClipBlock.upsert({
      where: { clipId: clip.id },
      create: { clipId: clip.id, broadcasterLogin: clip.channelLogin, blockedByUserId: user.id },
      update: { blockedByUserId: user.id },
    });
  } else {
    await prisma.overlayClipBlock.deleteMany({ where: { clipId: body.clipId } });
  }
  invalidateClipBlocks();
  return NextResponse.json({ ok: true });
}
