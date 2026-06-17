import { prisma } from "@/lib/prisma";
import { Users, CalendarDays, Trophy, Star, Zap } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import ResetAllBalancesButton from "./ResetAllBalancesButton";
import CoinIcon from "@/components/CoinIcon";

function txType(reason: string): "coins" | "rank" | "unknown" {
  if (reason.startsWith("[Münzen]") || reason.includes("(Münzen)")) return "coins";
  if (reason.startsWith("[Rang-Punkte]") || reason.includes("(Rang-Punkte)") || reason.includes("Rang-Punkte")) return "rank";
  // Legacy reasons ohne Prefix: Münzen (Quest, Spin, Anmeldung, Shop, Geschenk…)
  return "coins";
}

function cleanReason(reason: string) {
  return reason.replace(/^\[(Münzen|Rang-Punkte)\]\s*/, "");
}

export default async function AdminPage() {
  const [userCount, eventCount, tournamentCount, pointsTotal] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.event.count({ where: { format: { not: null } } }),
    prisma.pointTransaction.aggregate({ _sum: { amount: true } }),
  ]);

  const recentActivity = await prisma.pointTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
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
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Letzte Aktivitäten
        </h2>
        <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {recentActivity.length === 0 && (
            <p className="text-sm text-gray-600 px-4 py-6 text-center">Keine Aktivitäten vorhanden</p>
          )}
          {recentActivity.map((tx) => {
            const type = txType(tx.reason);
            const isPositive = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-white font-medium">{tx.user.username ?? tx.user.name ?? "?"}</span>
                  <span className="text-gray-500 text-sm ml-2">{cleanReason(tx.reason)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Typ-Badge */}
                  {type === "coins" ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">
                      <CoinIcon size={10} /> Münzen
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border text-teal-400 bg-teal-500/10 border-teal-500/20">
                      <Star className="w-2.5 h-2.5" /> Rang-Punkte
                    </span>
                  )}
                  {/* Betrag */}
                  <span className={`text-sm font-bold tabular-nums w-14 text-right ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{tx.amount}
                  </span>
                  <RelativeTime date={tx.createdAt} className="text-[10px] text-gray-600 w-16 text-right" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔧 Datenbank-Wartung</h2>
        <ResetAllBalancesButton />
      </div>
    </div>
  );
}
