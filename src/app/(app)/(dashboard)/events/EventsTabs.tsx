"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { CalendarDays, Target, Users } from "@/components/icons";

function EventsTabsInner({
  eventsPanel,
  predictionsPanel,
  squadsPanel,
}: {
  eventsPanel: ReactNode;
  predictionsPanel: ReactNode;
  squadsPanel: ReactNode;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "duels" || tabParam === "squads" ? tabParam : "events";
  const [active, setActive] = useState(initialTab);

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={setActive}
        tabs={[
          { key: "events", label: "Events", icon: CalendarDays },
          { key: "duels", label: "Vorhersagen", icon: Target },
          { key: "squads", label: "Squads", icon: Users },
        ]}
      />
      <TabPanel tabKey="events" active={active}>{eventsPanel}</TabPanel>
      <TabPanel tabKey="duels" active={active}>{predictionsPanel}</TabPanel>
      <TabPanel tabKey="squads" active={active}>{squadsPanel}</TabPanel>
    </div>
  );
}

export default function EventsTabs(props: { eventsPanel: ReactNode; predictionsPanel: ReactNode; squadsPanel: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <EventsTabsInner {...props} />
    </Suspense>
  );
}
