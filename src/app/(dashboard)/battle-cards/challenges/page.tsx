import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import ChallengesList from "@/components/battle-cards/ChallengesList";
import ChallengeUserPicker from "@/components/battle-cards/ChallengeUserPicker";

export const metadata = {
  title: "Herausforderungen | Battle Cards | OMA",
};

const userSelect = { id: true, username: true, name: true, image: true } as const;

export default async function BattleChallengesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards/challenges");
  }
  const userId = session.user.id;

  if (!(await hasStarterDeck(userId))) {
    redirect("/battle-cards");
  }

  const [incoming, outgoing, history] = await Promise.all([
    prisma.battleChallenge.findMany({
      where: { opponentId: userId, status: "pending" },
      include: { challenger: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.battleChallenge.findMany({
      where: { challengerId: userId, status: "pending" },
      include: { opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.battleChallenge.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }], status: { in: ["resolved", "declined"] } },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  function serialize<T extends { createdAt: Date }>(rows: T[]) {
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Herausforderungen</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Battle-Cards-Duelle werden sofort mit der aktuellen Startaufstellung beider Spieler aufgelöst.
        </p>
      </div>
      <ChallengeUserPicker />
      <ChallengesList
        viewerId={userId}
        incoming={serialize(incoming)}
        outgoing={serialize(outgoing)}
        history={serialize(history)}
      />
    </div>
  );
}
