import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStoredBattleLog } from "@/lib/battle-cards/battle-log";
import BattleScreen from "@/components/battle-cards/BattleScreen";

export const metadata = {
  title: "Kampf-Replay | Battle Cards | OMA",
};

export default async function BattleReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required");
  }
  const { id } = await params;

  const [battle, challenge] = await Promise.all([
    prisma.battle.findUnique({ where: { id } }),
    prisma.battleChallenge.findFirst({
      where: { battleId: id },
      include: {
        challenger: { select: { username: true, name: true } },
        opponent: { select: { username: true, name: true } },
      },
    }),
  ]);
  if (!battle || !isStoredBattleLog(battle.battleLog)) notFound();

  const participantIds = challenge ? [challenge.challengerId, challenge.opponentId] : [battle.playerId];
  if (!participantIds.includes(session.user.id)) notFound();

  const challengerName = challenge?.challenger.username ?? challenge?.challenger.name ?? "Herausforderer";
  const opponentName = challenge?.opponent.username ?? challenge?.opponent.name ?? "Gegner";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/battle-cards/challenges"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zu den Herausforderungen
      </Link>
      {challenge && (
        <h1 className="text-lg font-black text-white">
          {challengerName} <span className="text-gray-500 font-normal">vs.</span> {opponentName}
        </h1>
      )}
      <BattleScreen roster={battle.battleLog.roster} log={battle.battleLog.log} />
    </div>
  );
}
