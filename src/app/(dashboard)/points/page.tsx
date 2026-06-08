import { POINT_RULES, CATEGORY_LABELS, DAILY_CAPS, type PointCategory } from "@/lib/points";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { RelativeTime } from "@/components/RelativeTime";

const CATEGORY_ICONS: Record<PointCategory, string> = {
  turnier:    "🏆",
  event:      "📅",
  aktivitaet: "🎙️",
  community:  "👥",
};

const CATEGORY_ACCENT: Record<PointCategory, { icon: string; border: string; glow: string }> = {
  turnier:    { icon: "text-amber-400   bg-amber-500/10   border-amber-500/15",   border: "border-amber-500/10",   glow: "from-amber-500/5"   },
  event:      { icon: "text-blue-400    bg-blue-500/10    border-blue-500/15",    border: "border-blue-500/10",    glow: "from-blue-500/5"    },
  aktivitaet: { icon: "text-violet-400  bg-violet-500/10  border-violet-500/15",  border: "border-violet-500/10",  glow: "from-violet-500/5"  },
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
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true } })
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
        <p className="text-sm text-gray-500 ml-10">Wie du Punkte verdienst</p>
      </div>

      {/* ── Meine Stats ─────────────────────────────────────────────── */}
      {me && (
        <div className="glass card-shine rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-5 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-black text-amber-400 tabular-nums mb-3">
                <CountUp to={myPoints} duration={900} />
                <span className="text-base font-medium text-amber-500/70 ml-1">Pts</span>
              </p>
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
