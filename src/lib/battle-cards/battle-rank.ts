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
  /** Radial-Gradient-Farbpaar (hell → dunkel), gleiches Muster wie die Platz-1-3-Medaillen
   *  in LeaderboardList.tsx und die Reiter-Medaillons in BattleCardsTabs.tsx. */
  from: string;
  to: string;
  glow: string;
  min: number;
}

export const BATTLE_RANKS: readonly BattleRankEntry[] = [
  { tier: 1, tierLabel: "I",   name: "Bronze",   emoji: "🥉", from: "#d9a066", to: "#7c4a25", glow: "rgba(217,160,102,0.45)", min:    0 },
  { tier: 1, tierLabel: "II",  name: "Bronze",   emoji: "🥉", from: "#d9a066", to: "#7c4a25", glow: "rgba(217,160,102,0.45)", min:  700 },
  { tier: 1, tierLabel: "III", name: "Bronze",   emoji: "🥉", from: "#d9a066", to: "#7c4a25", glow: "rgba(217,160,102,0.45)", min:  800 },
  { tier: 2, tierLabel: "I",   name: "Silber",   emoji: "🥈", from: "#e5e7eb", to: "#6b7280", glow: "rgba(229,231,235,0.45)", min:  900 },
  { tier: 2, tierLabel: "II",  name: "Silber",   emoji: "🥈", from: "#e5e7eb", to: "#6b7280", glow: "rgba(229,231,235,0.45)", min: 1000 },
  { tier: 2, tierLabel: "III", name: "Silber",   emoji: "🥈", from: "#e5e7eb", to: "#6b7280", glow: "rgba(229,231,235,0.45)", min: 1100 },
  { tier: 3, tierLabel: "I",   name: "Gold",     emoji: "🥇", from: "#fde68a", to: "#d97706", glow: "rgba(253,230,138,0.5)",  min: 1200 },
  { tier: 3, tierLabel: "II",  name: "Gold",     emoji: "🥇", from: "#fde68a", to: "#d97706", glow: "rgba(253,230,138,0.5)",  min: 1300 },
  { tier: 3, tierLabel: "III", name: "Gold",     emoji: "🥇", from: "#fde68a", to: "#d97706", glow: "rgba(253,230,138,0.5)",  min: 1400 },
  { tier: 4, tierLabel: "I",   name: "Platin",   emoji: "💠", from: "#a5f3fc", to: "#0e7490", glow: "rgba(165,243,252,0.5)",  min: 1500 },
  { tier: 4, tierLabel: "II",  name: "Platin",   emoji: "💠", from: "#a5f3fc", to: "#0e7490", glow: "rgba(165,243,252,0.5)",  min: 1600 },
  { tier: 4, tierLabel: "III", name: "Platin",   emoji: "💠", from: "#a5f3fc", to: "#0e7490", glow: "rgba(165,243,252,0.5)",  min: 1700 },
  { tier: 5, tierLabel: "I",   name: "Diamant",  emoji: "💎", from: "#c7d2fe", to: "#4338ca", glow: "rgba(199,210,254,0.55)", min: 1800 },
  { tier: 5, tierLabel: "II",  name: "Diamant",  emoji: "💎", from: "#c7d2fe", to: "#4338ca", glow: "rgba(199,210,254,0.55)", min: 1950 },
  { tier: 5, tierLabel: "III", name: "Diamant",  emoji: "💎", from: "#c7d2fe", to: "#4338ca", glow: "rgba(199,210,254,0.55)", min: 2100 },
  { tier: 6, tierLabel: "I",   name: "Champion", emoji: "👑", from: "#fbcfe8", to: "#be185d", glow: "rgba(251,207,232,0.6)",  min: 2250 },
  { tier: 6, tierLabel: "II",  name: "Champion", emoji: "👑", from: "#fbcfe8", to: "#be185d", glow: "rgba(251,207,232,0.6)",  min: 2450 },
  { tier: 6, tierLabel: "III", name: "Champion", emoji: "👑", from: "#fbcfe8", to: "#be185d", glow: "rgba(251,207,232,0.6)",  min: 2650 },
] as const;

export function getBattleRank(elo: number): BattleRankEntry {
  return [...BATTLE_RANKS].reverse().find((r) => elo >= r.min) ?? BATTLE_RANKS[0];
}

export function getBattleRankFullLabel(rank: BattleRankEntry): string {
  return `${rank.name} ${rank.tierLabel}`;
}
