"use client";

import { useState, useEffect } from "react";
import { getGameCoverUrl, getGameFallbackGradient, pickedCoverCache, normalizeForCoverCache } from "@/lib/game-cover";
import EventCoverDefault from "@/components/EventCoverDefault";
import CoverBrandBadge from "@/components/CoverBrandBadge";

interface GameCoverProps {
  game: string | null | undefined;
  /**
   * Bereits bekannte Cover-URL (z.B. aus einer gespeicherten Steam App-ID).
   * Hat Vorrang vor allen Namens-Lookups; schlägt das Laden fehl, greift
   * wieder die normale Auflösung über den Spielnamen.
   */
  coverUrl?: string | null;
  /** Breite × Höhe des Containers – Standard: "w-16 h-10" */
  className?: string;
  /** Runde Ecken – Standard: "rounded-lg" */
  rounded?: string;
  /** Zusätzliche Klassen für das <img>-Tag (z.B. für Hover-Animationen) */
  imgClassName?: string;
  /**
   * Vignette + Logo-Badge unten rechts, für einheitliches Branding egal ob
   * Steam-Cover, eigener Upload oder Gradient-Fallback. Nur an großformatigen
   * Stellen (Hero-Banner, große Karten) aktivieren — bei kleinen Thumbnails
   * (Listen, Icons) wirkt der Chip nur unruhig. Standard: aus.
   */
  brandBadge?: boolean;
  /**
   * Darstellung, wenn kein Cover gefunden wurde.
   * "brand" (Standard) = OMA-Standardcover mit Logo, "plain" = schlichter
   * Farbverlauf aus dem Spielnamen — für Stellen, an denen ausschließlich
   * echte Spiel-Cover erscheinen sollen (z.B. Lieblingsspiele im Profil).
   */
  fallbackVariant?: "brand" | "plain";
}

/** Client-seitiger Cache: normalisierter Name → CDN-URL */
const dynamicCache = new Map<string, string | null>();

export default function GameCover({
  game,
  coverUrl: explicitUrl,
  className = "w-16 h-10",
  rounded = "rounded-lg",
  imgClassName = "w-full h-full object-cover",
  brandBadge = false,
  fallbackVariant = "brand",
}: GameCoverProps) {
  // Explizit übergebenes Cover schlägt fehl → auf Namens-Auflösung zurückfallen
  const [explicitFailed, setExplicitFailed] = useState(false);
  const usableExplicitUrl = explicitUrl && !explicitFailed ? explicitUrl : null;

  // Vom Nutzer im Dropdown exakt ausgewähltes Cover hat Vorrang vor dem
  // unscharfen statischen Map-Match und der eigenen Steam-Suche, sonst
  // kann nach dem Speichern ein anderes Bild als das ausgewählte erscheinen.
  const pickedUrl = game ? pickedCoverCache.get(normalizeForCoverCache(game)) : undefined;
  const staticUrl = usableExplicitUrl ?? pickedUrl ?? getGameCoverUrl(game);

  const [dynamicUrl, setDynamicUrl] = useState<string | null | undefined>(
    // Sofort aus Cache bedienen falls vorhanden
    game ? dynamicCache.get(game.toLowerCase()) : undefined
  );
  const [imgError, setImgError] = useState(false);

  // Falls kein statisches Cover: Steam API anfragen
  useEffect(() => {
    if (!game || staticUrl) return;                     // nichts zu tun
    const key = game.toLowerCase();
    if (dynamicCache.has(key)) {                        // schon gecacht
      setDynamicUrl(dynamicCache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/game-cover?name=${encodeURIComponent(game)}`)
      .then(r => r.json())
      .then((data: { url: string | null }) => {
        if (cancelled) return;
        dynamicCache.set(key, data.url);
        setDynamicUrl(data.url);
      })
      .catch(() => {
        dynamicCache.set(key, null);
      });
    return () => { cancelled = true; };
  }, [game, staticUrl]);

  const resolvedUrl = staticUrl ?? (dynamicUrl ?? null);
  const showImage   = resolvedUrl && !imgError;

  return (
    <div
      className={`${className} ${rounded} overflow-hidden shrink-0 relative`}
    >
      {showImage ? (
        <>
          <img
            src={resolvedUrl}
            alt={game ?? ""}
            className={imgClassName}
            onError={() => {
              // Nur das explizite Cover war kaputt → Namens-Auflösung bekommt noch eine Chance
              if (resolvedUrl === usableExplicitUrl) setExplicitFailed(true);
              else setImgError(true);
            }}
          />
          {brandBadge && <CoverBrandBadge />}
        </>
      ) : fallbackVariant === "plain" ? (
        <div className="w-full h-full" style={{ background: getGameFallbackGradient(game) }} />
      ) : (
        <EventCoverDefault brandBadge={brandBadge} />
      )}
      {/* Subtiler Rand */}
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10 pointer-events-none" />
    </div>
  );
}
