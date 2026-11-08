import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getTwitchUser } from "@/lib/twitch";
import { awardProfileCompletionIfNeeded } from "@/lib/profile-completion-award";
import { claimPendingClipRewards, findUserForTwitch } from "@/lib/clip-rewards";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { twitchLogin } = (await req.json()) as { twitchLogin: string | null };

  if (twitchLogin) {
    const login = twitchLogin.trim().toLowerCase();
    const twitchUser = await getTwitchUser(login);
    if (!twitchUser) return NextResponse.json({ error: "Twitch-Kanal nicht gefunden" }, { status: 404 });

    // Bereits einem anderen Konto zugeordnet (Profil oder Admin-Verknüpfung für Clip-Gewinne)?
    const owner = await findUserForTwitch({ login, id: twitchUser.id });
    if (owner && owner !== me.id) {
      return NextResponse.json({ error: "Dieser Twitch-Account ist bereits einem anderen Konto zugeordnet" }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { twitchLogin: login, twitchUserId: twitchUser.id },
    });
    await awardProfileCompletionIfNeeded(me.id, "PROFILE_TWITCH");

    // Vorgemerkte Clip-des-Monats/-Jahres-Gewinne dieses Twitch-Accounts auszahlen
    const clipRewards = await claimPendingClipRewards(me.id).catch(() => ({ claimed: 0, coins: 0 }));

    return NextResponse.json({
      twitchLogin: login,
      logoUrl: twitchUser.profile_image_url,
      displayName: twitchUser.display_name,
      clipRewardCoins: clipRewards.coins,
    });
  }

  await prisma.user.update({ where: { id: me.id }, data: { twitchLogin: null, twitchUserId: null } });
  return NextResponse.json({ twitchLogin: null });
}
