"use client";
// Umschalter zwischen mehreren Ranglisten (z.B. Monat / All-Time / Heute) im Games-Hub.

import { useState, type ReactNode } from "react";

export default function RankingTabs({ tabs }: { tabs: { key: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-lg font-bold text-white">Rangliste</h2>
        <div className="flex rounded-lg bg-white/[0.04] p-0.5 text-xs font-semibold">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`px-3 py-1.5 rounded-md transition-colors ${active === t.key ? "bg-teal-500/20 text-teal-200" : "text-gray-400 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((t) => (
        <div key={t.key} className={active === t.key ? "" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
