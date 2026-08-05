import type { CSSProperties } from "react";

/**
 * Ring-Tokens pro Rang. Der Rang bestimmt Farbe, Grundtempo und Glow-Stärke,
 * die Stufe (I/II/III) bestimmt Form und Tempo-Faktor — siehe .rr-t1/2/3 in globals.css.
 * Die Palette ist bewusst weit gespreizt: Grau → Grün → Orange → Blau → Magenta → Gold.
 * Teal bleibt frei, das ist die Markenfarbe der App.
 */
type RingColors = { c1: string; c2: string; c3: string; glow: string; glowColor: string };
type RingTokens = RingColors & { speed: string; light: RingColors };

/**
 * Pro Rang zwei Paletten. `light` ist kein Helligkeits-Tweak, sondern eine Umkehrung
 * der Logik: Auf dem fast schwarzen Grund trägt der helle Pastellton (c2) den Ring,
 * auf hellem Grund verschwindet genau der — dort muss der gesättigte Mittelton tragen.
 * Der Glow wird hell zusätzlich zurückgenommen, sonst wirkt er wie ein Schmutzrand.
 */
export const RANK_RING: Record<number, RingTokens> = {
  1: {
    c1: "#3f3f46", c2: "#a1a1aa", c3: "#52525b", speed: "12s", glow:  "0px", glowColor: "transparent",
    light: { c1: "#a1a1aa", c2: "#3f3f46", c3: "#71717a", glow: "0px", glowColor: "transparent" },
  },
  2: {
    c1: "#14532d", c2: "#4ade80", c3: "#22c55e", speed: "11s", glow: "10px", glowColor: "rgba(74,222,128,0.45)",
    light: { c1: "#4ade80", c2: "#166534", c3: "#16a34a", glow: "6px", glowColor: "rgba(22,101,52,0.28)" },
  },
  3: {
    c1: "#7c2d12", c2: "#fb923c", c3: "#ea580c", speed: "10s", glow: "12px", glowColor: "rgba(249,115,22,0.45)",
    light: { c1: "#fb923c", c2: "#7c2d12", c3: "#c2410c", glow: "7px", glowColor: "rgba(124,45,18,0.28)" },
  },
  4: {
    c1: "#1e3a8a", c2: "#93c5fd", c3: "#3b82f6", speed:  "9s", glow: "14px", glowColor: "rgba(96,165,250,0.45)",
    light: { c1: "#93c5fd", c2: "#1e3a8a", c3: "#2563eb", glow: "8px", glowColor: "rgba(30,58,138,0.28)" },
  },
  5: {
    c1: "#701a75", c2: "#f0abfc", c3: "#c026d3", speed:  "8s", glow: "16px", glowColor: "rgba(232,121,249,0.50)",
    light: { c1: "#f0abfc", c2: "#701a75", c3: "#a21caf", glow: "9px", glowColor: "rgba(112,26,117,0.30)" },
  },
  6: {
    c1: "#78350f", c2: "#fef08a", c3: "#f59e0b", speed:  "6s", glow: "22px", glowColor: "rgba(252,211,77,0.60)",
    light: { c1: "#fcd34d", c2: "#78350f", c3: "#b45309", glow: "12px", glowColor: "rgba(120,53,15,0.32)" },
  },
};

/**
 * CSS-Klassen für den Rang-Ring. Trägt nur noch die Form (Stufe) —
 * die Farbe kommt über getRingStyle() als Custom Properties dazu.
 */
export function getRingClass(rankPoints: number): string {
  const rank = getRank(rankPoints);
  const tierIdx = rank.tierLabel.length; // "I" → 1, "II" → 2, "III" → 3
  const apex = rank.tier === 6 && tierIdx === 3 ? " rr-apex" : "";
  return `rank-ring rr-t${tierIdx}${apex}`;
}

/**
 * Farb-/Tempo-Tokens des Rangs als Inline-Style. Gehört auf dasselbe Element wie getRingClass().
 *
 * Beide Paletten werden als rohe `d`- und `l`-Variablen ausgegeben; welche gilt, entscheidet das CSS
 * über `[data-theme="light"]`. Direkt `--rr-c1` zu setzen würde nicht funktionieren — Inline-Styles
 * schlagen Stylesheet-Regeln, der Theme-Override käme nie an.
 */
export function getRingStyle(rankPoints: number): CSSProperties {
  const ring = RANK_RING[getRank(rankPoints).tier] ?? RANK_RING[1];
  return {
    "--rr-dc1": ring.c1,
    "--rr-dc2": ring.c2,
    "--rr-dc3": ring.c3,
    "--rr-dglow": ring.glow,
    "--rr-dglowc": ring.glowColor,
    "--rr-lc1": ring.light.c1,
    "--rr-lc2": ring.light.c2,
    "--rr-lc3": ring.light.c3,
    "--rr-lglow": ring.light.glow,
    "--rr-lglowc": ring.light.glowColor,
    "--rr-speed": ring.speed,
  } as CSSProperties;
}

/** @deprecated Bitte getRingClass() verwenden */
export function getTierRing(rankPoints: number): string {
  return getRingClass(rankPoints);
}

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


export function getRankProgress(rankPoints: number): { rank: RankEntry; next: RankEntry | null; pct: number } {
  const rank = getRank(rankPoints);
  const next = getNextRank(rankPoints);
  const pct  = next
    ? Math.min(100, Math.round(((rankPoints - rank.min) / (next.min - rank.min)) * 100))
    : 100;
  return { rank, next, pct };
}
