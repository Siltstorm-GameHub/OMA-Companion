export const RANKS = [
  { min:    0, label: "Neuling",               emoji: "🔰", color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/20"   },
  { min:  100, label: "Zivi-Anwärter",         emoji: "📋", color: "text-zinc-300",   bg: "bg-zinc-500/10",   border: "border-zinc-500/20"   },
  { min:  200, label: "Rollator-Führerschein", emoji: "🛺", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
  { min:  300, label: "Kamillenteetrinker",    emoji: "🍵", color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/20"   },
  { min:  400, label: "Heimbeirat",            emoji: "🏛️", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
  { min:  500, label: "Pflegestufe 5",         emoji: "🩺", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { min: 1000, label: "Old Master",            emoji: "👴", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
] as const;

export type RankEntry = typeof RANKS[number];

export function getRank(rankPoints: number): RankEntry {
  return [...RANKS].reverse().find(r => rankPoints >= r.min) ?? RANKS[0];
}

export function getNextRank(rankPoints: number): RankEntry | null {
  return RANKS.find(r => r.min > rankPoints) ?? null;
}

export function getRankProgress(rankPoints: number): { rank: RankEntry; next: RankEntry | null; pct: number } {
  const rank = getRank(rankPoints);
  const next = getNextRank(rankPoints);
  const pct  = next
    ? Math.min(100, Math.round(((rankPoints - rank.min) / (next.min - rank.min)) * 100))
    : 100;
  return { rank, next, pct };
}
