"use client";
import { useState, type ReactNode } from "react";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { CalendarDays, Swords } from "lucide-react";

export default function EventsTabs({
  eventsPanel,
  duelsPanel,
}: {
  eventsPanel: ReactNode;
  duelsPanel: ReactNode;
}) {
  const [active, setActive] = useState("events");

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={setActive}
        tabs={[
          { key: "events", label: "Events", icon: CalendarDays },
          { key: "duels", label: "Duelle & Vorhersagen", icon: Swords },
        ]}
      />
      <TabPanel tabKey="events" active={active}>{eventsPanel}</TabPanel>
      <TabPanel tabKey="duels" active={active}>{duelsPanel}</TabPanel>
    </div>
  );
}
