"use client";

import { useEffect, useState } from "react";
import { BRAND_LOGO } from "@/lib/brand";
import { ZOOM_EXIT_MS } from "./types";

/**
 * Vollbild-Zoom per Live-Steuerung (Touchscreen-Widget oder /profile/overlay/live): verzögert
 * das Unmounten um ZOOM_EXIT_MS, statt beim Zurücksetzen sofort zu verschwinden — die
 * Auskling-Animation (oma-zoom-out) bekommt so Zeit abzuspielen. Reaktion auf Wechsel während des
 * Renders (react.dev "Adjusting state on prop change"), der Effect kümmert sich nur um den Timer.
 */
export function useZoomTransition<K extends string>(zoom: K | null) {
  const [display, setDisplay] = useState<K | null>(zoom);
  const [leaving, setLeaving] = useState(false);
  const [prev, setPrev] = useState<K | null>(zoom);
  if (zoom !== prev) {
    setPrev(zoom);
    if (zoom) {
      setDisplay(zoom);
      setLeaving(false);
    } else if (display) {
      setLeaving(true);
    }
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setDisplay(null);
      setLeaving(false);
    }, ZOOM_EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving]);
  return { display, leaving };
}

/**
 * Abgedunkelte Vollbild-Ebene mit Logo + Kopfzeile oben und der vergrößerten Kachel in der Mitte.
 * `width` ist die Kachelbreite VOR dem scale(1.8): die Kacheln sind für ihre kleine Standardgröße
 * ausgelegt und würden sonst nur vergrößert, ohne die zusätzliche Bildschirmbreite zu nutzen.
 */
export default function ZoomLayer({
  leaving, header, width, children,
}: { leaving: boolean; header: React.ReactNode; width: number; children: React.ReactNode }) {
  return (
    <div
      className={leaving ? "oma-anim-zoomout" : "oma-anim-zoomin"}
      style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(6,6,9,0.92)" }}
    >
      {/* Logo + Kopfzeile auf eigener Ebene statt gemeinsamer Flex-Spalte — so bleibt die
         gezoomte Kachel exakt bildschirmzentriert, egal wie hoch der Kopf ausfällt. */}
      <div style={{ position: "absolute", top: 36, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
        <img src={BRAND_LOGO} alt="" width={72} height={72} style={{ display: "block", filter: "drop-shadow(0 0 16px rgba(20,184,166,0.5))" }} />
        {header}
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width, transform: "scale(1.8)" }}>{children}</div>
      </div>
    </div>
  );
}

/** Kopfzeilen-Kachel unter dem Logo (Eventname/Spiel bzw. Streamer). */
export function ZoomBannerShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "rgba(10,10,14,0.85)", border: "1px solid rgba(94,234,212,0.25)",
        borderRadius: 14, padding: "10px 24px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}
