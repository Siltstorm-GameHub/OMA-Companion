"use client";

import { FileText, Zap, Flame, Landmark, Crown, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getRank, getRankFullLabel, RANK_RING } from "@/lib/ranks";

interface RankIconProps {
  rankPoints: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_PX = { sm: 20, md: 26, lg: 36 } as const;

/** Nur noch das Icon pro Rang — die Farben kommen aus RANK_RING, damit Hexagon und Ring nie auseinanderlaufen. */
const TIER_ICON: Record<number, LucideIcon> = {
  1: FileText,
  2: Zap,
  3: Flame,
  4: Landmark,
  5: Crown,
  6: Trophy,
};

function getTierConfig(tier: number) {
  const ring = RANK_RING[tier] ?? RANK_RING[1];
  return {
    icon:   TIER_ICON[tier] ?? TIER_ICON[1],
    dark:   ring.c1,
    light:  ring.c2,
    stroke: ring.c3,
    glow:   `${ring.c3}8c`, // ~55% Alpha
  };
}

const PIP_COUNT = { I: 1, II: 2, III: 3 } as const;

export default function RankIcon({ rankPoints, size = "md" }: RankIconProps) {
  const rank     = getRank(rankPoints);
  const label    = getRankFullLabel(rank);
  const px       = SIZE_PX[size];
  const cfg      = getTierConfig(rank.tier);
  const Icon     = cfg.icon;
  const activePips = PIP_COUNT[rank.tierLabel] ?? 1;

  // Hexagon SVG: flat-top, viewBox 32×28
  const hexH   = Math.round(px * 28 / 32);
  const iconSz = Math.round(px * 0.44);
  const pipSz  = Math.max(3, Math.round(px * 0.14));
  const gradId = `rk-g-${rank.tier}`;

  return (
    <span
      className="inline-flex flex-col items-center select-none"
      style={{ gap: 2 }}
      title={label}
    >
      {/* Hexagon + Icon wrapper */}
      <span className="relative" style={{ width: px, height: hexH }}>
        {/* SVG Hexagon */}
        <svg
          viewBox="0 0 32 28"
          width={px}
          height={hexH}
          style={{ display: "block", filter: `drop-shadow(0 0 ${Math.round(px * 0.22)}px ${cfg.glow})` }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor={cfg.dark}  />
              <stop offset="100%" stopColor={cfg.light} />
            </linearGradient>
          </defs>
          {/* Flat-top hexagon path */}
          <path
            d="M16 1 L30 8.5 L30 19.5 L16 27 L2 19.5 L2 8.5 Z"
            fill={`url(#${gradId})`}
            stroke={cfg.stroke}
            strokeWidth="1.2"
          />
          {/* Inner highlight line at top */}
          <path
            d="M8 10 L16 5.5 L24 10"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>

        {/* Lucide icon centered over hexagon */}
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ paddingTop: Math.round(hexH * 0.05) }}
        >
          <Icon
            style={{
              width: iconSz,
              height: iconSz,
              color: "white",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
              strokeWidth: 1.8,
            }}
          />
        </span>
      </span>

      {/* Tier pips */}
      <span className="flex items-center" style={{ gap: pipSz * 0.6 }}>
        {[1, 2, 3].map(i => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: pipSz,
              height: pipSz,
              borderRadius: "50%",
              background: cfg.light,
              opacity: i <= activePips ? 1 : 0.18,
              boxShadow: i <= activePips ? `0 0 ${pipSz}px ${cfg.glow}` : "none",
            }}
          />
        ))}
      </span>
    </span>
  );
}
