"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getRank } from "@/lib/points";

interface Props {
  level: number;
  points: number;
}

export function LevelUpCelebration({ level, points }: Props) {
  const prevLevel = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("oma-last-level");
    const lastLevel = stored ? parseInt(stored) : null;

    if (lastLevel !== null && level > lastLevel) {
      const rank = getRank(points);
      const isNewRank = getRank(points).label !== getRank(points - (level - lastLevel) * 100).label;

      toast(
        isNewRank ? `🎉 Rang erreicht: ${rank.label}!` : `⬆️ Level ${level} erreicht!`,
        {
          description: isNewRank
            ? `Du bist jetzt Level ${level} und hast den Rang "${rank.label}" erreicht!`
            : `Weiter so! Du hast Level ${level} erreicht.`,
          duration: 6000,
          style: {
            background: "rgba(15,15,23,0.95)",
            border: "1px solid rgba(244,63,94,0.3)",
            boxShadow: "0 0 32px rgba(244,63,94,0.15)",
          },
        }
      );
    }

    localStorage.setItem("oma-last-level", String(level));
    prevLevel.current = level;
  }, [level, points]);

  return null;
}
