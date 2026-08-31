import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStoredBattleLog } from "@/lib/battle-cards/battle-log";
import BattleScreen from "@/components/battle-cards/BattleScreen";
import BattleResultBanner, { type BattleOutcome } from "@/components/battle-cards/BattleResultBanner";

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

  // Battle-Replays sind für alle eingeloggten Mitglieder einsehbar (verlinkt aus der
  // öffentlichen "Kampfhistorie aller Mitglieder" im Community-Reiter) — nur PVE-Testkämpfe
  // ohne Challenge-Datensatz bleiben auf den ausführenden Spieler beschränkt.
  const viewerId = session.user.id;
  const isParticipant = challenge
    ? viewerId === challenge.challengerId || viewerId === challenge.opponentId
    : viewerId === battle.playerId;
  if (!challenge && !isParticipant) notFound();

  const challengerName = challenge?.challenger.username ?? challenge?.challenger.name ?? "Herausforderer";
  const opponentName = challenge?.opponent.username ?? challenge?.opponent.name ?? "Gegner";

  let outcome: BattleOutcome;
  let outcomeLabel: string | undefined;
  if (challenge) {
    if (isParticipant) {
      outcome = challenge.winnerId === null ? "draw" : challenge.winnerId === viewerId ? "win" : "loss";
    } else {
      // Zuschauer (nicht Teilnehmer): keine persönliche Niederlage möglich — immer
      // die "Sieg"-Aufmachung (goldene Krone) mit dem Namen des Gewinners, bzw. Unentschieden.
      outcome = challenge.winnerId === null ? "draw" : "win";
      outcomeLabel = challenge.winnerId === null
        ? "Unentschieden"
        : `${challenge.winnerId === challenge.challengerId ? challengerName : opponentName} gewinnt!`;
    }
  } else {
    outcome = battle.result === "DRAW" ? "draw" : battle.result === "WIN" ? "win" : "loss";
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/battle-cards?tab=community"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Community
      </Link>
      {challenge && (
        <h1 className="text-lg font-black text-white">
          {challengerName} <span className="text-gray-500 font-normal">vs.</span> {opponentName}
        </h1>
      )}
      <BattleResultBanner outcome={outcome} label={outcomeLabel} />
      <BattleScreen roster={battle.battleLog.roster} log={battle.battleLog.log} />
    </div>
  );
}
