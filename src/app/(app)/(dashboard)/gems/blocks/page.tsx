// ============================================
// /gems/blocks — OMA Blocks Solo (Marathon)
// ============================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { seasonKey, seasonLabel } from "@/lib/month-season";
import { ALL_TIME } from "@/lib/blocks/scores";
import BlocksSoloClient from "@/components/blocks/BlocksSoloClient";

export const metadata = {
  title: "OMA Blocks | Games | OMA",
};

export default async function BlocksSoloPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=/gems/blocks");
  const userId = session.user.id;
  const season = seasonKey();

  const bests = await prisma.blocksBest.findMany({
    where: { userId, season: { in: [season, ALL_TIME] } },
    select: { season: true, score: true },
  });

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto animate-fade-in">
      <BlocksSoloClient
        initialMonthBest={bests.find((b) => b.season === season)?.score ?? 0}
        initialAllTimeBest={bests.find((b) => b.season === ALL_TIME)?.score ?? 0}
        seasonLabel={seasonLabel(season)}
      />
    </div>
  );
}
