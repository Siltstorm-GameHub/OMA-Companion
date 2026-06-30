// Stufen-Rahmen (gleich für alle Ränge)
export const TIER_RINGS: Record<"I" | "II" | "III", string> = {
  I:   "ring-2 ring-zinc-500",
  II:  "ring-2 ring-slate-300 ring-offset-1 ring-offset-black",
  III: "ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-[0_0_8px_rgba(251,191,36,0.5)]",
};

export const RANKS = [
  // 1 – Zivi-Anwärter
  { min:    0, tier: 1, tierLabel: "I",   label: "Zivi-Anwärter", emoji: "📋", color: "text-zinc-400",   bg: "bg-zinc-500/10",   border: "border-zinc-500/20",   discordRoleEnvKey: "DISCORD_ROLE_ZIVI_ANWAERTER_1"   },
  { min:  100, tier: 1, tierLabel: "II",  label: "Zivi-Anwärter", emoji: "📋", color: "text-zinc-400",   bg: "bg-zinc-500/10",   border: "border-zinc-500/20",   discordRoleEnvKey: "DISCORD_ROLE_ZIVI_ANWAERTER_2"   },
  { min:  200, tier: 1, tierLabel: "III", label: "Zivi-Anwärter", emoji: "📋", color: "text-zinc-400",   bg: "bg-zinc-500/10",   border: "border-zinc-500/20",   discordRoleEnvKey: "DISCORD_ROLE_ZIVI_ANWAERTER_3"   },
  // 2 – Rollator-Raser
  { min:  350, tier: 2, tierLabel: "I",   label: "Rollator-Raser", emoji: "🛺", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  discordRoleEnvKey: "DISCORD_ROLE_ROLLATOR_RASER_1"   },
  { min:  500, tier: 2, tierLabel: "II",  label: "Rollator-Raser", emoji: "🛺", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  discordRoleEnvKey: "DISCORD_ROLE_ROLLATOR_RASER_2"   },
  { min:  700, tier: 2, tierLabel: "III", label: "Rollator-Raser", emoji: "🛺", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  discordRoleEnvKey: "DISCORD_ROLE_ROLLATOR_RASER_3"   },
  // 3 – Krawall-Rentner
  { min:  950, tier: 3, tierLabel: "I",   label: "Krawall-Rentner", emoji: "😤", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", discordRoleEnvKey: "DISCORD_ROLE_KRAWALL_RENTNER_1"  },
  { min: 1250, tier: 3, tierLabel: "II",  label: "Krawall-Rentner", emoji: "😤", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", discordRoleEnvKey: "DISCORD_ROLE_KRAWALL_RENTNER_2"  },
  { min: 1600, tier: 3, tierLabel: "III", label: "Krawall-Rentner", emoji: "😤", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", discordRoleEnvKey: "DISCORD_ROLE_KRAWALL_RENTNER_3"  },
  // 4 – Denkmalschutz
  { min: 2000, tier: 4, tierLabel: "I",   label: "Denkmalschutz", emoji: "🏛️", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   discordRoleEnvKey: "DISCORD_ROLE_DENKMALSCHUTZ_1"    },
  { min: 2500, tier: 4, tierLabel: "II",  label: "Denkmalschutz", emoji: "🏛️", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   discordRoleEnvKey: "DISCORD_ROLE_DENKMALSCHUTZ_2"    },
  { min: 3100, tier: 4, tierLabel: "III", label: "Denkmalschutz", emoji: "🏛️", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   discordRoleEnvKey: "DISCORD_ROLE_DENKMALSCHUTZ_3"    },
  // 5 – Heimleitung
  { min: 3800, tier: 5, tierLabel: "I",   label: "Heimleitung", emoji: "🏠", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", discordRoleEnvKey: "DISCORD_ROLE_HEIMLEITUNG_1"      },
  { min: 4600, tier: 5, tierLabel: "II",  label: "Heimleitung", emoji: "🏠", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", discordRoleEnvKey: "DISCORD_ROLE_HEIMLEITUNG_2"      },
  { min: 5500, tier: 5, tierLabel: "III", label: "Heimleitung", emoji: "🏠", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", discordRoleEnvKey: "DISCORD_ROLE_HEIMLEITUNG_3"      },
  // 6 – Old Master
  { min: 6500, tier: 6, tierLabel: "I",   label: "Old Master", emoji: "👴", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  discordRoleEnvKey: "DISCORD_ROLE_OLD_MASTER_1"        },
  { min: 8000, tier: 6, tierLabel: "II",  label: "Old Master", emoji: "👴", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  discordRoleEnvKey: "DISCORD_ROLE_OLD_MASTER_2"        },
  { min:10000, tier: 6, tierLabel: "III", label: "Old Master", emoji: "👴", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  discordRoleEnvKey: "DISCORD_ROLE_OLD_MASTER_3"        },
] as const;

export type RankEntry = typeof RANKS[number];

/** Vollständiger Anzeigename, z.B. "Krawall-Rentner II" */
export function getRankFullLabel(rank: RankEntry): string {
  return `${rank.label} ${rank.tierLabel}`;
}

export function getRank(rankPoints: number): RankEntry {
  return [...RANKS].reverse().find(r => rankPoints >= r.min) ?? RANKS[0];
}

export function getNextRank(rankPoints: number): RankEntry | null {
  return RANKS.find(r => r.min > rankPoints) ?? null;
}

/** Gibt die Tailwind-Ring-Klassen für den Avatar basierend auf dem Tier zurück. */
export function getTierRing(rankPoints: number): string {
  return TIER_RINGS[getRank(rankPoints).tierLabel];
}

export function getRankProgress(rankPoints: number): { rank: RankEntry; next: RankEntry | null; pct: number } {
  const rank = getRank(rankPoints);
  const next = getNextRank(rankPoints);
  const pct  = next
    ? Math.min(100, Math.round(((rankPoints - rank.min) / (next.min - rank.min)) * 100))
    : 100;
  return { rank, next, pct };
}
