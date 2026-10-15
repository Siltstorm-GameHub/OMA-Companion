"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "@/components/icons";

const SCROLL_PAUSE_MS = 5200;
const SCROLL_TRANSITION_MS = 1600;
const SCROLL_HIGHLIGHT_MS = SCROLL_TRANSITION_MS + 250; // wie lange die aktive Pfeilrichtung aufleuchtet
const ARROW_STRIP = 22; // reservierter Streifen je Kante — Pfeile liegen hier, nie über dem Inhalt

/** Auto-Scroll für Inhalte, die nicht in eine feste Kachelgröße passen (lange Teilnehmer-
 *  /Ranking-Listen, viele FFA-Mitspieler im Ticker) — statt die Kachel selbst wachsen zu
 *  lassen: zeigt einen Ausschnitt, pausiert, scrollt eine "Seite" weiter, pausiert wieder;
 *  am Ende springt (scrollt) es in einer Bewegung zurück an den Anfang und der Zyklus beginnt
 *  von vorn. Die Content-Größe wird per ResizeObserver gemessen, da Turnierdaten sich laufend
 *  ändern (neue Matches, mehr Teilnehmer). Ein schmaler Streifen an beiden Kanten (außerhalb
 *  des eigentlichen Inhalts) trägt zwei dauerhaft sichtbare Pfeile — die aktive Richtung leuchtet
 *  beim Scrollen kurz auf, überlappt dabei aber nie die Liste selbst. */
export function AutoScrollViewport({
  axis, size, gap = 0, children,
}: { axis: "x" | "y"; size: number; gap?: number; children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [steps, setSteps] = useState<number[]>([0]);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<"forward" | "backward" | null>(null);

  const contentSize = size - ARROW_STRIP * 2;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const trackSize = axis === "x" ? track.scrollWidth : track.scrollHeight;
      const max = Math.max(0, trackSize - contentSize);
      // Passt alles in die volle Größe, braucht es weder Scrollen noch die Pfeil-Streifen.
      if (max <= 0 || trackSize <= size) {
        setSteps([0]);
        setStepIndex(0);
        return;
      }
      const list: number[] = [];
      for (let o = 0; o < max; o += contentSize) list.push(o);
      list.push(max);
      setSteps(list);
      setStepIndex(0);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [axis, contentSize, size]);

  useEffect(() => {
    if (steps.length <= 1) return;
    const t = setInterval(() => setStepIndex(i => (i + 1) % steps.length), SCROLL_PAUSE_MS);
    return () => clearInterval(t);
  }, [steps.length]);

  // Highlight blitzt kurz während der Bewegung auf, die Pfeile selbst stehen dauerhaft —
  // nicht beim allerersten Render aufblitzen (kein Sprung direkt beim Laden).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setHighlight(stepIndex === 0 ? "backward" : "forward");
    const t = setTimeout(() => setHighlight(null), SCROLL_HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [stepIndex]);

  const scrollable = steps.length > 1;
  const offset = steps[stepIndex] ?? 0;
  const translate = axis === "x" ? `translateX(-${offset}px)` : `translateY(-${offset}px)`;

  const outerStyle: React.CSSProperties = axis === "x"
    ? { display: "flex", alignItems: "center", width: size }
    : { display: "flex", flexDirection: "column", height: size };
  // Ohne Scrollen nutzt der Inhalt die volle Größe (keine Pfeil-Streifen nötig).
  const visibleSize = scrollable ? contentSize : size;
  const viewportStyle: React.CSSProperties = axis === "x"
    ? { overflow: "hidden", width: visibleSize, flexShrink: 0 }
    : { overflow: "hidden", height: visibleSize, flexShrink: 0 };

  return (
    <div style={outerStyle}>
      {scrollable && <ScrollArrow axis={axis} direction="backward" active={highlight === "backward"} />}
      <div style={viewportStyle}>
        <div
          ref={trackRef}
          style={{
            display: axis === "x" ? "inline-flex" : "flex",
            flexDirection: axis === "x" ? "row" : "column",
            gap,
            transform: translate,
            transition: `transform ${SCROLL_TRANSITION_MS}ms cubic-bezier(0.16,1,0.3,1)`,
          }}
        >
          {children}
        </div>
      </div>
      {scrollable && <ScrollArrow axis={axis} direction="forward" active={highlight === "forward"} />}
    </div>
  );
}

/** Dauerhaft sichtbarer Richtungspfeil im reservierten Rand-Streifen — dezent, solange nicht
 *  gerade in diese Richtung gescrollt wird, hell und leicht vergrößert währenddessen. */
function ScrollArrow({ axis, direction, active }: { axis: "x" | "y"; direction: "forward" | "backward"; active: boolean }) {
  const Icon = axis === "x"
    ? (direction === "forward" ? ChevronRight : ChevronLeft)
    : (direction === "forward" ? ChevronDown : ChevronUp);

  return (
    <div
      style={{
        flexShrink: 0,
        width: axis === "x" ? ARROW_STRIP : "100%",
        height: axis === "y" ? ARROW_STRIP : "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "opacity 300ms ease, transform 300ms ease",
        opacity: active ? 1 : 0.4,
        transform: active ? "scale(1.15)" : "scale(1)",
      }}
    >
      <Icon
        size={14}
        color="#5eead4"
        style={{ filter: active ? "drop-shadow(0 0 5px rgba(45,212,191,0.75))" : "none" }}
      />
    </div>
  );
}
