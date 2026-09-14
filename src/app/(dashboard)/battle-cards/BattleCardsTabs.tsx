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

// MOBA-Style-Reiter: statt runder Medaillons (Clash-Royale-artig) jetzt
// diamantförmige Akzente (siehe .moba-diamond-tab in battle-cards-moba.css)
// — Grundprinzip (aktiver Reiter poppt aus der Leiste nach oben) bleibt,
// nur die Form + der navy/orange Rahmen drumherum ändern sich. Die
// Farbcodierung pro Reiter bleibt erhalten (wichtig für Wiedererkennung:
// Kampf=Rose, Kampagne=Grün, Karten=Violett, Community=Amber).
const TABS: { key: TabKey; label: string; icon: LucideIcon; accent: string; glow: string }[] = [
  { key: "kampf", label: "Kampf", icon: Swords, accent: "#fb7185", glow: "rgba(251,113,133,0.7)" },
  { key: "kampagne", label: "Kampagne", icon: Map, accent: "#34d399", glow: "rgba(52,211,153,0.7)" },
  { key: "karten", label: "Karten", icon: LayoutGrid, accent: "#a78bfa", glow: "rgba(167,139,250,0.7)" },
  { key: "community", label: "Community", icon: Users, accent: "#fbbf24", glow: "rgba(251,191,36,0.7)" },
];

function BattleCardsTabsInner({
  kampfPanel,
  kampagnePanel,
  kartenPanel,
  communityPanel,
  kampfBadge = 0,
}: {
  kampfPanel: ReactNode;
  kampagnePanel: ReactNode;
  kartenPanel: ReactNode;
  communityPanel: ReactNode;
  kampfBadge?: number;
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
      <div className="moba-panel flex items-end justify-around gap-1 px-2 pt-8 pb-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          const showBadge = tab.key === "kampf" && kampfBadge > 0;
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
                  layoutId="tab-diamond"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="moba-diamond-tab active"
                  style={{ ["--accent" as string]: tab.accent, ["--glow" as string]: tab.glow }}
                >
                  <div className="moba-diamond-shape" />
                  <motion.div
                    className="moba-diamond-icon"
                    initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 }}
                  >
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.4} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }} />
                  </motion.div>
                  <AnimatePresence>
                    {showBadge && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="absolute -top-1 -right-1 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#04061a] shadow-md"
                      >
                        {kampfBadge > 9 ? "9+" : kampfBadge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="moba-diamond-tab">
                  <div className="moba-diamond-shape" />
                  <div className="moba-diamond-icon">
                    <Icon className="w-4 h-4 text-[color:var(--moba-ink-dim)]" strokeWidth={2} />
                  </div>
                  {showBadge && (
                    <span className="absolute -top-0.5 right-0 z-10 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#04061a]">
                      {kampfBadge > 9 ? "9+" : kampfBadge}
                    </span>
                  )}
                </div>
              )}
              <span
                className="text-[10px] font-black uppercase tracking-wide transition-colors"
                style={{ color: isActive ? tab.accent : "var(--moba-ink-dim)" }}
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
  kampfBadge?: number;
}) {
  return (
    <Suspense fallback={null}>
      <BattleCardsTabsInner {...props} />
    </Suspense>
  );
}
