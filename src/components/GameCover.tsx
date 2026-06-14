"use client";

import { useState, useEffect } from "react";
import { getGameCoverUrl } from "@/lib/game-cover";

interface GameCoverProps {
  game: string | null | undefined;
  /** Breite × Höhe des Containers – Standard: "w-16 h-10" */
  className?: string;
  /** Runde Ecken – Standard: "rounded-lg" */
  rounded?: string;
  /** Zusätzliche Klassen für das <img>-Tag (z.B. für Hover-Animationen) */
  imgClassName?: string;
}

/** Client-seitiger Cache: normalisierter Name → CDN-URL */
const dynamicCache = new Map<string, string | null>();

export default function GameCover({
  game,
  className = "w-16 h-10",
  rounded = "rounded-lg",
  imgClassName = "w-full h-full object-cover",
}: GameCoverProps) {
  const staticUrl = getGameCoverUrl(game);

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

  const coverUrl  = staticUrl ?? (dynamicUrl ?? null);
  const showImage = coverUrl && !imgError;

  return (
    <div
      className={`${className} ${rounded} overflow-hidden shrink-0 relative`}
    >
      {showImage ? (
        <img
          src={coverUrl}
          alt={game ?? ""}
          className={imgClassName}
          onError={() => setImgError(true)}
        />
      ) : (
        <img
          src="/event-cover-default.svg"
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      {/* Subtiler Rand */}
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10 pointer-events-none" />
    </div>
  );
}
