"use client";

// ============================================
// OMA Gems — die drei Spielmodi im Spielen-Reiter
// ============================================
// Kampagne (Level 1–12, die Einführung, von Anfang an offen), Der Aufstieg (Stufen ab 13, öffnet nach
// Kampagnen-Level 5) und Last Stand (Wellenmodus, öffnet nach Level 12). Eine Leiste schaltet zwischen
// ihnen um; jeder Modus hat sein eigenes Panel. Ranglisten-Vorschauen reicht der Hub als fertige Elemente
// herein (Server-Daten).

import { useState, type ReactNode } from "react";
import { Lock } from "@/components/icons";
import type { GemsPlayStatus } from "@/lib/gems/play-status";
import CampaignMap from "./CampaignMap";
import LastStandPanel from "./LastStandPanel";

export type PlayMode = "campaign" | "aufstieg" | "laststand";

const MODES: { key: PlayMode; label: string }[] = [
  { key: "campaign", label: "Kampagne" },
  { key: "aufstieg", label: "Der Aufstieg" },
  { key: "laststand", label: "Last Stand" },
];

export default function PlayModes({
  defaultMode,
  aufstiegUnlocked,
  lastStand,
  seasonLabel,
  seasonDaysLeft,
  coinsPerWave,
  aufstiegExtras,
  lastStandExtras,
}: {
  defaultMode: PlayMode;
  aufstiegUnlocked: boolean;
  lastStand: GemsPlayStatus["lastStand"];
  seasonLabel: string;
  seasonDaysLeft: number;
  coinsPerWave: number;
  /** Rangliste der Aufstiegs-Saison. */
  aufstiegExtras: ReactNode;
  /** Rangliste der Last-Stand-Saison. */
  lastStandExtras: ReactNode;
}) {
  const [mode, setMode] = useState<PlayMode>(defaultMode);
  const locked: Record<PlayMode, boolean> = { campaign: false, aufstieg: !aufstiegUnlocked, laststand: !lastStand.unlocked };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Spielmodus" className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.05] p-1">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-semibold transition-colors sm:text-sm ${
              mode === key ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            {locked[key] && <Lock className="h-3 w-3 shrink-0" />}
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-6">
        {mode === "campaign" && <CampaignMap view="chapter" />}
        {mode === "aufstieg" && (
          <>
            <CampaignMap view="aufstieg" />
            {aufstiegUnlocked && aufstiegExtras}
          </>
        )}
        {mode === "laststand" && (
          <>
            <LastStandPanel
              status={lastStand}
              seasonLabel={seasonLabel}
              seasonDaysLeft={seasonDaysLeft}
              coinsPerWave={coinsPerWave}
            />
            {lastStand.unlocked && lastStandExtras}
          </>
        )}
      </div>
    </div>
  );
}
