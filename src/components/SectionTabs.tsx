"use client";
import { useState, type ReactNode } from "react";

export type SectionTab = { key: string; label: ReactNode; panel: ReactNode };

/**
 * Schlichte Reiter für einen Abschnitt (z.B. Tabelle: Saison · All-Time · Archiv). Panels rendert der
 * Server; inaktive bleiben im DOM (hidden), damit Sprunganker wie #all-time weiter funktionieren.
 */
export default function SectionTabs({ tabs, ariaLabel, initial }: { tabs: SectionTab[]; ariaLabel: string; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  if (tabs.length === 0) return null;
  if (tabs.length === 1) return <>{tabs[0].panel}</>;
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={ariaLabel} className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={active === t.key} id={`tab-${t.key}`} aria-controls={`panel-${t.key}`}
            onClick={() => setActive(t.key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active === t.key ? "border-teal-400 bg-teal-500 text-teal-950" : "border-line-strong text-gray-300 hover:border-line-strong hover:bg-line"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map(t => (
        <div key={t.key} role="tabpanel" id={`panel-${t.key}`} aria-labelledby={`tab-${t.key}`} hidden={active !== t.key}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
