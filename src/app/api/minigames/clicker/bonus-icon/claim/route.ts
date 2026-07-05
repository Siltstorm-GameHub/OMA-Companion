import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { rollBonusIconCoins, todayStr } from "@/lib/clicker";

const GENRE_LABELS: Record<string, string> = {
  arcade: "Arcade", beat_em_up: "Beat-em-Up", sport: "Sport",
  racing: "Racing", shooter: "Shooter", community: "Community",
};

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const config = await getMinigamesConfig();
  if (!config.clickerEnabled) return NextResponse.json({ error: "Idle-Clicker ist zurzeit deaktiviert" }, { status: 403 });

  const progress = await prisma.dailyClickerProgress.findUnique({
    where: { userId_date: { userId, date: todayStr() } },
  });

  const isActive = progress?.bonusIconExpiresAt && progress.bonusIconExpiresAt > new Date() && !progress.bonusIconClaimed;
  if (!progress || !isActive) {
    return NextResponse.json({ error: "Kein aktives Bonus-Icon" }, { status: 409 });
  }

  const remainingCap = Math.max(0, config.clickerDailyCap - progress.coinsToday);
  const earned = Math.min(rollBonusIconCoins(), remainingCap);
  const genre = progress.bonusIconGenre ?? "arcade";

  await prisma.$transaction([
    prisma.dailyClickerProgress.update({
      where: { id: progress.id },
      data: {
        bonusIconClaimed: true,
        coinsToday: { increment: earned },
        flushedCoins: { increment: earned },
      },
    }),
    ...(earned > 0 ? [
      prisma.user.update({ where: { id: userId }, data: { points: { increment: earned } } }),
      prisma.pointTransaction.create({
        data: { userId, amount: earned, reason: `🎁 Bonus-Icon gefangen: ${GENRE_LABELS[genre] ?? genre}` },
      }),
    ] : []),
  ]);

  return NextResponse.json({ ok: true, earned, genre });
}
