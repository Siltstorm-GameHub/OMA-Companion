"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TabPanel } from "@/components/admin/Tabs";
import { Swords, LayoutGrid, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type TabKey = "kampf" | "karten" | "community";

function isTabKey(v: string | null): v is TabKey {
  return v === "kampf" || v === "karten" || v === "community";
}

// Clash-Royale-artige Navigation: dicke, ikonenbetonte Kacheln statt schmaler
// Text-Tabs — der aktive Reiter "hebt sich ab" (Farb-Fläche, Glow, leichter
// Lift), inaktive bleiben flach/grau. Jeder Reiter hat eine eigene Akzentfarbe.
const TABS: { key: TabKey; label: string; icon: LucideIcon; accent: string }[] = [
  { key: "kampf", label: "Kampf", icon: Swords, accent: "#fb7185" },
  { key: "karten", label: "Karten", icon: LayoutGrid, accent: "#a78bfa" },
  { key: "community", label: "Community", icon: Users, accent: "#fbbf24" },
];

function BattleCardsTabsInner({
  kampfPanel,
  kartenPanel,
  communityPanel,
  communityBadge = 0,
}: {
  kampfPanel: ReactNode;
  kartenPanel: ReactNode;
  communityPanel: ReactNode;
  communityBadge?: number;
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
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-black/25 border border-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          const showBadge = tab.key === "community" && communityBadge > 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200 ease-out"
              style={{
                background: isActive
                  ? `linear-gradient(180deg, ${tab.accent}2e, ${tab.accent}12)`
                  : "transparent",
                boxShadow: isActive
                  ? `0 0 0 1.5px ${tab.accent}55, 0 6px 16px -4px ${tab.accent}55, inset 0 1px 0 rgba(255,255,255,0.08)`
                  : "none",
                transform: isActive ? "translateY(-2px)" : "none",
              }}
            >
              <Icon
                className="w-6 h-6 transition-colors"
                style={{ color: isActive ? tab.accent : "#6b7280" }}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span
                className="text-[10px] font-black uppercase tracking-wide transition-colors"
                style={{ color: isActive ? tab.accent : "#6b7280" }}
              >
                {tab.label}
              </span>
              {showBadge && (
                <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#0b0d12] shadow-md">
                  {communityBadge > 9 ? "9+" : communityBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <TabPanel tabKey="kampf" active={active}>{kampfPanel}</TabPanel>
      <TabPanel tabKey="karten" active={active}>{kartenPanel}</TabPanel>
      <TabPanel tabKey="community" active={active}>{communityPanel}</TabPanel>
    </div>
  );
}

export default function BattleCardsTabs(props: {
  kampfPanel: ReactNode;
  kartenPanel: ReactNode;
  communityPanel: ReactNode;
  communityBadge?: number;
}) {
  return (
    <Suspense fallback={null}>
      <BattleCardsTabsInner {...props} />
    </Suspense>
  );
}
