import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig } from "@/lib/minigames-config";
import DuelClient, { type DuelEntry } from "./DuelClient";

const userSelect = { id: true, username: true, name: true, image: true } as const;

function serialize(duels: Array<Record<string, unknown>>): DuelEntry[] {
  return duels.map(d => ({
    ...d,
    createdAt: (d.createdAt as Date).toISOString(),
    respondedAt: d.respondedAt ? (d.respondedAt as Date).toISOString() : null,
    resolvedAt: d.resolvedAt ? (d.resolvedAt as Date).toISOString() : null,
  })) as unknown as DuelEntry[];
}

export default async function DuelPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const config = await getMinigamesConfig();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [incoming, outgoing, myHistory, monthHistory, monthTotal] = await Promise.all([
    prisma.duelChallenge.findMany({
      where: { opponentId: userId, status: "pending" },
      include: { challenger: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.duelChallenge.findMany({
      where: { challengerId: userId, status: "pending" },
      include: { opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.duelChallenge.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }], status: { in: ["resolved", "declined", "expired"] } },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.duelChallenge.findMany({
      where: { status: "resolved", resolvedAt: { gte: startOfMonth } },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { resolvedAt: "desc" },
      take: 20,
    }),
    prisma.duelChallenge.count({ where: { status: "resolved", resolvedAt: { gte: startOfMonth } } }),
  ]);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link href="/minigames" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Minigames
      </Link>

      {!config.duelEnabled ? (
        <div className="glass rounded-2xl p-10 text-center text-gray-400">
          1v1 Münzen-Duelle sind zurzeit deaktiviert.
        </div>
      ) : (
        <DuelClient
          userId={userId}
          config={{ min: config.duelMinWager, max: config.duelMaxWager, dailyCap: config.duelDailyWagerCap }}
          initialIncoming={serialize(incoming)}
          initialOutgoing={serialize(outgoing)}
          initialHistory={serialize(myHistory)}
          initialMonthHistory={serialize(monthHistory)}
          monthTotal={monthTotal}
        />
      )}
    </div>
  );
}
