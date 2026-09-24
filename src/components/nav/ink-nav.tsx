"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Gemeinsamer Baukasten für die Navigation (BottomNav mobil, FloatingPill
 * Desktop): Icon-Masken, zweifarbige Füllung und das Pinselstrich-Paar, das
 * beim Tabwechsel diagonal aus- und wieder einfährt.
 */

export const NAV_GLYPHS = {
  home:        "/icons/nav/home.png",
  events:      "/icons/nav/events.png",
  shop:        "/icons/nav/shop.png",
  donations:   "/icons/nav/donations.png",
  leaderboard: "/icons/nav/leaderboard.png",
  profile:     "/icons/nav/profile.png",
} as const;

export type NavGlyphKey = keyof typeof NAV_GLYPHS;

const OUT_MS = 240;         // Dauer des Hinausfahrens
const IN_MS = 300;          // Dauer des Hereinfahrens

type Phase = "rest" | "out" | "pre";

/**
 * Unterseiten, die zu einem Nav-Punkt gehören, obwohl ihr Pfad nicht mit dessen href beginnt
 * (z. B. Turnierseiten zu "Events"). Damit bleibt der Punkt dort aktiv.
 */
const SECTION_PREFIXES: Record<string, string[]> = {
  "/dashboard":   ["/quests", "/servers", "/squads", "/battle-cards", "/dnd", "/feed", "/community-board", "/interviews", "/clip-des-monats", "/clip-des-jahres", "/clip-galerie"],
  "/events":      ["/tournament"],
  "/leaderboard": ["/points"],
};

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Index des Nav-Punkts, zu dem der Pfad gehört (auch Unterseiten), sonst -1. */
export function getActiveNavIndex(pathname: string, hrefs: string[]): number {
  const own = hrefs.findIndex(h => matches(pathname, h));
  if (own >= 0) return own;
  return hrefs.findIndex(h => (SECTION_PREFIXES[h] ?? []).some(p => matches(pathname, p)));
}

/**
 * Ablauf beim Tabwechsel: "out" = alter Strich fährt entlang der Diagonale
 * hinaus, "pre" = am neuen Slot außerhalb positioniert (ohne Übergang),
 * "rest" = fährt entlang der Diagonale an seinen Platz. `shown` ist der Slot,
 * an dem die Striche gerade sitzen.
 */
export function useInkSlot(activeIndex: number, hideWhenNone = false) {
  const [shown, setShown] = useState(activeIndex);
  const [phase, setPhase] = useState<Phase>("rest");
  const shownRef = useRef(activeIndex);
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    // Seite gehört zu keinem Nav-Punkt: Striche bleiben, wo sie waren
    if (activeIndex < 0 || activeIndex === shownRef.current) return;
    clearTimers();
    setPhase("out");
    timers.current.push(window.setTimeout(() => {
      shownRef.current = activeIndex;
      setShown(activeIndex);
      setPhase("pre");
      timers.current.push(window.setTimeout(() => setPhase("rest"), 40));
    }, OUT_MS));
  }, [activeIndex]);

  useEffect(() => clearTimers, []);

  // Im Admin (hideWhenNone) fahren die Striche raus, sonst bleiben sie auf Unterseiten stehen
  const hidden = hideWhenNone && activeIndex < 0;
  return { shown, phase: hidden ? ("out" as Phase) : phase };
}

const maskStyle = (src: string): CSSProperties => ({
  WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
  WebkitMaskSize: "contain", maskSize: "contain",
  WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
  WebkitMaskPosition: "center", maskPosition: "center",
});

/** Icon als Maske: weiß (bzw. --nav-glyph), aktiv zweifarbig Teal/Rot mit weißer Kontur. */
export function NavGlyph({ src, size, filled }: { src: string; size: number; filled: boolean }) {
  const o = Math.max(1, Math.round(size / 28));
  const px = `${o}px`;
  return (
    <div style={{
      width: size, height: size, position: "relative",
      filter: filled
        ? `drop-shadow(${px} 0 0 #fff) drop-shadow(-${px} 0 0 #fff) drop-shadow(0 ${px} 0 #fff) drop-shadow(0 -${px} 0 #fff)`
        : "none",
      transition: "filter 200ms",
    }}>
      <div style={{
        width: "100%", height: "100%", position: "relative", overflow: "hidden",
        background: "var(--nav-glyph)", ...maskStyle(src),
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: filled ? 1 : 0, transition: "opacity 220ms", background: "#7a1a1d" }}>
          <div style={{ position: "absolute", inset: 0, background: "#0e7c7b", clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Das Pinselstrich-Paar (quadratisch, `size` px). Die Striche zeigen von links
 * unten nach rechts oben; genau entlang dieser Diagonale fahren sie ein und
 * aus: Teal kommt von rechts oben und wird nach links unten weitergezogen,
 * Rot kommt von links unten und geht nach rechts oben.
 */
export function InkStrokes({ phase, size }: { phase: Phase; size: number }) {
  const travel = Math.round(size * 1.2);
  const stroke = (src: string, dir: 1 | -1) => {
    const off = dir * travel;
    const transform =
      phase === "out" ? `translate(${-off}px, ${off}px)`
      : phase === "pre" ? `translate(${off}px, ${-off}px)`
      : "translate(0, 0)";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src} alt="" draggable={false}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", transform,
          transition: phase === "pre" ? "none"
            : phase === "out" ? `transform ${OUT_MS}ms cubic-bezier(0.5,0,0.9,0.5)`
            : `transform ${IN_MS}ms cubic-bezier(0.1,0.6,0.2,1)`,
        }}
      />
    );
  };
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {stroke("/icons/nav/stroke-teal.png", 1)}
      {stroke("/icons/nav/stroke-red.png", -1)}
    </div>
  );
}
