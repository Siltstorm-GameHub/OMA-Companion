export const GENRE_KEYS = ["arcade", "beat_em_up", "sport", "racing", "shooter", "community"] as const;
export type GenreKey = (typeof GENRE_KEYS)[number];

// Wiederverwendung der bestehenden Genre-Icons (siehe GENRE_MAP in tournament/[id]/page.tsx)
export const GENRE_ICON_MAP: Record<GenreKey, { label: string; icon: string }> = {
  arcade: { label: "Arcade", icon: "/Arcade Icon.png" },
  beat_em_up: { label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  sport: { label: "Sport", icon: "/Sport Icon.png" },
  racing: { label: "Racing", icon: "/Racing Icon.png" },
  shooter: { label: "Shooter", icon: "/Shooter Icon.png" },
  community: { label: "Community", icon: "/Community Icon.png" },
};

/** Batched-PointTransaction-Intervall: alle N Klicks wird der aufgelaufene Betrag verbucht */
export const FLUSH_EVERY_N_CLICKS = 10;

/** Mindestabstand zwischen zwei gewerteten Klicks (Anti-Spam) */
export const MIN_CLICK_INTERVAL_MS = 150;

/** Bonus-Icon: Lebensdauer + Spawn-Chance pro Poll/Klick-Request */
export const BONUS_ICON_TTL_MS = 7_000;
export const BONUS_ICON_SPAWN_CHANCE = 0.3;
export const BONUS_ICON_MIN_COINS = 5;
export const BONUS_ICON_MAX_COINS = 15;

/** totalClicks, die für ein bestimmtes Level nötig sind: 25 * L * (L-1), also 50/150/300/500… */
export function clicksRequiredForLevel(level: number): number {
  return 25 * level * (level - 1);
}

export function levelForTotalClicks(totalClicks: number): number {
  let level = 1;
  while (clicksRequiredForLevel(level + 1) <= totalClicks) level++;
  return level;
}

/** Münzen pro Klick, gestaffelt nach Level (Platzhalter-Kurve, später balancieren) */
export function coinsPerClickForLevel(level: number): number {
  if (level <= 4) return 1;
  if (level <= 9) return 2;
  if (level <= 14) return 3;
  if (level <= 19) return 4;
  return 5;
}

export function rollBonusIconGenre(): GenreKey {
  return GENRE_KEYS[Math.floor(Math.random() * GENRE_KEYS.length)];
}

export function rollBonusIconCoins(): number {
  return Math.floor(Math.random() * (BONUS_ICON_MAX_COINS - BONUS_ICON_MIN_COINS + 1)) + BONUS_ICON_MIN_COINS;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
