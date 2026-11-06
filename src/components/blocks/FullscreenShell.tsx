"use client";
// ============================================
// OMA Blocks — Vollbild während einer Runde (alle Geräte)
// ============================================
// Die Runde wird als eigenes Fenster über die ganze App gelegt (Portal an <body>, weil die Seite per
// transform-Animation einblendet und `fixed` sonst nicht am Viewport hängt) — ohne App-Navigation, über die
// man das Spiel versehentlich verlassen könnte. Zusätzlich wird echtes Browser-Vollbild angefordert.
// Browser erlauben das nur direkt nach einer Nutzer-Geste: beim Klick auf „Spielen“ / „Runde starten“
// (requestBrowserFullscreen) und sonst beim ersten Klick, Antippen oder Tastendruck in der Runde.
// iPhones kennen kein Element-Vollbild; dort bleibt es beim Overlay ohne App-Navigation.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Handy = grobe Zeigereingabe und kurze Bildschirmseite unter 640 px (einmal beim Mount bestimmt). */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhone(coarse && Math.min(window.screen.width, window.screen.height) < 640);
  }, []);
  return phone;
}

/** Echtes Browser-Vollbild anfordern — nur innerhalb einer Nutzer-Geste wirksam. */
export function requestBrowserFullscreen(): void {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: "hide" }).catch(() => {
    /* abgelehnt oder nicht unterstützt — Overlay reicht */
  });
}

function exitFullscreen(): void {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

export default function FullscreenShell({
  active, keepFullscreen = active, wide = false, children,
}: {
  /** Spiel als Overlay über der App. */
  active: boolean;
  /** Browser-Vollbild bleibt bestehen, solange true (Versus: auch zwischen den Runden im Raum). */
  keepFullscreen?: boolean;
  /** Breiterer Inhalt (Versus mit Gegnerfeldern daneben). */
  wide?: boolean;
  children: ReactNode;
}) {
  // Browser-Vollbild nur einmal je Vollbild-Phase anfordern — wer es selbst verlässt (Esc), wird nicht bei
  // jedem Tastendruck wieder hineingeholt.
  const asked = useRef(false);
  const keep = keepFullscreen || active;

  useEffect(() => {
    if (!keep) return;
    asked.current = !!document.fullscreenElement;
    const onChange = () => {
      if (document.fullscreenElement) asked.current = true;
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      exitFullscreen();
    };
  }, [keep]);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Tastendruck zählt als Nutzer-Geste (Esc nicht — damit verlässt man das Vollbild)
    const onKey = (e: KeyboardEvent) => {
      if (asked.current || e.code === "Escape") return;
      asked.current = true;
      requestBrowserFullscreen();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Beim Server-Rendern gibt es kein document (in der App wird active ohnehin erst im Browser true)
  if (!active || typeof document === "undefined") return <>{children}</>;
  return createPortal(
    <div
      className="fixed inset-0 overflow-y-auto overscroll-contain text-white select-none"
      style={{
        // Keine Textauswahl/Lupe bei langem Drücken (siehe useTouchSafety in TouchControls.tsx)
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        zIndex: 9999,
        background: "var(--bg-base, #070a10)",
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
      }}
      // pointerup (nicht pointerdown) zählt bei Touch als Nutzer-Geste
      onPointerUpCapture={() => {
        if (asked.current) return;
        asked.current = true;
        requestBrowserFullscreen();
      }}
    >
      <div className={`px-3 sm:px-6 sm:pt-4 mx-auto ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</div>
    </div>,
    document.body,
  );
}
