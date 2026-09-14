"use client";

// ============================================
// Grobe Gewinnchancen-Einschätzung — kleines Badge
// ============================================
// Zeigt nur eine grobe Einstufung ("Überlegen"/"Knapp stärker"/…), keine
// Prozentzahl — siehe lib/battle-cards/matchup-strength.ts.

import type { MatchupStrength } from "@/lib/battle-cards/matchup-strength";
import { MATCHUP_STRENGTH_LABEL } from "@/lib/battle-cards/matchup-strength";
import { MOBA_ICON, type MobaIconName } from "@/lib/battle-cards/moba-icons";

// Kein Kit-Icon unterscheidet "deutlich" von "knapp" (nur eine Pfeilrichtung
// verfügbar, kein Doppelpfeil wie TrendingUp/-Down) — die Stärke transportiert
// hier ausschließlich der Text-Label, das Icon zeigt nur noch die Richtung.
const CONFIG: Record<MatchupStrength, { color: string; icon: MobaIconName }> = {
  superior: { color: "#34d399", icon: "chevronUp" },
  slightlyStronger: { color: "#5eead4", icon: "chevronUp" },
  slightlyWeaker: { color: "#fbbf24", icon: "chevronDown" },
  inferior: { color: "#f87171", icon: "chevronDown" },
};

export default function MatchupBadge({ strength }: { strength: MatchupStrength | null | undefined }) {
  if (!strength) return null;
  const { color, icon } = CONFIG[strength];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: `${color}1f`, color }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MOBA_ICON[icon]} alt="" aria-hidden className="w-2.5 h-2.5 object-contain" />
      {MATCHUP_STRENGTH_LABEL[strength]}
    </span>
  );
}
