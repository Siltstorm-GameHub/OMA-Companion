"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { getGameCoverUrl, getGameFallbackGradient } from "@/lib/game-cover";

interface GameCoverProps {
  game: string | null | undefined;
  /** Breite × Höhe des Containers – Standard: "w-16 h-10" */
  className?: string;
  /** Runde Ecken – Standard: "rounded-lg" */
  rounded?: string;
}

/**
 * Zeigt ein Spielcover-Bild für den angegebenen Spielnamen.
 * Fällt bei unbekannten Spielen auf einen bunten Gradient-Placeholder zurück.
 */
export default function GameCover({
  game,
  className = "w-16 h-10",
  rounded = "rounded-lg",
}: GameCoverProps) {
  const coverUrl = getGameCoverUrl(game);
  const fallbackGrad = getGameFallbackGradient(game);
  const [imgError, setImgError] = useState(false);

  const showImage = coverUrl && !imgError;

  return (
    <div
      className={`${className} ${rounded} overflow-hidden shrink-0 relative`}
      style={showImage ? {} : { background: fallbackGrad }}
    >
      {showImage ? (
        <img
          src={coverUrl}
          alt={game ?? ""}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {game ? (
            <span className="text-white/70 font-bold text-xs leading-none select-none">
              {game
                .split(" ")
                .slice(0, 2)
                .map(w => w[0]?.toUpperCase())
                .join("")}
            </span>
          ) : (
            <Gamepad2 className="w-4 h-4 text-white/40" />
          )}
        </div>
      )}
      {/* Subtiler Rand */}
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10 pointer-events-none" />
    </div>
  );
}
