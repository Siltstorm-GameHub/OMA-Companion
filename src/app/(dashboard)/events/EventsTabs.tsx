"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { CalendarDays, Target } from "lucide-react";

function EventsTabsInner({
  eventsPanel,
  predictionsPanel,
}: {
  eventsPanel: ReactNode;
  predictionsPanel: ReactNode;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "duels" ? "duels" : "events";
  const [active, setActive] = useState(initialTab);

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={setActive}
        tabs={[
          { key: "events", label: "Events", icon: CalendarDays },
          { key: "duels", label: "Vorhersagen", icon: Target },
        ]}
      />
      <TabPanel tabKey="events" active={active}>{eventsPanel}</TabPanel>
      <TabPanel tabKey="duels" active={active}>{predictionsPanel}</TabPanel>
    </div>
  );
}

export default function EventsTabs(props: { eventsPanel: ReactNode; predictionsPanel: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <EventsTabsInner {...props} />
    </Suspense>
  );
}
