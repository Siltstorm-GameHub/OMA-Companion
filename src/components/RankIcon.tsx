"use client";

import { getRank, getRankFullLabel } from "@/lib/ranks";

interface RankIconProps {
  rankPoints: number;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
} as const;

export default function RankIcon({ rankPoints, size = "md" }: RankIconProps) {
  const rank      = getRank(rankPoints);
  const fullLabel = getRankFullLabel(rank);

  return (
    <span className={`select-none ${SIZE[size]}`} title={fullLabel}>
      {rank.emoji}
    </span>
  );
}
