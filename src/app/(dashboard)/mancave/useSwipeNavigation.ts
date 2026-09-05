"use client";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Pointer-Event-basierter Swipe-Hook für die Mancave-3D-Ansicht — ersetzt
 * (zusammen mit den Pfeil-Buttons/Tasten) das frühere Drag-Look
 * (`LookAroundRig`, komplett entfernt) als Steuerung für den Kamera-
 * Ansichtswechsel. Wird auf den äußeren Szene-Container gelegt (denselben
 * Bereich, den vorher `LookAroundRig`s Drag-Handler am `<canvas>` genutzt
 * hat) — kein Konflikt mehr, da es kein Drag-Look mehr gibt.
 *
 * Reine Pointer-Down/Up-Distanz-Messung (kein Live-Tracking während der
 * Bewegung nötig): horizontaler Weg über dem Schwellwert, vertikale
 * Abweichung klein genug, Geste schnell genug — sonst kein Swipe.
 */
interface SwipeOptions {
  onSwipeLeft:        () => void;
  onSwipeRight:       () => void;
  /** Mindest-horizontale Distanz in Pixeln, damit die Geste als Swipe zählt. */
  thresholdPx?:       number;
  /** Maximale vertikale Abweichung, sonst wird von einem Scroll/Look statt Swipe ausgegangen. */
  maxVerticalDriftPx?: number;
  /** Maximale Dauer der Geste — ein langsames Ziehen zählt nicht als Swipe. */
  maxDurationMs?:     number;
}

export function useSwipeNavigation(
  ref: RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight, thresholdPx = 55, maxVerticalDriftPx = 60, maxDurationMs = 800 }: SwipeOptions,
) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onPointerDown(e: PointerEvent) {
      start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    }
    function onPointerUp(e: PointerEvent) {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const dt = performance.now() - s.t;
      if (dt > maxDurationMs) return;
      if (Math.abs(dy) > maxVerticalDriftPx) return;
      if (dx <= -thresholdPx) onSwipeLeft();
      else if (dx >= thresholdPx) onSwipeRight();
    }
    function onPointerCancel() { start.current = null; }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [ref, onSwipeLeft, onSwipeRight, thresholdPx, maxVerticalDriftPx, maxDurationMs]);
}
