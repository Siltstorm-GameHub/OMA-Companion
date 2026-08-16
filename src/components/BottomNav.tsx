"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, ShoppingBag, Trophy, User, Heart } from "lucide-react";
import PollBadge from "@/components/PollBadge";

const NAV = [
  { label: "Home",    href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",  href: "/events",      icon: CalendarDays },
  { label: "Shop",    href: "/shop",        icon: ShoppingBag },
  { label: "Spenden", href: "/donations",   icon: Heart },
  { label: "Rang",    href: "/leaderboard", icon: Trophy },
  { label: "Profil",  href: "/profile",     icon: User },
];

/**
 * `roomVisible` kommt aus dem Dashboard-Layout, weil die Zimmer-Freischaltung
 * in der BotConfig liegt und nur serverseitig lesbar ist. Der Profil-Slot
 * verlinkt auf /zimmer, sobald das Zimmer sichtbar ist — /profile leitet dann
 * ohnehin sofort auf /zimmer um, ein achter Slot für dasselbe Ziel wäre nur
 * Redundanz auf einer Leiste, die auf schmalen Geräten schon jetzt eng ist.
 * Label bleibt bewusst "Profil" (nicht "Zimmer") — das Gaming-Zimmer ERSETZT
 * die alte Profilseite, ist für die User aber weiterhin "ihr Profil".
 */
export default function BottomNav({ roomVisible = false }: { roomVisible?: boolean }) {
  const pathname = usePathname();

  const items = NAV.map(({ label, href, icon }) => {
    const effHref = href === "/profile" && roomVisible ? "/zimmer" : href;
    return {
      label, href: effHref, icon,
      active: pathname === effHref || pathname.startsWith(effHref + "/"),
      showPollBadge: href === "/events",
    };
  });
  const activeIndex = items.findIndex(n => n.active);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "var(--nav-glass-bg)",
        borderTop: "1px solid var(--nav-glass-border)",
      }}
      className="backdrop-blur-2xl safe-area-pb"
    >
      <div className="flex items-stretch h-16 relative">
        {/*
         * Sliding bump capsule — same motif as the desktop pill (FloatingPill):
         * one solid teal capsule highlights the whole active tab (icon +
         * label) and glides to the new tab on navigation. Slots are equal
         * width (flex-1), so the slide is a pure index * 100% translateX of
         * a same-width box — no measuring needed, fully transform-only.
         */}
        {activeIndex >= 0 && (
          <div style={{
            position: "absolute", top: 6, bottom: 6, left: 0,
            width: `${100 / items.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: "transform 400ms cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 1,
          }}>
            <div style={{
              width: "calc(100% - 12px)", height: "100%",
              borderRadius: 18,
              background: "#2dd4bf",
              boxShadow: "0 4px 16px rgba(45,212,191,0.35)",
            }} />
          </div>
        )}

        {items.map(({ label, href, icon: Icon, active, showPollBadge }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center relative"
            style={{ zIndex: 2 }}
          >
            {/* Icon */}
            <div className="flex items-center justify-center relative">
              <Icon
                style={{
                  width: 17,
                  height: 17,
                  color: active ? "#04342c" : "var(--nav-icon-inactive)",
                  strokeWidth: active ? 2.5 : 2,
                  transition: "color 200ms",
                }}
              />
              {showPollBadge && <PollBadge />}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 8,
                fontWeight: 650,
                letterSpacing: "0.04em",
                marginTop: 3,
                lineHeight: 1,
                color: active ? "#04342c" : "var(--nav-icon-inactive)",
                transition: "color 200ms",
                userSelect: "none",
              }}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
