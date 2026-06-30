"use client";

import { FileText, Zap, Flame, Landmark, Crown, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getRank, getRankFullLabel } from "@/lib/ranks";

interface RankIconProps {
  rankPoints: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_PX = { sm: 20, md: 26, lg: 36 } as const;

const TIER_CONFIG: Record<number, {
  icon:   LucideIcon;
  dark:   string;
  light:  string;
  stroke: string;
  glow:   string;
}> = {
  1: { icon: FileText, dark: "#3f3f46", light: "#a1a1aa", stroke: "#71717a", glow: "rgba(161,161,170,0.55)" },
  2: { icon: Zap,      dark: "#14532d", light: "#4ade80", stroke: "#16a34a", glow: "rgba(74,222,128,0.55)"  },
  3: { icon: Flame,    dark: "#7c2d12", light: "#f97316", stroke: "#dc2626", glow: "rgba(249,115,22,0.55)"  },
  4: { icon: Landmark, dark: "#1e3a8a", light: "#60a5fa", stroke: "#6366f1", glow: "rgba(96,165,250,0.55)"  },
  5: { icon: Crown,    dark: "#581c87", light: "#a855f7", stroke: "#db2777", glow: "rgba(168,85,247,0.55)"  },
  6: { icon: Trophy,   dark: "#78350f", light: "#fcd34d", stroke: "#d97706", glow: "rgba(252,211,77,0.65)"  },
};

const PIP_COUNT = { I: 1, II: 2, III: 3 } as const;

export default function RankIcon({ rankPoints, size = "md" }: RankIconProps) {
  const rank     = getRank(rankPoints);
  const label    = getRankFullLabel(rank);
  const px       = SIZE_PX[size];
  const cfg      = TIER_CONFIG[rank.tier] ?? TIER_CONFIG[1];
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
