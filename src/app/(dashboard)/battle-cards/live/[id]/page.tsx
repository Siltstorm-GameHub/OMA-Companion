import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LiveBattleView from "@/components/battle-cards/LiveBattleView";

export const metadata = {
  title: "Laufender Kampf | Battle Cards | OMA",
};

export default async function LiveBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required");
  }
  const { id } = await params;
  const viewerId = session.user.id;

  const live = await prisma.liveBattle.findUnique({ where: { id }, select: { playerAId: true, playerBId: true, resultBattleId: true } });
  if (!live) notFound();
  if (viewerId !== live.playerAId && viewerId !== live.playerBId) notFound();

  if (live.resultBattleId) {
    redirect(`/battle-cards/battles/${live.resultBattleId}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/battle-cards?tab=community"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Community
      </Link>
      <h1 className="text-lg font-black text-white">Kampf läuft</h1>
      <LiveBattleView liveBattleId={id} viewerId={viewerId} />
    </div>
  );
}
