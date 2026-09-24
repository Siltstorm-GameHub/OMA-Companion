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
const OUT_MS = 240;         // Dauer des Hinausfahrens
const IN_MS = 300;          // Dauer des Hereinfahrens
// Die Striche zeigen von links unten nach rechts oben. Genau entlang dieser
// Diagonale fahren sie ein und aus: Teal kommt von rechts oben und wird nach
// links unten weitergezogen, Rot kommt von links unten und geht nach rechts oben.
const TRAVEL = 76;

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

  // Ablauf beim Tabwechsel: "out" = alter Strich fährt entlang der Diagonale
  // hinaus, "pre" = am neuen Slot unsichtbar außerhalb positioniert (ohne
  // Übergang), "rest" = fährt entlang der Diagonale an seinen Platz.
  const [shown, setShown] = useState(activeIndex);
  const [phase, setPhase] = useState<"rest" | "out" | "pre">("rest");
  const shownRef = useRef(activeIndex);
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    if (activeIndex === shownRef.current) return;
    clearTimers();
    setPhase("out");
    if (activeIndex < 0) return;                 // Seite gehört nicht zur Nav: Striche bleiben weg
    timers.current.push(window.setTimeout(() => {
      shownRef.current = activeIndex;
      setShown(activeIndex);
      setPhase("pre");
      timers.current.push(window.setTimeout(() => setPhase("rest"), 40));
    }, OUT_MS));
  }, [activeIndex]);

  useEffect(() => clearTimers, []);

  // dir = +1: Strich kommt von rechts oben und geht nach links unten (Teal),
  // dir = -1: Strich kommt von links unten und geht nach rechts oben (Rot).
  const strokeImg = (src: string, dir: 1 | -1) => {
    const off = dir * TRAVEL;
    const transform =
      phase === "out" ? `translate(${-off}px, ${off}px)`
      : phase === "pre" ? `translate(${off}px, ${-off}px)`
      : "translate(0, 0)";
    return (
      <img
        src={src} alt="" draggable={false}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          transform,
          transition: phase === "pre" ? "none"
            : phase === "out" ? `transform ${OUT_MS}ms cubic-bezier(0.5,0,0.9,0.5)`
            : `transform ${IN_MS}ms cubic-bezier(0.1,0.6,0.2,1)`,
        }}
      />
    );
  };

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
            <div style={{ position: "relative", width: STROKE, height: STROKE }}>
              {strokeImg("/icons/nav/stroke-teal.png", 1)}
              {strokeImg("/icons/nav/stroke-red.png", -1)}
            </div>
          </div>
          </div>
        )}

        {items.map(({ label, href, glyph, active, showPollBadge }, i) => {
          const filled = active && shown === i && phase === "rest";
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
