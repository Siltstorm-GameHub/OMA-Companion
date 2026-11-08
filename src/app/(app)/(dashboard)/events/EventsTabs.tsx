"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { CalendarDays, Target, Users, User } from "@/components/icons";

const TAB_KEYS = ["events", "mine", "predictions", "squads"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function EventsTabsInner({
  eventsPanel,
  myEventsPanel,
  predictionsPanel,
  squadsPanel,
}: {
  eventsPanel: ReactNode;
  /** null = Gast (kein Tab "Meine Events") */
  myEventsPanel: ReactNode | null;
  predictionsPanel: ReactNode;
  squadsPanel: ReactNode;
}) {
  const searchParams = useSearchParams();
  // "duels" = alter Tab-Key (Links aus älteren Benachrichtigungen) → Vorhersagen
  const rawTab = searchParams.get("tab");
  const tabParam = rawTab === "duels" ? "predictions" : rawTab;
  const initialTab: TabKey = (TAB_KEYS as readonly string[]).includes(tabParam ?? "") && (tabParam !== "mine" || myEventsPanel)
    ? (tabParam as TabKey)
    : "events";
  const [active, setActive] = useState<string>(initialTab);

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={setActive}
        className="overflow-x-auto scrollbar-none whitespace-nowrap"
        tabs={[
          { key: "events", label: "Events", icon: CalendarDays },
          ...(myEventsPanel ? [{ key: "mine", label: "Meine Events", icon: User }] : []),
          { key: "predictions", label: "Vorhersagen", icon: Target },
          { key: "squads", label: "Squads", icon: Users },
        ]}
      />
      <TabPanel tabKey="events" active={active}>{eventsPanel}</TabPanel>
      {myEventsPanel && <TabPanel tabKey="mine" active={active}>{myEventsPanel}</TabPanel>}
      <TabPanel tabKey="predictions" active={active}>{predictionsPanel}</TabPanel>
      <TabPanel tabKey="squads" active={active}>{squadsPanel}</TabPanel>
    </div>
  );
}

export default function EventsTabs(props: {
  eventsPanel: ReactNode;
  myEventsPanel: ReactNode | null;
  predictionsPanel: ReactNode;
  squadsPanel: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <EventsTabsInner {...props} />
    </Suspense>
  );
}
