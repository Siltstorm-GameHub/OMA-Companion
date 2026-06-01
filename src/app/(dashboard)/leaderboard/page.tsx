import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getRank, getLevel } from "@/lib/points";
import { Trophy, Medal } from "lucide-react";

export default async function LeaderboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 50,
    select: {
      id: true, name: true, username: true, image: true,
      points: true, level: true, streak: true,
      _count: { select: { tournamentParticipants: true, eventRegistrations: true } },
    },
  });

  // Siege aus Matches zählen
  const wins = await prisma.match.groupBy({
    by: ["winnerId"],
    _count: { winnerId: true },
    where: { winnerId: { not: null } },
  });
  const winMap = new Map(wins.map((w) => [w.winnerId!, w._count.winnerId]));

  const rankMedals = ["🥇", "🥈", "🥉"];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h1 className="text-xl font-semibold text-white">Rangliste</h1>
      </div>

      {/* Top 3 Podium */}
      {users.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          {[users[1], users[0], users[2]].map((u, podiumIdx) => {
            const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
            const rank = getRank(u.points);
            const displayName = u.username ?? u.name ?? "?";
            const heights = ["h-24", "h-32", "h-20"];
            return (
              <div key={u.id} className={`flex flex-col items-center justify-end ${heights[podiumIdx]} bg-gray-900 border ${u.id === userId ? "border-rose-500" : "border-gray-800"} rounded-xl p-4`}>
                <div className="text-2xl mb-1">{rankMedals[actualRank - 1]}</div>
                {u.image ? (
                  <img src={u.image} alt="" className="w-10 h-10 rounded-full mb-1" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-rose-600/40 flex items-center justify-center text-sm font-bold text-rose-300 mb-1">
                    {displayName[0].toUpperCase()}
                  </div>
                )}
                <p className="text-xs font-medium text-white truncate max-w-full">{displayName}</p>
                <p className={`text-xs font-semibold mt-0.5 ${rank.color}`}>{u.points.toLocaleString("de-DE")} Pts</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Vollständige Tabelle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Spieler</th>
              <th className="text-left px-4 py-3 font-medium">Rang</th>
              <th className="text-center px-4 py-3 font-medium">Lvl</th>
              <th className="text-center px-4 py-3 font-medium">Siege</th>
              <th className="text-center px-4 py-3 font-medium">Events</th>
              <th className="text-center px-4 py-3 font-medium">Streak</th>
              <th className="text-right px-4 py-3 font-medium">Punkte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u, i) => {
              const rank = getRank(u.points);
              const displayName = u.username ?? u.name ?? "Unbekannt";
              const isMe = u.id === userId;
              const userWins = winMap.get(u.id) ?? 0;

              return (
                <tr key={u.id} className={`hover:bg-gray-800/40 transition-colors ${isMe ? "bg-rose-950/30" : ""}`}>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${
                      i === 0 ? "text-amber-400 text-base" :
                      i === 1 ? "text-gray-400" :
                      i === 2 ? "text-amber-700" : "text-gray-600"
                    }`}>
                      {i < 3 ? rankMedals[i] : i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <img src={u.image} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-600/40 flex items-center justify-center text-xs font-semibold text-rose-300 shrink-0">
                          {displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className={`font-medium ${isMe ? "text-rose-300" : "text-white"}`}>
                          {displayName}
                          {isMe && <span className="text-xs text-gray-500 ml-1">(du)</span>}
                        </p>
                        {u.streak > 0 && (
                          <p className="text-xs text-orange-400">🔥 {u.streak} Tage Streak</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${rank.color}`}>{rank.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{u.level}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{userWins}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{u._count.eventRegistrations}</td>
                  <td className="px-4 py-3 text-center">
                    {u.streak > 0
                      ? <span className="text-orange-400 font-medium">{u.streak}d</span>
                      : <span className="text-gray-600">–</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-white">{u.points.toLocaleString("de-DE")}</span>
                    <span className="text-gray-500 text-xs ml-1">Pts</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
