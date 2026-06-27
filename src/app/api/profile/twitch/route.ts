import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getTwitchUser } from "@/lib/twitch";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { twitchLogin } = (await req.json()) as { twitchLogin: string | null };

  if (twitchLogin) {
    const login = twitchLogin.trim().toLowerCase();
    const twitchUser = await getTwitchUser(login);
    if (!twitchUser) return NextResponse.json({ error: "Twitch-Kanal nicht gefunden" }, { status: 404 });

    await prisma.user.update({
      where: { id: me.id },
      data: { twitchLogin: login },
    });
    return NextResponse.json({ twitchLogin: login, logoUrl: twitchUser.profile_image_url, displayName: twitchUser.display_name });
  }

  await prisma.user.update({ where: { id: me.id }, data: { twitchLogin: null } });
  return NextResponse.json({ twitchLogin: null });
}
