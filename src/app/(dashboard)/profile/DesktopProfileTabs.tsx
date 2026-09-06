"use client";
import { useState, type ReactNode } from "react";
import { LayoutGrid, Briefcase } from "lucide-react";

type Tab = "overview" | "community_jobs";

/**
 * Reiter-Leiste für die Desktop-Profilseite — Community-Jobs bekommt hier
 * (wie schon auf Mobile, siehe ProfileMobileView.tsx) einen eigenen Reiter
 * statt einer festen Sektion im Haupt-Layout. `overview`/`communityJobs`
 * kommen als bereits gerenderte Server-Component-Bäume rein (page.tsx bleibt
 * ein Server Component) — nur das Umschalten passiert clientseitig.
 */
export default function DesktopProfileTabs({ overview, communityJobs }: { overview: ReactNode; communityJobs: ReactNode }) {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { key: "overview", label: "Übersicht", icon: LayoutGrid },
    { key: "community_jobs", label: "Community-Jobs", icon: Briefcase },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 bg-gray-900 border border-white/5 rounded-xl p-1 w-fit">
        {tabs.map(t => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-teal-600/20 text-teal-300 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              }`}>
              <Icon className={`w-4 h-4 ${active ? "text-teal-400" : "text-gray-600"}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div hidden={tab !== "overview"}>{overview}</div>
      <div hidden={tab !== "community_jobs"}>{communityJobs}</div>
    </div>
  );
}
