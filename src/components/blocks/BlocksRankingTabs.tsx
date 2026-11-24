"use client";
// OMA Blocks — Umschalter Monat / All-Time / Versus für die Ranglisten im Games-Hub

import { useState, type ReactNode } from "react";

type Key = "month" | "all" | "versus";

export default function BlocksRankingTabs({ monthLabel, month, allTime, versus }: { monthLabel: string; month: ReactNode; allTime: ReactNode; versus: ReactNode }) {
  const [active, setActive] = useState<Key>("month");
  const tabs: { key: Key; label: string }[] = [
    { key: "month", label: monthLabel },
    { key: "all", label: "All-Time" },
    { key: "versus", label: "Versus" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-lg font-bold text-fg">Rangliste</h2>
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`px-3 py-1.5 rounded-md transition-colors ${active === t.key ? "bg-primary/20 text-primary-fg" : "text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={active === "month" ? "" : "hidden"}>{month}</div>
      <div className={active === "all" ? "" : "hidden"}>{allTime}</div>
      <div className={active === "versus" ? "" : "hidden"}>{versus}</div>
    </div>
  );
}
