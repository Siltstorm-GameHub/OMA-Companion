import { POINT_RULES, CATEGORY_LABELS, DAILY_CAPS, type PointCategory, getRank, getLevel, getNextLevelPoints, getLevelStartPoints } from "@/lib/points";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Star, Zap } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { RelativeTime } from "@/components/RelativeTime";

const CATEGORY_ICONS: Record<PointCategory, string> = {
  turnier:    "🏆",
  event:      "📅",
  aktivitaet: "🎙️",
  streak:     "🔥",
  community:  "👥",
};

const CATEGORY_ACCENT: Record<PointCategory, { icon: string; border: string; glow: string }> = {
  turnier:    { icon: "text-amber-400   bg-amber-500/10   border-amber-500/15",   border: "border-amber-500/10",   glow: "from-amber-500/5"   },
  event:      { icon: "text-blue-400    bg-blue-500/10    border-blue-500/15",    border: "border-blue-500/10",    glow: "from-blue-500/5"    },
  aktivitaet: { icon: "text-violet-400  bg-violet-500/10  border-violet-500/15",  border: "border-violet-500/10",  glow: "from-violet-500/5"  },
  streak:     { icon: "text-orange-400  bg-orange-500/10  border-orange-500/15",  border: "border-orange-500/10",  glow: "from-orange-500/5"  },
  community:  { icon: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", border: "border-emerald-500/10", glow: "from-emerald-500/5" },
};

const RANK_ROWS = [
  { range: "0 – 499",        rank: "Neuling",     color: "text-gray-400",    lvl: "1–5",   accent: "bg-gray-500/10  border-gray-500/15"  },
  { range: "500 – 2.999",    rank: "Kämpfer",     color: "text-emerald-400", lvl: "6–15",  accent: "bg-emerald-500/10 border-emerald-500/15" },
  { range: "3.000 – 9.999",  rank: "Veteran",     color: "text-blue-400",    lvl: "16–25", accent: "bg-blue-500/10  border-blue-500/15"  },
  { range: "10.000 – 24.999",rank: "Elite",       color: "text-purple-400",  lvl: "26–35", accent: "bg-purple-500/10 border-purple-500/15" },
  { range: "25.000 – 59.999",rank: "Legende",     color: "text-amber-400",   lvl: "36–45", accent: "bg-amber-500/10  border-amber-500/15" },
  { range: "60.000+",        rank: "Grandmaster", color: "text-red-400",     lvl: "46+",   accent: "bg-red-500/10   border-red-500/15"   },
];

export default async function PointsPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const [me, myTransactions] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true, level: true, streak: true } })
      : null,
    userId
      ? prisma.pointTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 })
      : [],
  ]);

  // Regeln nach Kategorie gruppieren
  const byCategory = Object.entries(POINT_RULES).reduce<
    Record<string, { key: string; rule: (typeof POINT_RULES)[keyof typeof POINT_RULES]; cap?: number }[]>
  >((acc, [key, rule]) => {
    const cat = rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ key, rule, cap: DAILY_CAPS[key as keyof typeof DAILY_CAPS] });
    return acc;
  }, {});

  const myPoints    = me?.points ?? 0;
  const myLevel     = getLevel(myPoints);
  const rank        = getRank(myPoints);
  const nextPts     = getNextLevelPoints(myPoints);
  const prevPts     = getLevelStartPoints(myPoints);
  const xpProgress  = nextPts > prevPts
    ? Math.min(100, Math.round(((myPoints - prevPts) / (nextPts - prevPts)) * 100))
    : 100;

  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Punktesystem</h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">Wie du Punkte verdienst & Level aufsteigst</p>
      </div>

      {/* ── Meine Stats ─────────────────────────────────────────────── */}
      {me && (
        <div className="glass card-shine rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-5 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <p className="text-2xl font-black text-amber-400 tabular-nums">
                  <CountUp to={myPoints} duration={900} />
                  <span className="text-base font-medium text-amber-500/70 ml-1">Pts</span>
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${rank.color} bg-white/[0.04] border-white/10`}>
                  {rank.label}
                </span>
              </div>

              {/* XP Bar */}
              <div className="max-w-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Level {myLevel}
                  </span>
                  <span>{xpProgress}% → Level {myLevel + 1}</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full progress-shimmer shadow-[0_0_10px_rgba(244,63,94,0.4)] transition-all duration-1000"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>{(myPoints - prevPts).toLocaleString("de-DE")} XP</span>
                  <span>{(nextPts - prevPts).toLocaleString("de-DE")} XP bis Level {myLevel + 1}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              <div className="glass-heavy rounded-xl px-4 py-3 text-center">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Level</p>
                <p className="text-2xl font-black text-white tabular-nums">{myLevel}</p>
              </div>
              {me.streak > 0 && (
                <div className="glass-heavy rounded-xl px-4 py-3 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Streak</p>
                  <p className="text-2xl font-black text-orange-400 tabular-nums">{me.streak}d</p>
                  <p className="text-[9px] text-orange-600 mt-0.5">🔥</p>
                </div>
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

      {/* ── Level & Ränge ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🎯 Level & Ränge</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {RANK_ROWS.map((r) => {
            const isMyRank = me && getRank(me.points).label === r.rank;
            return (
              <div key={r.rank}
                className={`card-shine glass rounded-2xl p-3.5 text-center relative overflow-hidden border ${r.accent} ${isMyRank ? "ring-1 ring-white/20" : ""}`}>
                {isMyRank && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                )}
                <p className={`text-sm font-bold ${r.color}`}>{r.rank}</p>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-tight">{r.range}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Lv. {r.lvl}</p>
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
            {myTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{tx.reason}</p>
                  <RelativeTime date={tx.createdAt} className="text-[10px] text-gray-600 mt-0.5 block" />
                </div>
                <span className={`text-sm font-bold shrink-0 ml-4 tabular-nums ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
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
