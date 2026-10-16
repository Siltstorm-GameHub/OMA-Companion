import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStoredBattleLog } from "@/lib/battle-cards/battle-log";
import BattleScreen from "@/components/battle-cards/BattleScreen";
import BattleResultBanner, { type BattleOutcome } from "@/components/battle-cards/BattleResultBanner";
import BattleStatsPanel from "@/components/battle-cards/BattleStatsPanel";

export const metadata = {
  title: "Kampf-Replay | OMA Gems | OMA",
};

// Replay eines beendeten Kampfs. Seit der Reduktion auf OMA Gems gibt es nur noch Kämpfe gegen
// Monster (Kampagne, Turnier) — einsehbar nur für den Spieler selbst.
export default async function BattleReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required");
  }
  const { id } = await params;

  const battle = await prisma.battle.findUnique({ where: { id } });
  if (!battle || !isStoredBattleLog(battle.battleLog)) notFound();
  if (battle.playerId !== session.user.id) notFound();

  const outcome: BattleOutcome = battle.result === "DRAW" ? "draw" : battle.result === "WIN" ? "win" : "loss";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/gems"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zu OMA Gems
      </Link>
      <BattleResultBanner outcome={outcome} />
      <BattleScreen roster={battle.battleLog.roster} log={battle.battleLog.log} />
      <BattleStatsPanel
        roster={battle.battleLog.roster}
        log={battle.battleLog.log}
        viewerTeamId="A"
        teamALabel="Dein Team"
        teamBLabel="Gegner"
      />
    </div>
  );
}
