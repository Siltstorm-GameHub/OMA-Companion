import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LiveBattleView from "@/components/battle-cards/LiveBattleView";
import DuelLiveView from "@/components/battle-cards/DuelLiveView";
import { DUEL_MODE } from "@/lib/battle-cards/duel-live-battle";
import { parseDuelsPveMode } from "@/lib/battle-cards/npc-battle-types";

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

  const live = await prisma.liveBattle.findUnique({
    where: { id },
    select: { mode: true, playerAId: true, playerBId: true, resultBattleId: true },
  });
  if (!live) notFound();
  if (viewerId !== live.playerAId && viewerId !== live.playerBId) notFound();

  if (live.resultBattleId) {
    redirect(`/battle-cards/battles/${live.resultBattleId}`);
  }

  // Beide Ansichten rendern sich selbst als Vollbild-Overlay (fixed inset-0) —
  // der eingebaute Zurück-Button navigiert zur Community-Übersicht. OMA Duels
  // (neuer Deck/Feld-Modus) bekommt ein eigenes Spielbrett statt einer weiteren
  // Verzweigung in der ohnehin komplexen LiveBattleView (siehe Implementierungsplan).
  if (live.mode === DUEL_MODE || parseDuelsPveMode(live.mode)) {
    return <DuelLiveView liveBattleId={id} viewerId={viewerId} />;
  }
  return <LiveBattleView liveBattleId={id} viewerId={viewerId} />;
}
