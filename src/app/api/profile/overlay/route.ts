import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserOverlayToken, buildProfileOverlaySettingsUrl } from "@/lib/overlay";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { twitchLogin: true } });
  if (!user?.twitchLogin) {
    return NextResponse.json({ error: "Kein Twitch-Konto hinterlegt", code: "NO_TWITCH" }, { status: 400 });
  }

  const token = await ensureUserOverlayToken(userId);
  return NextResponse.json({ overlayUrl: buildProfileOverlaySettingsUrl(userId, token) });
}
