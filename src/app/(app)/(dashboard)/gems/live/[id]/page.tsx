import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LiveBattleView from "@/components/gems/LiveBattleView";
import { isSupportedMode } from "@/lib/gems/live-battle";

export const metadata = {
  title: "Laufender Kampf | OMA Gems | OMA",
};

export default async function LiveBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required");
  }
  const { id } = await params;
  const viewerId = session.user.id;

  const live = await prisma.liveBattle.findUnique({
    where: { id },
    select: { mode: true, playerAId: true, resultBattleId: true },
  });
  if (!live || viewerId !== live.playerAId) notFound();
  // Kämpfe aus abgeschalteten Modi (Duels, PvP, freies PvE) lassen sich nicht mehr fortsetzen.
  if (!isSupportedMode(live.mode)) redirect("/gems");

  if (live.resultBattleId) {
    redirect(`/gems/battles/${live.resultBattleId}`);
  }

  // Rendert sich selbst als Vollbild-Overlay (fixed inset-0) mit eigenem Zurück-Button.
  return <LiveBattleView key={id} liveBattleId={id} viewerId={viewerId} />;
}
