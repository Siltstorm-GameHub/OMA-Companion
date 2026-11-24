"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { CalendarDays, Settings, Target, Users } from "@/components/icons";

// "Meine Events" gibt es nicht mehr als Reiter: die eigenen Anmeldungen zeigen "Für dich" und der
// Filter "Angemeldet" in der Liste. Alte Links (?tab=mine) landen in der Liste mit diesem Filter
// (siehe EventFilterShell).
const TAB_KEYS = ["events", "predictions", "squads"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function EventsTabsInner({
  eventsPanel,
  predictionsPanel,
  squadsPanel,
  loggedIn,
  manageCount = 0,
}: {
  eventsPanel: ReactNode;
  predictionsPanel: ReactNode;
  squadsPanel: ReactNode;
  /** false = Gast (kein Reiter "Verwalten") */
  loggedIn: boolean;
  /** Offene Aufgaben in der Verwaltung (Zahl am Reiter "Verwalten") */
  manageCount?: number;
}) {
  const searchParams = useSearchParams();
  // "duels" = alter Tab-Key (Links aus älteren Benachrichtigungen) → Vorhersagen
  const rawTab = searchParams.get("tab");
  const tabParam = rawTab === "duels" ? "predictions" : rawTab;
  const initialTab: TabKey = (TAB_KEYS as readonly string[]).includes(tabParam ?? "") ? (tabParam as TabKey) : "events";
  const [active, setActive] = useState<string>(initialTab);
  const router = useRouter();
  // "Verwalten" hat eine eigene Route (/events/verwalten mit Unterseiten) — der Reiter führt dorthin
  const onChange = (key: string) => (key === "manage" ? router.push("/events/verwalten") : setActive(key));

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={onChange}
        className="overflow-x-auto scrollbar-none whitespace-nowrap"
        tabs={[
          { key: "events", label: "Events", icon: CalendarDays },
          { key: "predictions", label: "Vorhersagen", icon: Target },
          { key: "squads", label: "Squads", icon: Users },
          ...(loggedIn ? [{ key: "manage", label: "Verwalten", icon: Settings, count: manageCount }] : []),
        ]}
      />
      <TabPanel tabKey="events" active={active}>{eventsPanel}</TabPanel>
      <TabPanel tabKey="predictions" active={active}>{predictionsPanel}</TabPanel>
      <TabPanel tabKey="squads" active={active}>{squadsPanel}</TabPanel>
    </div>
  );
}

export default function EventsTabs(props: {
  eventsPanel: ReactNode;
  predictionsPanel: ReactNode;
  squadsPanel: ReactNode;
  loggedIn: boolean;
  manageCount?: number;
}) {
  return (
    <Suspense fallback={null}>
      <EventsTabsInner {...props} />
    </Suspense>
  );
}
