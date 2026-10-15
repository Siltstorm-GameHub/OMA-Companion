import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getBlockedClipIds, getClipPool, invalidateClipBlocks } from "@/lib/overlay-clips";

/** Moderation des Community-Clip-Loops: alle freigegebenen Clips, einzelne ausschließen. */
export async function GET() {
  await requireRole("moderator");
  const [pool, blocked] = await Promise.all([getClipPool(), getBlockedClipIds()]);
  return NextResponse.json({
    clips: [...pool].sort((a, b) => b.views - a.views).map(c => ({ ...c, blocked: blocked.has(c.id) })),
  });
}

/** PUT { clipId, blocked } */
export async function PUT(req: NextRequest) {
  const user = await requireRole("moderator");
  const body = await req.json().catch(() => null) as { clipId?: unknown; blocked?: unknown } | null;
  if (!body || typeof body.clipId !== "string") return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

  const clip = (await getClipPool()).find(c => c.id === body.clipId);
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
