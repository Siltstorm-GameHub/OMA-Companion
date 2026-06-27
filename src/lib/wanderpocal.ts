import type { WanderpocalHolder as PrismaHolder, WanderpocalStat as PrismaStat } from "@prisma/client";

export type WanderpocalScopeType = "category" | "genre";

export type WanderpocalHolder = PrismaHolder;
export type WanderpocalStat = PrismaStat;

// Key: "userId:scopeType:scopeValue"
export type WanderpocalHoldersMap = Map<string, WanderpocalHolder>;

export function buildHoldersMap(rows: WanderpocalHolder[]): WanderpocalHoldersMap {
  const map = new Map<string, WanderpocalHolder>();
  for (const row of rows) {
    map.set(`${row.userId}:${row.scopeType}:${row.scopeValue}`, row);
  }
  return map;
}

export function getUserTrophies(map: WanderpocalHoldersMap, userId: string): WanderpocalHolder[] {
  return [...map.values()]
    .filter((h) => h.userId === userId)
    .sort((a, b) => a.scopeType.localeCompare(b.scopeType) || a.scopeValue.localeCompare(b.scopeValue));
}

export const CATEGORY_CONFIG: Record<string, { emoji: string; title: string }> = {
  competitive:     { emoji: "🏆", title: "Gladiator" },
  fun:             { emoji: "🎉", title: "Partylöwe" },
  casual:          { emoji: "🛋️", title: "Freigeist" },
  training:        { emoji: "🎓", title: "Grinder" },
  community_event: { emoji: "🤝", title: "Community-Held" },
  special:         { emoji: "⭐", title: "Auserwählter" },
};

export const GENRE_CONFIG: Record<string, { icon: string; title: string }> = {
  arcade:    { icon: "/Arcade Icon.png",     title: "Pixelkönig" },
  beat_em_up:{ icon: "/Beat-em-Up Icon.png", title: "Prügelprofi" },
  sport:     { icon: "/Sport Icon.png",      title: "Sportass" },
  racing:    { icon: "/Racing Icon.png",     title: "Rennlegende" },
  shooter:   { icon: "/Shooter Icon.png",    title: "Scharfschütze" },
  community: { icon: "/Community Icon.png",  title: "Communitystar" },
};

/** Display title for any scope value */
export function getScopeTitle(scopeType: string, scopeValue: string): string {
  if (scopeType === "category") return CATEGORY_CONFIG[scopeValue]?.title ?? scopeValue;
  return GENRE_CONFIG[scopeValue]?.title ?? scopeValue;
}
