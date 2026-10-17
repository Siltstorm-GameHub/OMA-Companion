"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { LayoutGrid, ShoppingBag, Swords } from "@/components/icons";

type TabKey = "spielen" | "sammlung" | "laden";

function isTabKey(v: string | null): v is TabKey {
  return v === "spielen" || v === "sammlung" || v === "laden";
}

// Alte Reiter-Namen (aus Benachrichtigungen, Lesezeichen, älteren Links) landen im passenden neuen Reiter.
const LEGACY_TABS: Record<string, TabKey> = {
  held: "spielen",
  welt: "spielen",
  arena: "spielen",
  kampf: "spielen",
  kampagne: "spielen",
  community: "spielen",
  duels: "spielen",
  challenges: "spielen",
  karten: "sammlung",
};

function tabFromParam(v: string | null): TabKey {
  if (isTabKey(v)) return v;
  return (v && LEGACY_TABS[v]) || "spielen";
}

function GemsTabsInner({
  spielenPanel,
  sammlungPanel,
  ladenPanel,
  ladenBadge = 0,
}: {
  spielenPanel: ReactNode;
  sammlungPanel: ReactNode;
  ladenPanel: ReactNode;
  ladenBadge?: number;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState<TabKey>(() => tabFromParam(requestedTab));
  // Links innerhalb des Hubs (z. B. "?tab=laden") ändern nur die URL — Reiter beim Wechsel nachziehen.
  const [seenParam, setSeenParam] = useState(requestedTab);
  if (seenParam !== requestedTab) {
    setSeenParam(requestedTab);
    setActive(tabFromParam(requestedTab));
  }

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={(key) => setActive(key as TabKey)}
        tabs={[
          { key: "spielen", label: "Spielen", icon: Swords },
          { key: "sammlung", label: "Sammlung", icon: LayoutGrid },
          { key: "laden", label: ladenBadge > 0 ? `Shop (${ladenBadge})` : "Shop", icon: ShoppingBag },
        ]}
      />
      <TabPanel tabKey="spielen" active={active}>{spielenPanel}</TabPanel>
      <TabPanel tabKey="sammlung" active={active}>{sammlungPanel}</TabPanel>
      <TabPanel tabKey="laden" active={active}>{ladenPanel}</TabPanel>
    </div>
  );
}

export default function GemsTabs(props: {
  spielenPanel: ReactNode;
  sammlungPanel: ReactNode;
  ladenPanel: ReactNode;
  ladenBadge?: number;
}) {
  return (
    <Suspense fallback={null}>
      <GemsTabsInner {...props} />
    </Suspense>
  );
}
