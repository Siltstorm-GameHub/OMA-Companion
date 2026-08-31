"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/admin/Tabs";
import { Swords, LayoutGrid, Users } from "lucide-react";

type TabKey = "kampf" | "karten" | "community";

function isTabKey(v: string | null): v is TabKey {
  return v === "kampf" || v === "karten" || v === "community";
}

function BattleCardsTabsInner({
  kampfPanel,
  kartenPanel,
  communityPanel,
}: {
  kampfPanel: ReactNode;
  kartenPanel: ReactNode;
  communityPanel: ReactNode;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  // "duels"/"challenges" bleiben als Alt-Link-Kompatibilität erhalten (z.B. alte Benachrichtigungen).
  const initialTab: TabKey = isTabKey(requestedTab)
    ? requestedTab
    : requestedTab === "duels" || requestedTab === "challenges"
      ? "community"
      : "kampf";
  const [active, setActive] = useState<TabKey>(initialTab);

  return (
    <div className="space-y-5">
      <Tabs
        active={active}
        onChange={(k) => setActive(k as TabKey)}
        tabs={[
          { key: "kampf", label: "Kampf", icon: Swords },
          { key: "karten", label: "Karten", icon: LayoutGrid },
          { key: "community", label: "Community", icon: Users },
        ]}
      />
      <TabPanel tabKey="kampf" active={active}>{kampfPanel}</TabPanel>
      <TabPanel tabKey="karten" active={active}>{kartenPanel}</TabPanel>
      <TabPanel tabKey="community" active={active}>{communityPanel}</TabPanel>
    </div>
  );
}

export default function BattleCardsTabs(props: { kampfPanel: ReactNode; kartenPanel: ReactNode; communityPanel: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <BattleCardsTabsInner {...props} />
    </Suspense>
  );
}
