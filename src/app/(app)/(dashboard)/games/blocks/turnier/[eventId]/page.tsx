// ============================================
// /games/blocks/turnier/[eventId] — Turnier-Raum eines OMA-Blocks-Live-Turniers
// ============================================
// Der Versus-Client im Turnier-Modus: tritt mit einem Ticket dem Raum der eigenen Gruppe bzw. dem Finale bei.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BlocksVersusClient from "@/components/blocks/BlocksVersusClient";

export const metadata = {
  title: "OMA Blocks Turnier | Games | OMA",
};

export default async function BlocksTournamentPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?notice=login_required&callbackUrl=/games/blocks/turnier/${eventId}`);
  const tournament = await prisma.blocksTournament.findUnique({ where: { eventId }, select: { id: true } });
  if (!tournament) notFound();

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      <BlocksVersusClient initialRoomCode={null} tournamentEventId={eventId} />
    </div>
  );
}
