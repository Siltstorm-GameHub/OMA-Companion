"use client";

// ============================================
// Grobe Gewinnchancen-Einschätzung — kleines Badge
// ============================================
// Zeigt nur eine grobe Einstufung ("Überlegen"/"Knapp stärker"/…), keine
// Prozentzahl — siehe lib/battle-cards/matchup-strength.ts.

import { TrendingUp, ArrowUp, ArrowDown, TrendingDown } from "lucide-react";
import type { MatchupStrength } from "@/lib/battle-cards/matchup-strength";
import { MATCHUP_STRENGTH_LABEL } from "@/lib/battle-cards/matchup-strength";

const CONFIG: Record<MatchupStrength, { color: string; icon: typeof TrendingUp }> = {
  superior: { color: "#34d399", icon: TrendingUp },
  slightlyStronger: { color: "#5eead4", icon: ArrowUp },
  slightlyWeaker: { color: "#fbbf24", icon: ArrowDown },
  inferior: { color: "#f87171", icon: TrendingDown },
};

export default function MatchupBadge({ strength }: { strength: MatchupStrength | null | undefined }) {
  if (!strength) return null;
  const { color, icon: Icon } = CONFIG[strength];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: `${color}1f`, color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {MATCHUP_STRENGTH_LABEL[strength]}
    </span>
  );
}
