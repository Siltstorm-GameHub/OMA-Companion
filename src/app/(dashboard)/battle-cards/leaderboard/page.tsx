import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RankedAvatar from "@/components/RankedAvatar";

export const metadata = {
  title: "Rangliste | Battle Cards | OMA",
};

const MEDALS = ["🥇", "🥈", "🥉"];

interface Row {
  userId: string;
  name: string;
  image: string | null;
  rankPoints: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

export default async function BattleCardsLeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards/leaderboard");
  }
  const viewerId = session.user.id;

  const resolved = await prisma.battleChallenge.findMany({
    where: { status: "resolved" },
    select: { challengerId: true, opponentId: true, winnerId: true },
  });

  const stats = new Map<string, { wins: number; losses: number; draws: number }>();
  function bump(userId: string, key: "wins" | "losses" | "draws") {
    const s = stats.get(userId) ?? { wins: 0, losses: 0, draws: 0 };
    s[key]++;
    stats.set(userId, s);
  }
  for (const b of resolved) {
    if (!b.winnerId) {
      bump(b.challengerId, "draws");
      bump(b.opponentId, "draws");
      continue;
    }
    const loserId = b.winnerId === b.challengerId ? b.opponentId : b.challengerId;
    bump(b.winnerId, "wins");
    bump(loserId, "losses");
  }

  const userIds = [...stats.keys()];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true, image: true, rankPoints: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const rows: Row[] = userIds
    .map((userId) => {
      const s = stats.get(userId)!;
      const total = s.wins + s.losses + s.draws;
      const u = userById.get(userId);
      return {
        userId,
        name: u?.username ?? u?.name ?? "Unbekannt",
        image: u?.image ?? null,
        rankPoints: u?.rankPoints ?? 0,
        ...s,
        total,
        winRate: total > 0 ? s.wins / total : 0,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.total - a.total);

  const viewerRank = rows.findIndex((r) => r.userId === viewerId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Battle-Cards-Rangliste
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Sortiert nach Siegen — alle abgeschlossenen Herausforderungen &amp; Zufallsgegner-Matches.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-500">Noch keine ausgetragenen Kämpfe — sei der Erste!</p>
          <Link
            href="/battle-cards/challenges"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-1.5 rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors"
          >
            Zu den Herausforderungen
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const isViewer = row.userId === viewerId;
            return (
              <div
                key={row.userId}
                className={`glass rounded-xl p-3 flex items-center gap-3 ${
                  isViewer ? "ring-1 ring-rose-500/40 bg-rose-500/[0.04]" : ""
                }`}
              >
                <span className="w-6 text-center text-sm font-bold text-gray-500 shrink-0">
                  {MEDALS[i] ?? i + 1}
                </span>
                <RankedAvatar rankPoints={row.rankPoints} src={row.image} alt={row.name} size={32} className="w-8 h-8 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-semibold">{row.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {row.total} Kämpfe · {Math.round(row.winRate * 100)}% Winrate
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs font-semibold">
                  <span className="text-emerald-400">{row.wins}S</span>
                  <span className="text-rose-400">{row.losses}N</span>
                  {row.draws > 0 && <span className="text-gray-500">{row.draws}U</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewerRank === -1 && rows.length > 0 && (
        <p className="text-xs text-gray-600 text-center">
          Du hast noch keine ausgetragenen Kämpfe — trage dein erstes Duell aus, um hier zu erscheinen.
        </p>
      )}
    </div>
  );
}
