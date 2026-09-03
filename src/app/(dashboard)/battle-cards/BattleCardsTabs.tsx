"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TabPanel } from "@/components/admin/Tabs";
import { Swords, LayoutGrid, Users, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type TabKey = "kampf" | "kampagne" | "karten" | "community";

function isTabKey(v: string | null): v is TabKey {
  return v === "kampf" || v === "kampagne" || v === "karten" || v === "community";
}

// Clash-Royale-artige Navigation: eine Banner-Leiste, aus der der aktive
// Reiter als rundes, farbig umrandetes Medaillon nach oben "herauspoppt" —
// inaktive Reiter bleiben klein und grau flach in der Leiste sitzen.
const TABS: { key: TabKey; label: string; icon: LucideIcon; accent: string; accentDark: string }[] = [
  { key: "kampf", label: "Kampf", icon: Swords, accent: "#fb7185", accentDark: "#9f1239" },
  { key: "kampagne", label: "Kampagne", icon: Map, accent: "#34d399", accentDark: "#065f46" },
  { key: "karten", label: "Karten", icon: LayoutGrid, accent: "#a78bfa", accentDark: "#5b21b6" },
  { key: "community", label: "Community", icon: Users, accent: "#fbbf24", accentDark: "#b45309" },
];

function BattleCardsTabsInner({
  kampfPanel,
  kampagnePanel,
  kartenPanel,
  communityPanel,
  communityBadge = 0,
}: {
  kampfPanel: ReactNode;
  kampagnePanel: ReactNode;
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
      <div
        className="flex items-end justify-around gap-1 px-2 pt-8 pb-2 rounded-2xl border border-white/10"
        style={{
          background: "linear-gradient(180deg, #232838 0%, #14171f 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 0 rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.45)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          const showBadge = tab.key === "community" && communityBadge > 0;
          return (
            <motion.button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              aria-current={isActive ? "page" : undefined}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center gap-1 flex-1"
            >
              {isActive ? (
                <motion.div
                  layoutId="tab-medallion"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative -mt-9 w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 28%, ${tab.accent}, ${tab.accentDark})`,
                    boxShadow: `0 0 0 3px #14171f, 0 0 0 5px ${tab.accent}88, 0 6px 14px rgba(0,0,0,0.55), 0 0 22px ${tab.accent}77`,
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 }}
                  >
                    <Icon className="w-7 h-7 text-white" strokeWidth={2.4} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }} />
                  </motion.div>
                  <AnimatePresence>
                    {showBadge && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#14171f] shadow-md"
                      >
                        {communityBadge > 9 ? "9+" : communityBadge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-500" strokeWidth={2} />
                  {showBadge && (
                    <span className="absolute -top-0.5 right-0 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#14171f]">
                      {communityBadge > 9 ? "9+" : communityBadge}
                    </span>
                  )}
                </div>
              )}
              <span
                className="text-[10px] font-black uppercase tracking-wide transition-colors"
                style={{ color: isActive ? tab.accent : "#6b7280" }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <TabPanel tabKey="kampf" active={active}>{kampfPanel}</TabPanel>
      <TabPanel tabKey="kampagne" active={active}>{kampagnePanel}</TabPanel>
      <TabPanel tabKey="karten" active={active}>{kartenPanel}</TabPanel>
      <TabPanel tabKey="community" active={active}>{communityPanel}</TabPanel>
    </div>
  );
}

export default function BattleCardsTabs(props: {
  kampfPanel: ReactNode;
  kampagnePanel: ReactNode;
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
