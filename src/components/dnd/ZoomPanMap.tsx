"use client";

// ============================================
// Pinch-Zoom/Pan-Container für die Weltkarte (Mobile + Desktop)
// ============================================
// Ersetzt den bisherigen Mobile-Listen-Fallback (plan 3.2.2) — die Karte
// selbst wird jetzt auf allen Bildschirmgrößen gezeigt und per Zwei-Finger-
// Pinch skaliert bzw. per Ein-Finger-Drag verschoben, sobald reingezoomt
// wurde. Bei scale=1 wird kein touchmove abgefangen, damit normale Taps auf
// die Location-Marker (<Link>) unverändert funktionieren — nur während einer
// aktiven Pinch-/Pan-Geste wird das native Scrollen/Zoomen der Seite
// unterdrückt.

import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Minus, Plus } from "@/components/icons";

const MIN_SCALE = 1;
const MAX_SCALE = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(a: React.Touch, b: React.Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

type GestureState =
  | { mode: "none"; lastTapAt?: number }
  | { mode: "pinch"; startDist: number; startScale: number }
  | { mode: "pan"; startTouch: { x: number; y: number }; startPan: { x: number; y: number } };

export default function ZoomPanMap({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const gestureRef = useRef<GestureState>({ mode: "none" });

  const clampPan = useCallback((p: { x: number; y: number }, s: number) => {
    const el = containerRef.current;
    if (!el) return p;
    const maxX = (el.clientWidth * (s - 1)) / 2;
    const maxY = (el.clientHeight * (s - 1)) / 2;
    return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) };
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  function zoomBy(delta: number) {
    setScale((s) => {
      const next = clamp(s + delta, MIN_SCALE, MAX_SCALE);
      setPan((p) => clampPan(p, next));
      return next;
    });
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      setIsGesturing(true);
      gestureRef.current = { mode: "pinch", startDist: touchDistance(e.touches[0], e.touches[1]), startScale: scale };
      return;
    }
    if (e.touches.length === 1) {
      const prev = gestureRef.current;
      const now = Date.now();
      if (prev.mode === "none" && prev.lastTapAt && now - prev.lastTapAt < 300) {
        // Doppel-Tap: rein- bzw. rauszoomen
        if (scale > 1.01) reset();
        else {
          setScale(2);
          setPan((p) => clampPan(p, 2));
        }
        gestureRef.current = { mode: "none" };
        return;
      }
      if (scale > 1.01) {
        setIsGesturing(true);
        gestureRef.current = {
          mode: "pan",
          startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
          startPan: pan,
        };
      } else {
        gestureRef.current = { mode: "none", lastTapAt: now };
      }
    }
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (g.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const next = clamp(g.startScale * (dist / g.startDist), MIN_SCALE, MAX_SCALE);
      setScale(next);
      setPan((p) => clampPan(p, next));
    } else if (g.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - g.startTouch.x;
      const dy = e.touches[0].clientY - g.startTouch.y;
      setPan(clampPan({ x: g.startPan.x + dx, y: g.startPan.y + dy }, scale));
    }
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 0) {
      setIsGesturing(false);
      gestureRef.current = { mode: "none", lastTapAt: Date.now() };
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden moba-panel select-none"
      style={{ touchAction: "none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isGesturing ? "none" : "transform 150ms ease-out",
        }}
      >
        {children}
      </div>

      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
        {scale > 1.01 && (
          <button
            type="button"
            onClick={reset}
            className="h-8 px-2 rounded-full bg-black/60 text-white text-[10px] font-bold hover:bg-black/80 transition-colors"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={() => zoomBy(-0.5)}
          disabled={scale <= MIN_SCALE}
          aria-label="Verkleinern"
          className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.5)}
          disabled={scale >= MAX_SCALE}
          aria-label="Vergrößern"
          className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
