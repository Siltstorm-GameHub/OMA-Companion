import { POINT_RULES, CATEGORY_LABELS, DAILY_CAPS, type PointCategory } from "@/lib/points";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getRank, getNextRank, getRankFullLabel } from "@/lib/ranks";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { CountUp } from "@/components/CountUp";
import { RelativeTime } from "@/components/RelativeTime";

const CATEGORY_ICONS: Record<PointCategory, string> = {
  turnier:    "🏆",
  aktivitaet: "🎙️",
  community:  "👥",
};

const CATEGORY_ACCENT: Record<PointCategory, { icon: string; border: string; glow: string }> = {
  turnier:    { icon: "text-amber-400   bg-amber-500/10   border-amber-500/15",   border: "border-amber-500/10",   glow: "from-amber-500/5"   },
  aktivitaet: { icon: "text-teal-400  bg-teal-500/10  border-teal-500/15",  border: "border-teal-500/10",  glow: "from-teal-500/5"  },
  community:  { icon: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", border: "border-emerald-500/10", glow: "from-emerald-500/5" },
};

export default async function PointsPage() {
  const me = await getSessionUser();
  const userId = me?.id;

  const myTransactions = userId
    ? await prisma.pointTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 })
    : [];

  // Regeln nach Kategorie gruppieren
  const byCategory = Object.entries(POINT_RULES).reduce<
    Record<string, { key: string; rule: (typeof POINT_RULES)[keyof typeof POINT_RULES]; cap?: number }[]>
  >((acc, [key, rule]) => {
    const cat = rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ key, rule, cap: DAILY_CAPS[key as keyof typeof DAILY_CAPS] });
    return acc;
  }, {});

  const myPoints  = me?.points ?? 0;
  const myRankPts = me?.rankPoints ?? 0;
  const rankRow   = getRank(myRankPts);
  const nextRank  = getNextRank(myRankPts);
  const rankPct   = nextRank
    ? Math.min(100, Math.round(((myRankPts - rankRow.min) / (nextRank.min - rankRow.min)) * 100))
    : 100;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Punktesystem</h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">Wie du Punkte verdienst</p>
      </div>

      {/* ── Meine Stats ─────────────────────────────────────────────── */}
      {me && (
        <div className="glass card-shine rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-5 flex-wrap">
            {/* Münzen */}
            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1">Münzen</p>
              <p className="text-2xl font-black text-amber-400 tabular-nums">
                <CountUp to={myPoints} duration={900} />
                <CoinIcon size={20} className="ml-1 opacity-70" />
              </p>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-white/[0.06] hidden sm:block" />

            {/* Rang */}
            <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1">Rang</p>
              <div className="flex items-center gap-2">
                <span className="text-xl">{rankRow.emoji}</span>
                <span className={`text-sm font-bold ${rankRow.color}`}>{getRankFullLabel(rankRow)}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-white/[0.06] hidden sm:block" />

            {/* Rang-Fortschritt */}
            <div className="flex-1 min-w-[160px]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Rangpunkte</p>
                <span className="text-[10px] text-gray-600 tabular-nums">{myRankPts}{nextRank ? ` / ${nextRank.min}` : ""}</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${rankRow.color.replace("text-", "bg-")}`}
                  style={{ width: `${rankPct}%` }}
                />
              </div>
              {nextRank && (
                <p className="text-[10px] text-gray-700 mt-1">Nächster Rang in {nextRank.min - myRankPts} Punkten</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Punkte-Regeln ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">So verdienst du Punkte</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Object.entries(byCategory).map(([cat, rules]) => {
            const a = CATEGORY_ACCENT[cat as PointCategory];
            return (
              <div key={cat} className={`card-shine glass rounded-2xl p-4 relative overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-60 pointer-events-none`} />
                <h2 className="relative text-xs font-semibold text-white flex items-center gap-2 mb-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center border text-sm ${a.icon}`}>
                    {CATEGORY_ICONS[cat as PointCategory]}
                  </span>
                  {CATEGORY_LABELS[cat as PointCategory]}
                </h2>
                <div className="relative space-y-0 divide-y divide-white/[0.04]">
                  {rules.map(({ key, rule, cap }) => (
                    <div key={key} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-300 truncate">{rule.reason}</p>
                        {cap !== undefined && (
                          <p className="text-[10px] text-gray-600 mt-0.5">Max {cap} Pts/Tag</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-amber-400 shrink-0 ml-4 tabular-nums">
                        +{rule.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* ── Letzte Transaktionen ────────────────────────────────────── */}
      {myTransactions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Meine letzten Punkte</p>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {myTransactions.map((tx) => {
              const isPos = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  {/* Icon pill */}
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    isPos ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {isPos
                      ? <TrendingUp className="w-4 h-4" />
                      : <TrendingDown className="w-4 h-4" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{tx.reason}</p>
                    <RelativeTime date={tx.createdAt} className="text-[10px] text-gray-600 mt-0.5 block" />
                  </div>
                  {/* Amount badge */}
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums ${
                    isPos
                      ? "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20"
                      : "bg-red-500/12 text-red-400 ring-1 ring-red-500/20"
                  }`}>
                    {isPos ? "+" : ""}{tx.amount}
                    <span className="text-[10px] font-normal opacity-70">Pts</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
