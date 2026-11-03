"use client";
// ============================================
// OMA Blocks — Vollbild während einer Runde (nur Handys)
// ============================================
// Auf Handys wird die Runde als eigenes Fenster über die ganze App gelegt (Portal an <body>, weil
// die Seite per transform-Animation einblendet und `fixed` sonst nicht am Viewport hängt). Zusätzlich
// wird — wo der Browser es erlaubt (Android) — beim ersten Antippen echtes Browser-Vollbild angefordert.
// iPhones kennen kein Element-Vollbild; dort bleibt es beim Overlay ohne App-Navigation.

import { useEffect, useState, type ReactNode } from "react";
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
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      exitFullscreen();
    };
  }, [active]);

  if (!active) return <>{children}</>;
  return createPortal(
    <div
      className="fixed inset-0 overflow-y-auto overscroll-contain text-white"
      style={{
        zIndex: 9999,
        background: "var(--bg-base, #070a10)",
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
      }}
      // pointerup (nicht pointerdown) zählt bei Touch als Nutzer-Geste
      onPointerUpCapture={requestPhoneFullscreen}
    >
      <div className="px-3 max-w-3xl mx-auto">{children}</div>
    </div>,
    document.body,
  );
}
