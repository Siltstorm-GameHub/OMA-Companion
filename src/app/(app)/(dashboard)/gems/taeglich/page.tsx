// ============================================
// /gems/taeglich — OMA Gems, Tages-Herausforderung (ein Brett für alle, 30 Züge)
// ============================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { berlinDayKey, dayLabel } from "@/lib/month-season";
import { dailyBoard } from "@/lib/gems/scores";
import GemsGameClient from "@/components/gems/GemsGameClient";

export const metadata = {
  title: "Tages-Herausforderung | OMA Gems | OMA",
};

export const dynamic = "force-dynamic";

export default async function GemsDailyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=/gems/taeglich");
  const day = berlinDayKey();
  const best = await prisma.gemsBest.findUnique({
    where: { userId_board: { userId: session.user.id, board: dailyBoard(day) } },
    select: { score: true },
  });

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto animate-fade-in">
      <GemsGameClient
        mode="daily"
        title="Tages-Herausforderung"
        subtitle={`${dayLabel(day)} · 30 Züge`}
        bestLabel="Dein Bestwert heute"
        initialBest={best?.score ?? 0}
      />
    </div>
  );
}
