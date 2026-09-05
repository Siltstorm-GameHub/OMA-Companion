// ============================================
// Battle-Cards-Rang-Tiers (Rocket-League-artig: Tier + Division je Elo-Wert)
// ============================================
// Eigenständige Skala, unabhängig vom globalen Prestige-Rang (siehe lib/ranks.ts,
// dort basiert der Rang auf User.rankPoints — App-weit, nicht battle-cards-spezifisch).
// Macht das rohe Elo-Rating (siehe elo.ts) für Spieler auf einen Blick lesbar.

export interface BattleRankEntry {
  tier: number; // 1 (Bronze) .. 6 (Champion)
  tierLabel: string; // "I" | "II" | "III"
  name: string;
  emoji: string;
  color: string;
  min: number;
}

export const BATTLE_RANKS: readonly BattleRankEntry[] = [
  { tier: 1, tierLabel: "I",   name: "Bronze",   emoji: "🥉", color: "#a1653a", min:    0 },
  { tier: 1, tierLabel: "II",  name: "Bronze",   emoji: "🥉", color: "#a1653a", min:  700 },
  { tier: 1, tierLabel: "III", name: "Bronze",   emoji: "🥉", color: "#a1653a", min:  800 },
  { tier: 2, tierLabel: "I",   name: "Silber",   emoji: "🥈", color: "#9ca3af", min:  900 },
  { tier: 2, tierLabel: "II",  name: "Silber",   emoji: "🥈", color: "#9ca3af", min: 1000 },
  { tier: 2, tierLabel: "III", name: "Silber",   emoji: "🥈", color: "#9ca3af", min: 1100 },
  { tier: 3, tierLabel: "I",   name: "Gold",     emoji: "🥇", color: "#eab308", min: 1200 },
  { tier: 3, tierLabel: "II",  name: "Gold",     emoji: "🥇", color: "#eab308", min: 1300 },
  { tier: 3, tierLabel: "III", name: "Gold",     emoji: "🥇", color: "#eab308", min: 1400 },
  { tier: 4, tierLabel: "I",   name: "Platin",   emoji: "💠", color: "#38bdf8", min: 1500 },
  { tier: 4, tierLabel: "II",  name: "Platin",   emoji: "💠", color: "#38bdf8", min: 1600 },
  { tier: 4, tierLabel: "III", name: "Platin",   emoji: "💠", color: "#38bdf8", min: 1700 },
  { tier: 5, tierLabel: "I",   name: "Diamant",  emoji: "💎", color: "#818cf8", min: 1800 },
  { tier: 5, tierLabel: "II",  name: "Diamant",  emoji: "💎", color: "#818cf8", min: 1950 },
  { tier: 5, tierLabel: "III", name: "Diamant",  emoji: "💎", color: "#818cf8", min: 2100 },
  { tier: 6, tierLabel: "I",   name: "Champion", emoji: "👑", color: "#f472b6", min: 2250 },
  { tier: 6, tierLabel: "II",  name: "Champion", emoji: "👑", color: "#f472b6", min: 2450 },
  { tier: 6, tierLabel: "III", name: "Champion", emoji: "👑", color: "#f472b6", min: 2650 },
] as const;

export function getBattleRank(elo: number): BattleRankEntry {
  return [...BATTLE_RANKS].reverse().find((r) => elo >= r.min) ?? BATTLE_RANKS[0];
}

export function getBattleRankFullLabel(rank: BattleRankEntry): string {
  return `${rank.name} ${rank.tierLabel}`;
}
