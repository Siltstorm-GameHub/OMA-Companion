"use client";
// Umschalter zwischen mehreren Ranglisten (z.B. Monat / All-Time / Heute) im Games-Hub.

import { useState, type ReactNode } from "react";

export default function RankingTabs({ tabs }: { tabs: { key: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-lg font-bold text-fg">Rangliste</h2>
        <div className="flex rounded-lg bg-line p-0.5 text-xs font-semibold">
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
      {tabs.map((t) => (
        <div key={t.key} className={active === t.key ? "" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
