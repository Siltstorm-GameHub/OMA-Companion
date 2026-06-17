import { prisma } from "@/lib/prisma";
import { Users, CalendarDays, Trophy, Star, Zap } from "lucide-react";
import ResetAllBalancesButton from "./ResetAllBalancesButton";
import ActivityFeed from "./ActivityFeed";

export default async function AdminPage() {
  const [userCount, eventCount, tournamentCount, pointsTotal] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.event.count({ where: { format: { not: null } } }),
    prisma.pointTransaction.aggregate({ _sum: { amount: true } }),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentActivity = await prisma.pointTransaction.findMany({
    where:   { createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, username: true } } },
  });

  const stats = [
    { label: "Nutzer gesamt",   value: userCount,                                               icon: Users,        iconCls: "text-rose-400 bg-rose-500/10 border-rose-500/15",       accent: "from-rose-500/8"    },
    { label: "Events",          value: eventCount,                                              icon: CalendarDays, iconCls: "text-blue-400 bg-blue-500/10 border-blue-500/15",       accent: "from-blue-500/8"    },
    { label: "Turniere",        value: tournamentCount,                                         icon: Trophy,       iconCls: "text-amber-400 bg-amber-500/10 border-amber-500/15",    accent: "from-amber-500/8"   },
    { label: "Münzen vergeben", value: pointsTotal._sum.amount?.toLocaleString("de-DE") ?? "0", icon: Star,         iconCls: "text-purple-400 bg-purple-500/10 border-purple-500/15", accent: "from-purple-500/8"  },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, iconCls, accent }) => (
          <div key={label} className={`card-shine glass relative overflow-hidden rounded-2xl p-4`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent pointer-events-none`} />
            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${iconCls}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="relative text-2xl font-black text-white tabular-nums">{value}</p>
            <p className="relative text-xs text-gray-400 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Letzte Aktivitäten */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Aktivitäten — letzte 7 Tage
        </h2>
        <ActivityFeed transactions={recentActivity} />
      </div>

      {/* Reset */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔧 Datenbank-Wartung</h2>
        <ResetAllBalancesButton />
      </div>
    </div>
  );
}
