import { POINT_RULES, CATEGORY_LABELS, DAILY_CAPS, type PointCategory } from "@/lib/points";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";

const CATEGORY_ICONS: Record<PointCategory, string> = {
  turnier:    "🏆",
  event:      "📅",
  aktivitaet: "🎙",
  streak:     "🔥",
  community:  "👥",
};

export default async function PointsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const myTransactions = userId
    ? await prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : [];

  const me = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true, level: true, streak: true },
      })
    : null;

  // Regeln nach Kategorie gruppieren
  const byCategory = Object.entries(POINT_RULES).reduce<
    Record<string, { key: string; rule: (typeof POINT_RULES)[keyof typeof POINT_RULES]; cap?: number }[]>
  >((acc, [key, rule]) => {
    const cat = rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ key, rule, cap: DAILY_CAPS[key as keyof typeof DAILY_CAPS] });
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-5 h-5 text-amber-400" />
        <h1 className="text-xl font-semibold text-white">Punktesystem</h1>
      </div>

      {me && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Meine Punkte</p>
            <p className="text-2xl font-semibold text-white">{me.points.toLocaleString("de-DE")}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Level</p>
            <p className="text-2xl font-semibold text-white">{me.level}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Streak</p>
            <p className="text-2xl font-semibold text-orange-400">{me.streak > 0 ? `🔥 ${me.streak}d` : "–"}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {Object.entries(byCategory).map(([cat, rules]) => (
          <div key={cat} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <span>{CATEGORY_ICONS[cat as PointCategory]}</span>
              {CATEGORY_LABELS[cat as PointCategory]}
            </h2>
            <div className="space-y-2">
              {rules.map(({ key, rule, cap }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm text-gray-300">{rule.reason}</p>
                    {cap !== undefined && (
                      <p className="text-xs text-gray-600">Max {cap} Pts/Tag</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-rose-400 shrink-0 ml-4">
                    +{rule.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Level-Tabelle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
        <h2 className="text-sm font-medium text-white mb-3">🎯 Level & Ränge</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { range: "0 – 499",          rank: "Neuling",     color: "text-gray-400",    lvl: "1–5"   },
            { range: "500 – 2.999",       rank: "Kämpfer",     color: "text-emerald-400", lvl: "6–15"  },
            { range: "3.000 – 9.999",     rank: "Veteran",     color: "text-blue-400",    lvl: "16–25" },
            { range: "10.000 – 24.999",   rank: "Elite",       color: "text-purple-400",  lvl: "26–35" },
            { range: "25.000 – 59.999",   rank: "Legende",     color: "text-amber-400",   lvl: "36–45" },
            { range: "60.000+",           rank: "Grandmaster", color: "text-red-400",     lvl: "46+"   },
          ].map((r) => (
            <div key={r.rank} className="bg-gray-800 rounded-lg p-3 text-center">
              <p className={`text-sm font-semibold ${r.color}`}>{r.rank}</p>
              <p className="text-xs text-gray-500 mt-1">{r.range} Pts</p>
              <p className="text-xs text-gray-600">Level {r.lvl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meine letzten Transaktionen */}
      {myTransactions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Meine letzten Punkte</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {myTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-white">{tx.reason}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("de-DE", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} Pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
