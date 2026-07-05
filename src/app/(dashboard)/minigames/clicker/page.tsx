import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { levelForTotalClicks, clicksRequiredForLevel, coinsPerClickForLevel, todayStr } from "@/lib/clicker";
import ClickerGame from "./ClickerGame";

export default async function ClickerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const config = await getMinigamesConfig();

  const [progress, profile] = await Promise.all([
    prisma.dailyClickerProgress.findUnique({ where: { userId_date: { userId, date: todayStr() } } }),
    prisma.clickerProfile.findUnique({ where: { userId } }),
  ]);

  const totalClicks = profile?.totalClicks ?? 0;
  const level = levelForTotalClicks(totalClicks);
  const bonusActive = !!progress?.bonusIconExpiresAt && progress.bonusIconExpiresAt > new Date() && !progress.bonusIconClaimed;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link href="/minigames" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Minigames
      </Link>

      {!config.clickerEnabled ? (
        <div className="glass rounded-2xl p-10 text-center text-gray-400">
          Der Idle-Clicker ist zurzeit deaktiviert.
        </div>
      ) : (
        <ClickerGame
          initial={{
            clicksToday: progress?.clicksToday ?? 0,
            coinsToday: progress?.coinsToday ?? 0,
            cap: config.clickerDailyCap,
            level,
            totalClicks,
            nextLevelAt: clicksRequiredForLevel(level + 1),
            coinsPerClick: coinsPerClickForLevel(level),
            bonusIcon: bonusActive
              ? { genre: progress!.bonusIconGenre!, expiresAt: progress!.bonusIconExpiresAt!.toISOString() }
              : null,
          }}
        />
      )}
    </div>
  );
}
