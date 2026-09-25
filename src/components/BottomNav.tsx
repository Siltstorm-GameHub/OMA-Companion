"use client";
import { GateLink } from "@/components/GuestGate";
import { usePathname } from "next/navigation";
import PollBadge from "@/components/PollBadge";
import { InkStrokes, NAV_GLYPHS, NavGlyph, getActiveNavIndex, useInkSlot } from "@/components/nav/ink-nav";

const NAV = [
  { label: "Home",    href: "/dashboard",   glyph: NAV_GLYPHS.home },
  { label: "Events",  href: "/events",      glyph: NAV_GLYPHS.events },
  { label: "Battle Cards", href: "/battle-cards", glyph: NAV_GLYPHS.battleCards },
  { label: "Spenden", href: "/donations",   glyph: NAV_GLYPHS.donations },
  { label: "Rang",    href: "/leaderboard", glyph: NAV_GLYPHS.leaderboard },
  { label: "Profil",  href: "/profile",     glyph: NAV_GLYPHS.profile },
];

const STROKE = 64;          // Kantenlänge des Pinselstrich-Paars in px

export default function BottomNav() {
  const pathname = usePathname();

  const items = NAV.map(({ label, href, glyph }) => ({
    label, href, glyph,
    showPollBadge: href === "/events",
  }));
  const activeIndex = getActiveNavIndex(pathname, NAV.map(n => n.href));
  const { shown, phase } = useInkSlot(activeIndex);

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
        {/* Pinselstrich-Paar hinter dem aktiven Icon (Slots sind gleich breit).
            Der Clip-Container schneidet die Striche an der Leistenkante ab. */}
        {shown >= 0 && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: 0,
            width: `${100 / items.length}%`,
            transform: `translateX(${shown * 100}%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 1,
          }}>
            <InkStrokes phase={phase} size={STROKE} />
          </div>
          </div>
        )}

        {items.map(({ label, href, glyph, showPollBadge }, i) => {
          const filled = shown === i && phase === "rest";
          return (
            <GateLink
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center relative"
              style={{ zIndex: 2 }}
            >
              <div className="flex items-center justify-center relative">
                <NavGlyph src={glyph} size={28} filled={filled} />
                {showPollBadge && <PollBadge />}
              </div>

              <span
                style={{
                  fontSize: 8,
                  fontWeight: 650,
                  letterSpacing: "0.04em",
                  marginTop: 3,
                  lineHeight: 1,
                  color: filled ? "#fff" : "var(--nav-glyph)",
                  transition: "color 200ms",
                  userSelect: "none",
                }}
              >
                {label}
              </span>
            </GateLink>
          );
        })}
      </div>
    </nav>
  );
}
