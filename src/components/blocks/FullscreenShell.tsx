"use client";
// ============================================
// OMA Blocks — Vollbild während einer Runde (nur Handys)
// ============================================
// Auf Handys wird die Runde als eigenes Fenster über die ganze App gelegt (Portal an <body>, weil
// die Seite per transform-Animation einblendet und `fixed` sonst nicht am Viewport hängt). Zusätzlich
// wird — wo der Browser es erlaubt (Android) — beim ersten Antippen echtes Browser-Vollbild angefordert.
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
export function requestPhoneFullscreen(): void {
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

export default function FullscreenShell({ active, children }: { active: boolean; children: ReactNode }) {
  // Browser-Vollbild nur einmal je aktiver Phase anfordern — wer es selbst verlässt, wird nicht bei
  // jedem Antippen wieder hineingeholt. (Solo fordert zusätzlich bei jedem Rundenstart an.)
  const asked = useRef(false);

  useEffect(() => {
    if (!active) return;
    asked.current = !!document.fullscreenElement;
    const onChange = () => {
      if (document.fullscreenElement) asked.current = true;
    };
    document.addEventListener("fullscreenchange", onChange);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.body.style.overflow = prev;
      exitFullscreen();
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
        requestPhoneFullscreen();
      }}
    >
      <div className="px-3 max-w-3xl mx-auto">{children}</div>
    </div>,
    document.body,
  );
}
