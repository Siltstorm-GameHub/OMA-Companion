"use client";

// ============================================
// Rangliste — Umschalter zwischen Gesamt / OMA Duels / OMA Gems
// ============================================
// OMA-Duels- und OMA-Gems-PvP-Siege zählen serverseitig bereits gemeinsam in
// einen Saison-Sieger (siehe leaderboard.ts) — hier lässt sich zusätzlich pro
// Modus einzeln nachsehen, welcher Anteil davon jeweils stammt.

import { useState } from "react";
import LeaderboardList from "./LeaderboardList";
import type { LeaderboardRow } from "@/lib/battle-cards/leaderboard";

type Tab = "overall" | "duels" | "gems";

const TABS: { key: Tab; label: string }[] = [
  { key: "overall", label: "Gesamt" },
  { key: "duels", label: "OMA Duels" },
  { key: "gems", label: "OMA Gems" },
];

export default function LeaderboardTabs({
  overall,
  duels,
  gems,
  viewerId,
}: {
  overall: LeaderboardRow[];
  duels: LeaderboardRow[];
  gems: LeaderboardRow[];
  viewerId: string;
}) {
  const [tab, setTab] = useState<Tab>("overall");
  const rows = tab === "overall" ? overall : tab === "duels" ? duels : gems;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 p-1 rounded-full bg-black/30 border border-[color:var(--moba-accent-line)] w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === t.key ? "moba-tab-active" : "text-[color:var(--moba-ink-dim)] hover:text-[color:var(--moba-ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <LeaderboardList rows={rows} viewerId={viewerId} />
    </div>
  );
}
