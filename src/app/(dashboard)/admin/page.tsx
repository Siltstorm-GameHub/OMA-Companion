import { prisma } from "@/lib/prisma";
import { Users, CalendarDays, Trophy, Star } from "lucide-react";

export default async function AdminPage() {
  const [userCount, eventCount, tournamentCount, pointsTotal] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.tournament.count(),
    prisma.pointTransaction.aggregate({ _sum: { amount: true } }),
  ]);

  const recentActivity = await prisma.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { user: { select: { name: true, username: true } } },
  });

  const stats = [
    { label: "Nutzer gesamt",    value: userCount,                                  icon: Users },
    { label: "Events",           value: eventCount,                                 icon: CalendarDays },
    { label: "Turniere",         value: tournamentCount,                            icon: Trophy },
    { label: "Punkte vergeben",  value: pointsTotal._sum.amount?.toLocaleString("de-DE") ?? "0", icon: Star },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Icon className="w-3.5 h-3.5" />{label}
            </div>
            <p className="text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium text-gray-400 mb-3">Letzte Punkte-Aktivitäten</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {recentActivity.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="text-white font-medium">{tx.user.username ?? tx.user.name ?? "?"}</span>
              <span className="text-gray-500 ml-2">{tx.reason}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-medium ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                {tx.amount > 0 ? "+" : ""}{tx.amount} Pts
              </span>
              <span className="text-xs text-gray-600">
                {new Date(tx.createdAt).toLocaleDateString("de-DE")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
