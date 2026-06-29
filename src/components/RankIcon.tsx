"use client";

import { getRank, getRankFullLabel, TIER_RINGS } from "@/lib/ranks";

interface RankIconProps {
  rankPoints: number;
  /** Nur Icon mit Rahmen, kein Text. Tooltip zeigt den vollen Rang-Namen. */
  compact?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: { box: "w-6 h-6 text-base",  text: "text-[10px]" },
  md: { box: "w-8 h-8 text-xl",    text: "text-xs"     },
  lg: { box: "w-10 h-10 text-2xl", text: "text-sm"     },
} as const;

export default function RankIcon({ rankPoints, compact = false, size = "md" }: RankIconProps) {
  const rank      = getRank(rankPoints);
  const fullLabel = getRankFullLabel(rank);
  const ringClass = TIER_RINGS[rank.tierLabel];
  const s         = SIZE[size];

  const icon = (
    <span
      className={`inline-flex items-center justify-center rounded-full ${s.box} ${ringClass} ${rank.bg} select-none`}
      title={fullLabel}
    >
      {rank.emoji}
    </span>
  );

  if (compact) return icon;

  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className={`font-semibold ${rank.color} ${s.text}`}>{fullLabel}</span>
    </span>
  );
}
