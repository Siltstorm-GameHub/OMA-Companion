// ============================================
// /gems/spielen — OMA Gems, klassischer Modus (Level mit Zielen)
// ============================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { seasonKey, seasonLabel } from "@/lib/month-season";
import { classicMonthBoard } from "@/lib/gems/scores";
import GemsGameClient from "@/components/gems/GemsGameClient";

export const metadata = {
  title: "OMA Gems | Games | OMA",
};

export default async function GemsClassicPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=/gems/spielen");
  const season = seasonKey();
  const best = await prisma.gemsBest.findUnique({
    where: { userId_board: { userId: session.user.id, board: classicMonthBoard(season) } },
    select: { score: true },
  });

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto animate-fade-in">
      <GemsGameClient
        mode="classic"
        title="OMA Gems"
        subtitle="Klassisch · Level für Level"
        bestLabel={`Bestwert im ${seasonLabel(season)}`}
        initialBest={best?.score ?? 0}
      />
    </div>
  );
}
