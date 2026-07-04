import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveStreams } from "@/lib/twitch";

export const revalidate = 60;

export async function GET() {
  const [allUsers, partners] = await Promise.all([
    prisma.user.findMany({
      where: { twitchLogin: { not: null } },
      select: { id: true, name: true, username: true, image: true, twitchLogin: true },
    }),
    prisma.partner.findMany({
      where: { isActive: true },
      select: { twitchLogin: true },
    }),
  ]);

  const partnerLogins = new Set(partners.map((p) => p.twitchLogin.toLowerCase()));
  const users = allUsers.filter((u) => !partnerLogins.has(u.twitchLogin!.toLowerCase()));

  if (users.length === 0) return NextResponse.json([]);

  const logins = users.map((u) => u.twitchLogin!);
  const streams = await getLiveStreams(logins);

  const result = streams.map((s) => {
    const user = users.find((u) => u.twitchLogin?.toLowerCase() === s.user_login.toLowerCase());
    return {
      ...s,
      userId: user?.id,
      displayName: user?.username ?? user?.name ?? s.user_name,
      avatar: user?.image ?? "",
      thumbnail_url: s.thumbnail_url.replace("{width}", "440").replace("{height}", "248"),
    };
  });

  return NextResponse.json(result);
}
