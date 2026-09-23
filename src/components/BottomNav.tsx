"use client";
import { useEffect, useRef, useState } from "react";
import { GateLink } from "@/components/GuestGate";
import { usePathname } from "next/navigation";
import PollBadge from "@/components/PollBadge";

const NAV = [
  { label: "Home",    href: "/dashboard",   glyph: "/icons/nav/home.png" },
  { label: "Events",  href: "/events",      glyph: "/icons/nav/events.png" },
  { label: "Shop",    href: "/shop",        glyph: "/icons/nav/shop.png" },
  { label: "Spenden", href: "/donations",   glyph: "/icons/nav/donations.png" },
  { label: "Rang",    href: "/leaderboard", glyph: "/icons/nav/leaderboard.png" },
  { label: "Profil",  href: "/profile",     glyph: "/icons/nav/profile.png" },
];

const STROKE = 64;          // Kantenlänge des Pinselstrich-Paars in px
const APART_MS = 260;       // Dauer des Auseinanderfahrens
const APART_DX = 34;        // Weg der Striche beim Auseinanderfahren
const APART_DY = 26;

const maskStyle = (src: string) => ({
  WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
  WebkitMaskSize: "contain", maskSize: "contain",
  WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
  WebkitMaskPosition: "center", maskPosition: "center",
});

export default function BottomNav() {
  const pathname = usePathname();

  const items = NAV.map(({ label, href, glyph }) => ({
    label, href, glyph,
    active: pathname === href || pathname.startsWith(href + "/"),
    showPollBadge: href === "/events",
  }));
  const activeIndex = items.findIndex(n => n.active);

  // Die zwei Pinselstriche fahren beim Wechsel in entgegengesetzte Richtungen
  // weg und setzen sich am neuen Icon wieder zusammen. `shown` = an welchem
  // Slot sie gerade sitzen, `apart` = auseinandergefahren (unsichtbar).
  const [shown, setShown] = useState(activeIndex);
  const [apart, setApart] = useState(false);
  const [snap, setSnap] = useState(false);       // Positionswechsel ohne Übergang
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (activeIndex === shown) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (activeIndex < 0) { setApart(true); return; }
    setApart(true);
    timers.current.push(window.setTimeout(() => {
      setSnap(true);
      setShown(activeIndex);
      timers.current.push(window.setTimeout(() => { setSnap(false); setApart(false); }, 40));
    }, APART_MS));
    return () => { timers.current.forEach(clearTimeout); };
  }, [activeIndex, shown]);

  const strokeImg = (src: string, dx: number, dy: number) => (
    <img
      src={src} alt="" draggable={false}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        transform: apart ? `translate(${dx}px, ${dy}px)` : "translate(0,0)",
        opacity: apart ? 0 : 1,
        transition: snap ? "none" : `transform ${APART_MS + 60}ms cubic-bezier(0.5,0,0.3,1), opacity ${APART_MS}ms`,
      }}
    />
  );

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
        {/* Pinselstrich-Paar hinter dem aktiven Icon (Slots sind gleich breit). */}
        {shown >= 0 && (
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: 0,
            width: `${100 / items.length}%`,
            transform: `translateX(${shown * 100}%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 1,
          }}>
            <div style={{ position: "relative", width: STROKE, height: STROKE }}>
              {strokeImg("/icons/nav/stroke-teal.png", -APART_DX, -APART_DY)}
              {strokeImg("/icons/nav/stroke-red.png", APART_DX, APART_DY)}
            </div>
          </div>
        )}

        {items.map(({ label, href, glyph, active, showPollBadge }, i) => {
          const filled = active && shown === i && !apart;
          return (
            <GateLink
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center relative"
              style={{ zIndex: 2 }}
            >
              <div className="flex items-center justify-center relative">
                {/* Wrapper trägt die weiße Kontur (filter greift erst nach der Maske) */}
                <div style={{
                  width: 28, height: 28, position: "relative",
                  filter: filled
                    ? "drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)"
                    : "none",
                  transition: "filter 200ms",
                }}>
                  <div style={{
                    width: "100%", height: "100%", position: "relative", overflow: "hidden",
                    background: "var(--nav-glyph)", ...maskStyle(glyph),
                  }}>
                    {/* Zweifarbige Füllung: Teal oben links, Rot unten rechts */}
                    <div style={{ position: "absolute", inset: 0, opacity: filled ? 1 : 0, transition: "opacity 220ms", background: "#7a1a1d" }}>
                      <div style={{ position: "absolute", inset: 0, background: "#0e7c7b", clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
                    </div>
                  </div>
                </div>
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
