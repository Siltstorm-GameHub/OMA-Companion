"use client";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Briefcase, Settings } from "@/components/icons";

export type ProfileTabKey = "overview" | "community_jobs" | "settings";

const TAB_META: Record<ProfileTabKey, { label: string; icon: typeof LayoutGrid }> = {
  overview: { label: "Übersicht", icon: LayoutGrid },
  community_jobs: { label: "Community-Jobs", icon: Briefcase },
  settings: { label: "Einstellungen", icon: Settings },
};

/** Andere Komponenten (z.B. Profil-Vervollständigung) können per Event einen Reiter öffnen. */
export const PROFILE_SHOW_TAB_EVENT = "profile-show-tab";

/**
 * Reiter der Profilseite — EIN responsives Layout für Desktop und Handy. Alle Panels kommen
 * als bereits server-gerenderte Bäume rein; Community-Jobs wird erst beim ersten Öffnen
 * gemountet (lädt selbst per fetch und pollt), die übrigen bleiben gemountet und werden nur
 * versteckt, damit Formulare beim Wechseln ihren Zustand behalten.
 */
export default function ProfileTabs({ panels, initialTab }: {
  panels: Partial<Record<ProfileTabKey, ReactNode>>;
  initialTab: ProfileTabKey;
}) {
  const keys = (Object.keys(TAB_META) as ProfileTabKey[]).filter(k => panels[k] !== undefined);
  const [tab, setTab] = useState<ProfileTabKey>(keys.includes(initialTab) ? initialTab : keys[0]);
  const [visited, setVisited] = useState<Set<ProfileTabKey>>(() => new Set([tab]));

  function select(key: ProfileTabKey) {
    setTab(key);
    setVisited(v => (v.has(key) ? v : new Set(v).add(key)));
  }

  useEffect(() => {
    const onShow = (e: Event) => {
      const key = (e as CustomEvent<ProfileTabKey>).detail;
      if (key && TAB_META[key]) select(key);
    };
    window.addEventListener(PROFILE_SHOW_TAB_EVENT, onShow);
    return () => window.removeEventListener(PROFILE_SHOW_TAB_EVENT, onShow);
  }, []);

  return (
    <div className="space-y-5">
      {keys.length > 1 && (
        <div role="tablist" aria-label="Profilbereiche"
          className="grid grid-cols-3 sm:flex gap-1.5 bg-gray-900 border border-white/5 rounded-xl p-1 sm:w-fit">
          {keys.map(key => {
            const active = tab === key;
            const { label, icon: Icon } = TAB_META[key];
            return (
              <button key={key} role="tab" aria-selected={active} onClick={() => select(key)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-colors ${
                  active ? "bg-teal-600/20 text-teal-300 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                }`}>
                <Icon className={`w-4 h-4 ${active ? "text-teal-400" : "text-gray-600"}`} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {keys.map(key => (
        <div key={key} role="tabpanel" hidden={tab !== key}>
          {key === "community_jobs" && !visited.has(key) ? null : panels[key]}
        </div>
      ))}
    </div>
  );
}
