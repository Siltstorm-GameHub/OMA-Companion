"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TabPanel } from "@/components/admin/Tabs";
import { AnimatePresence, motion } from "motion/react";
import MobaIcon from "@/components/battle-cards/MobaIcon";
import type { MobaIconName } from "@/lib/battle-cards/moba-icons";

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

// MOBA-Style-Nav-Leiste nach Referenz-Screenshot: dünne Gold-Linie nur oben,
// Ecken-Schnörkel unten links/rechts, Diamant-Trenner zwischen den Reitern,
// aktiver Reiter als abgerundetes Quadrat-Badge mit kleinem Diamant-Ornament
// darüber (siehe .moba-nav-* in battle-cards-moba.css). Die Farbcodierung pro
// Reiter bleibt für die Wiedererkennung erhalten.
const TABS: {
  key: TabKey;
  label: string;
  icon: MobaIconName;
  accent: string;
  accentDark: string;
  accentLight: string;
  glow: string;
}[] = [
  { key: "spielen", label: "Spielen", icon: "navChampions", accent: "#fb7185", accentDark: "#be123c", accentLight: "#fda4af", glow: "rgba(251,113,133,0.6)" },
  { key: "sammlung", label: "Sammlung", icon: "navInventory", accent: "#a78bfa", accentDark: "#6d28d9", accentLight: "#c4b5fd", glow: "rgba(167,139,250,0.6)" },
  { key: "laden", label: "Shop", icon: "chest", accent: "#34d399", accentDark: "#047857", accentLight: "#6ee7b7", glow: "rgba(52,211,153,0.6)" },
];

function BattleCardsTabsInner({
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

  const badges: Partial<Record<TabKey, number>> = { laden: ladenBadge };

  return (
    <div className="space-y-5">
      <div className="moba-nav-bar">
        <img src="/battle-cards/moba/nav-corner-left.png" alt="" className="moba-nav-corner left" />
        <img src="/battle-cards/moba/nav-corner-right.png" alt="" className="moba-nav-corner right" />
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const badge = badges[tab.key] ?? 0;
          const showBadge = badge > 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`moba-nav-item ${isActive ? "active" : ""}`}
              style={{
                ["--accent" as string]: tab.accent,
                ["--accent-dark" as string]: tab.accentDark,
                ["--accent-light" as string]: tab.accentLight,
                ["--glow" as string]: tab.glow,
              }}
            >
              {isActive && (
                <motion.div layoutId="tab-badge" transition={{ type: "spring", stiffness: 500, damping: 30 }} className="moba-nav-badge">
                  <MobaIcon name={tab.icon} className="w-9 h-9" />
                </motion.div>
              )}
              <span className="moba-nav-icon">
                <MobaIcon name={tab.icon} className="w-9 h-9" />
              </span>
              <AnimatePresence>
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, rotate: 45 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="moba-nav-notif"
                  >
                    <span>{badge > 9 ? "9+" : badge}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="moba-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <TabPanel tabKey="spielen" active={active}>{spielenPanel}</TabPanel>
      <TabPanel tabKey="sammlung" active={active}>{sammlungPanel}</TabPanel>
      <TabPanel tabKey="laden" active={active}>{ladenPanel}</TabPanel>
    </div>
  );
}

export default function BattleCardsTabs(props: {
  spielenPanel: ReactNode;
  sammlungPanel: ReactNode;
  ladenPanel: ReactNode;
  ladenBadge?: number;
}) {
  return (
    <Suspense fallback={null}>
      <BattleCardsTabsInner {...props} />
    </Suspense>
  );
}
