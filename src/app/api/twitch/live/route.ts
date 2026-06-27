import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveStreams } from "@/lib/twitch";

export const revalidate = 60;

export async function GET() {
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  if (partners.length === 0) return NextResponse.json([]);

  const streams = await getLiveStreams(partners.map((p) => p.twitchLogin));

  const result = streams.map((s) => {
    const partner = partners.find((p) => p.twitchLogin.toLowerCase() === s.user_login.toLowerCase());
    return {
      ...s,
      partnerId: partner?.id,
      partnerName: partner?.name ?? s.user_name,
      logoUrl: partner?.logoUrl ?? "",
      twitchLogin: s.user_login,
      thumbnail_url: s.thumbnail_url.replace("{width}", "440").replace("{height}", "248"),
    };
  });

  return NextResponse.json(result);
}
