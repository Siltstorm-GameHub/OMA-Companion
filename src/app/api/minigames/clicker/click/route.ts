import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { updateQuestProgress } from "@/lib/quests";
import {
  clicksRequiredForLevel, coinsPerClickForLevel, levelForTotalClicks,
  rollBonusIconGenre, todayStr,
  FLUSH_EVERY_N_CLICKS, MIN_CLICK_INTERVAL_MS, BONUS_ICON_TTL_MS, BONUS_ICON_SPAWN_CHANCE,
} from "@/lib/clicker";

async function getOrCreateState(userId: string) {
  const date = todayStr();
  const [progress, profile] = await Promise.all([
    prisma.dailyClickerProgress.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date },
      update: {},
    }),
    prisma.clickerProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  ]);
  return { progress, profile };
}

/** Serverseitiges Bonus-Icon-Spawning: nur beim Poll/Klick geprüft, nie clientseitig entschieden. */
async function maybeSpawnBonusIcon(progressId: string, current: { bonusIconExpiresAt: Date | null; bonusIconClaimed: boolean }) {
  const isActive = current.bonusIconExpiresAt && current.bonusIconExpiresAt > new Date() && !current.bonusIconClaimed;
  if (isActive) return null;

  if (Math.random() > BONUS_ICON_SPAWN_CHANCE) return null;

  const genre = rollBonusIconGenre();
  const expiresAt = new Date(Date.now() + BONUS_ICON_TTL_MS);
  await prisma.dailyClickerProgress.update({
    where: { id: progressId },
    data: { bonusIconGenre: genre, bonusIconExpiresAt: expiresAt, bonusIconClaimed: false },
  });
  return { genre, expiresAt };
}

function serialize(progress: Awaited<ReturnType<typeof getOrCreateState>>["progress"], profile: Awaited<ReturnType<typeof getOrCreateState>>["profile"], cap: number) {
  const level = levelForTotalClicks(profile.totalClicks);
  const bonusIconActive = progress.bonusIconExpiresAt && progress.bonusIconExpiresAt > new Date() && !progress.bonusIconClaimed;
  return {
    clicksToday: progress.clicksToday,
    coinsToday: progress.coinsToday,
    cap,
    level,
    totalClicks: profile.totalClicks,
    nextLevelAt: clicksRequiredForLevel(level + 1),
    coinsPerClick: coinsPerClickForLevel(level),
    bonusIcon: bonusIconActive
      ? { genre: progress.bonusIconGenre, expiresAt: progress.bonusIconExpiresAt!.toISOString() }
      : null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const config = await getMinigamesConfig();
  if (!config.clickerEnabled) return NextResponse.json({ error: "Idle-Clicker ist zurzeit deaktiviert" }, { status: 403 });

  const { progress, profile } = await getOrCreateState(session.user.id);
  const spawned = await maybeSpawnBonusIcon(progress.id, progress);

  const state = serialize(progress, profile, config.clickerDailyCap);
  return NextResponse.json(spawned ? { ...state, bonusIcon: { genre: spawned.genre, expiresAt: spawned.expiresAt.toISOString() } } : state);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const config = await getMinigamesConfig();
  if (!config.clickerEnabled) return NextResponse.json({ error: "Idle-Clicker ist zurzeit deaktiviert" }, { status: 403 });

  const { progress, profile } = await getOrCreateState(userId);

  // Anti-Spam: Mindestabstand seit letztem gewerteten Klick
  const msSinceLastClick = Date.now() - progress.updatedAt.getTime();
  if (msSinceLastClick < MIN_CLICK_INTERVAL_MS) {
    return NextResponse.json({ ...serialize(progress, profile, config.clickerDailyCap), earned: 0, ignored: true });
  }

  const newTotalClicks = profile.totalClicks + 1;
  const oldLevel = levelForTotalClicks(profile.totalClicks);
  const newLevel = levelForTotalClicks(newTotalClicks);
  const leveledUp = newLevel > oldLevel;

  const coinsPerClick = coinsPerClickForLevel(newLevel);
  const remainingCap = Math.max(0, config.clickerDailyCap - progress.coinsToday);
  const earned = Math.min(coinsPerClick, remainingCap);

  const newClicksToday = progress.clicksToday + 1;
  const newCoinsToday = progress.coinsToday + earned;
  const unflushed = newCoinsToday - progress.flushedCoins;
  const shouldFlush = newClicksToday % FLUSH_EVERY_N_CLICKS === 0 && unflushed > 0;

  await prisma.$transaction([
    prisma.clickerProfile.update({ where: { userId }, data: { totalClicks: newTotalClicks, level: newLevel } }),
    prisma.dailyClickerProgress.update({
      where: { id: progress.id },
      data: {
        clicksToday: newClicksToday,
        coinsToday: newCoinsToday,
        ...(shouldFlush ? { flushedCoins: newCoinsToday } : {}),
      },
    }),
    ...(earned > 0 ? [prisma.user.update({ where: { id: userId }, data: { points: { increment: earned } } })] : []),
    ...(shouldFlush ? [prisma.pointTransaction.create({
      data: { userId, amount: unflushed, reason: "🖱️ Idle-Clicker" },
    })] : []),
  ]);

  // Quest-Fortschritt im selben Rhythmus wie der PointTransaction-Flush batchen,
  // statt bei 150ms Klick-Intervall auf jedem einzelnen Klick die DB zu treffen.
  if (shouldFlush) {
    updateQuestProgress(userId, "CLICKER_CLICKS", FLUSH_EVERY_N_CLICKS).catch(() => {});
  }

  return NextResponse.json({
    ...serialize(
      { ...progress, clicksToday: newClicksToday, coinsToday: newCoinsToday },
      { ...profile, totalClicks: newTotalClicks },
      config.clickerDailyCap
    ),
    earned,
    leveledUp,
  });
}
