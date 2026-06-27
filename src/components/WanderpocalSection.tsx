import Image from "next/image";
import {
  CATEGORY_CONFIG,
  GENRE_CONFIG,
  getScopeTitle,
  type WanderpocalHolder,
  type WanderpocalStat,
} from "@/lib/wanderpocal";

interface Props {
  trophies: WanderpocalHolder[];  // currently held (may be empty)
  userStats: WanderpocalStat[];   // all scopes where user has ≥1 win
  rankMap: Record<string, number>; // key: "scopeType:scopeValue" → 1-based rank
}

function ScopeIcon({ scopeType, scopeValue, size = 20 }: { scopeType: string; scopeValue: string; size?: number }) {
  if (scopeType === "category") {
    const cfg = CATEGORY_CONFIG[scopeValue];
    return <span className="text-xl leading-none">{cfg?.emoji ?? "🏆"}</span>;
  }
  const cfg = GENRE_CONFIG[scopeValue];
  if (!cfg) return null;
  return <Image src={cfg.icon} alt={scopeValue} width={size} height={size} className="object-contain" />;
}

function ordinalSuffix(n: number): string {
  return `#${n}`;
}

export default function WanderpocalSection({ trophies, userStats, rankMap }: Props) {
  if (!trophies.length && !userStats.length) return null;

  const categoryStats = userStats.filter((s) => s.scopeType === "category");
  const genreStats = userStats.filter((s) => s.scopeType === "genre");

  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
        Wanderpokal
      </h2>

      {/* Currently held trophies */}
      {trophies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {trophies.map((t) => {
            const title = getScopeTitle(t.scopeType, t.scopeValue);
            const typeLabel = t.scopeType === "category" ? "Kategorie" : "Genre";
            return (
              <div
                key={`${t.scopeType}:${t.scopeValue}`}
                className="flex flex-col gap-1.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3"
              >
                <ScopeIcon scopeType={t.scopeType} scopeValue={t.scopeValue} size={22} />
                <p className="text-xs font-semibold text-amber-300 leading-tight">{title}</p>
                <p className="text-[10px] text-gray-500">
                  {typeLabel} · {t.winCount} {t.winCount === 1 ? "Sieg" : "Siege"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Win statistics table */}
      {userStats.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
          {[
            { label: "Kategorien", rows: categoryStats },
            { label: "Genres", rows: genreStats },
          ]
            .filter((g) => g.rows.length > 0)
            .map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider border-b border-white/[0.04]">
                  {group.label}
                </div>
                {group.rows
                  .sort((a, b) => b.winCount - a.winCount)
                  .map((stat, i) => {
                    const title = getScopeTitle(stat.scopeType, stat.scopeValue);
                    const rank = rankMap[`${stat.scopeType}:${stat.scopeValue}`] ?? "–";
                    const isHolder = trophies.some(
                      (t) => t.scopeType === stat.scopeType && t.scopeValue === stat.scopeValue
                    );
                    return (
                      <div
                        key={stat.id}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                          i < group.rows.length - 1 ? "border-b border-white/[0.04]" : ""
                        }`}
                      >
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          <ScopeIcon scopeType={stat.scopeType} scopeValue={stat.scopeValue} size={18} />
                        </div>
                        <span className="flex-1 text-gray-300 text-xs">
                          {title}
                          {isHolder && (
                            <span className="ml-1.5 text-[10px] text-amber-400 font-medium">🏆 Pokalhalter</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {stat.winCount} {stat.winCount === 1 ? "Sieg" : "Siege"}
                        </span>
                        <span
                          className={`text-xs font-semibold tabular-nums min-w-[28px] text-right ${
                            rank === 1 ? "text-amber-400" : "text-gray-500"
                          }`}
                        >
                          {ordinalSuffix(rank as number)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
