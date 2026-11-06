"use client";
// ============================================
// OMA Blocks — Seite während einer Runde nicht scrollbar
// ============================================
// Bisher wurde nur bei belegten Tasten preventDefault() aufgerufen. Alles andere konnte die Seite weiter
// verschieben: nicht belegte Scroll-Tasten (Leertaste, Pfeile, Bild ↓, Ende), das Mausrad, ein fokussierter
// Button (Leertaste/Enter), Fokuswechsel per Browser-Funktion (z.B. Operas räumliche Navigation mit
// Shift+Pfeil — Shift ist Standard-Hold) oder Scroll-Verankerung, wenn sich die Seitenhöhe ändert.
//
// Deshalb während der Runde:
//  1. Spielfeld einmal vollständig ins Bild holen,
//  2. <html> auf overflow: hidden (Mausrad, Touch, Scrollbalken),
//  3. Scroll-Tasten außerhalb von Eingabefeldern abfangen,
//  4. jede trotzdem auftretende Verschiebung sofort auf die gemerkte Position zurücksetzen,
//  5. Fokus von Buttons/Links nehmen, damit Leertaste/Enter nichts auslösen.

import { useEffect, type RefObject } from "react";

const SCROLL_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"]);

function isField(t: EventTarget | null): boolean {
  return t instanceof Element && !!t.closest("input, textarea, select, [contenteditable]");
}

export function useRoundScrollLock(active: boolean, target: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;

    // 1. Spielfeld ins Bild (nur wenn es nicht schon ganz sichtbar ist)
    const el = target.current;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ block: r.height > window.innerHeight ? "start" : "center", behavior: "instant" });
      }
    }
    const x = window.scrollX;
    const y = window.scrollY;

    // 2. Scrollen sperren — Platz des Scrollbalkens freihalten, sonst springt das Feld zur Seite
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter, overscroll: html.style.overscrollBehavior };
    const hasScrollbar = window.innerWidth - html.clientWidth > 0;
    if (hasScrollbar) html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    // 5. Fokus von Buttons/Links nehmen (z.B. „Runde starten“ oder Einstellungen-Button nach Schließen des Dialogs)
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body && !isField(focused)) focused.blur();

    // 3. Scroll-Tasten abfangen (vor allen anderen Listenern; Spielsteuerung bekommt sie trotzdem)
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.code) && !isField(e.target)) e.preventDefault();
    };
    // 4. Jede Verschiebung zurücksetzen
    const onScroll = () => {
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
    const onWheel = (e: WheelEvent) => {
      // Strg+Rad (Zoom) und Dialoge (Einstellungen während einer Versus-Runde) bleiben scrollbar
      if (!e.ctrlKey && !(e.target instanceof Element && e.target.closest("[role=dialog]"))) e.preventDefault();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      html.style.overflow = prev.overflow;
      html.style.scrollbarGutter = prev.gutter;
      html.style.overscrollBehavior = prev.overscroll;
    };
  }, [active, target]);
}
