"use client";
import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TabPanel } from "@/components/admin/Tabs";
import { AnimatePresence, motion } from "motion/react";
import MobaIcon from "@/components/battle-cards/MobaIcon";
import type { MobaIconName } from "@/lib/battle-cards/moba-icons";

type TabKey = "kampf" | "kampagne" | "karten" | "community";

function isTabKey(v: string | null): v is TabKey {
  return v === "kampf" || v === "kampagne" || v === "karten" || v === "community";
}

// MOBA-Style-Nav-Leiste nach Referenz-Screenshot: dünne Gold-Linie nur oben,
// Ecken-Schnörkel unten links/rechts, Diamant-Trenner zwischen den Reitern,
// aktiver Reiter als abgerundetes Quadrat-Badge (kein Diamant mehr) mit
// kleinem Diamant-Ornament darüber (siehe .moba-nav-* in
// battle-cards-moba.css). Die Farbcodierung pro Reiter bleibt erhalten
// (wichtig für Wiedererkennung: Kampf=Rose, Kampagne=Grün, Karten=Violett,
// Community=Amber).
const TABS: {
  key: TabKey;
  label: string;
  icon: MobaIconName;
  accent: string;
  accentDark: string;
  accentLight: string;
  glow: string;
}[] = [
  { key: "kampf", label: "Kampf", icon: "navChampions", accent: "#fb7185", accentDark: "#be123c", accentLight: "#fda4af", glow: "rgba(251,113,133,0.6)" },
  { key: "kampagne", label: "Kampagne", icon: "navDungeon", accent: "#34d399", accentDark: "#047857", accentLight: "#6ee7b7", glow: "rgba(52,211,153,0.6)" },
  { key: "karten", label: "Karten", icon: "navInventory", accent: "#a78bfa", accentDark: "#6d28d9", accentLight: "#c4b5fd", glow: "rgba(167,139,250,0.6)" },
  { key: "community", label: "Community", icon: "navRank", accent: "#fbbf24", accentDark: "#b45309", accentLight: "#fde68a", glow: "rgba(251,191,36,0.6)" },
];

// OMA Quest ist kein Tab-Panel (WorldMap/CharacterCreation leben unter /oma-quest mit
// eigener Server-Logik für Charaktererstellungs-Gate), sondern ein echter
// Link im selben Nav-Look — deshalb außerhalb von TABS, als eigenes Element
// gerendert statt über setActive.
const DND_LINK_TAB = {
  label: "OMA Quest",
  icon: "map" as MobaIconName,
  accent: "#38bdf8",
  accentDark: "#0369a1",
  accentLight: "#7dd3fc",
  glow: "rgba(56,189,248,0.6)",
};

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
      <div className="moba-nav-bar">
        <img src="/battle-cards/moba/nav-corner-left.png" alt="" className="moba-nav-corner left" />
        <img src="/battle-cards/moba/nav-corner-right.png" alt="" className="moba-nav-corner right" />
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const showBadge = tab.key === "kampf" && kampfBadge > 0;
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
                    <span>{kampfBadge > 9 ? "9+" : kampfBadge}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="moba-nav-label">{tab.label}</span>
            </button>
          );
        })}
        <Link
          href="/oma-quest"
          className="moba-nav-item"
          style={{
            ["--accent" as string]: DND_LINK_TAB.accent,
            ["--accent-dark" as string]: DND_LINK_TAB.accentDark,
            ["--accent-light" as string]: DND_LINK_TAB.accentLight,
            ["--glow" as string]: DND_LINK_TAB.glow,
          }}
        >
          <span className="moba-nav-icon">
            <MobaIcon name={DND_LINK_TAB.icon} className="w-9 h-9" />
          </span>
          <span className="moba-nav-label">{DND_LINK_TAB.label}</span>
        </Link>
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
