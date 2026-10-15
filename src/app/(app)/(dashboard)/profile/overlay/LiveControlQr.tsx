"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "@/components/icons";

export const LIVE_CONTROL_PATH = "/profile/overlay/live";

/**
 * QR-Code zur Live-Steuerung — am PC einmal mit dem Handy scannen, schon liegt die Fernbedienung
 * neben dem Stream. Wird im Browser erzeugt (kein externer Dienst, die URL verlässt das Gerät nicht).
 */
export default function LiveControlQr({ size = 132 }: { size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`${window.location.origin}${LIVE_CONTROL_PATH}`, {
      width: size * 2, margin: 1, color: { dark: "#0b0f14", light: "#ffffff" },
    })
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [size]);

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white p-1.5 shrink-0" style={{ width: size + 12, height: size + 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- lokal erzeugtes data:-Bild */}
        {src && <img src={src} alt="QR-Code zur Live-Steuerung" width={size} height={size} />}
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-200 mb-1">
          <Smartphone className="w-4 h-4 text-teal-300" /> Mit dem Handy scannen
        </span>
        Öffnet die Live-Steuerung auf deinem Handy. Dort einmal anmelden – danach liegt die Fernbedienung
        für dein Overlay immer neben dem Stream.
      </p>
    </div>
  );
}
