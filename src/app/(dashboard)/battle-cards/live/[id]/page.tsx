import { notFound, redirect } from "next/navigation";
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

  // LiveBattleView rendert sich selbst als Vollbild-Overlay (fixed inset-0) —
  // der eingebaute Zurück-Button navigiert zur Community-Übersicht.
  return <LiveBattleView liveBattleId={id} viewerId={viewerId} />;
}
