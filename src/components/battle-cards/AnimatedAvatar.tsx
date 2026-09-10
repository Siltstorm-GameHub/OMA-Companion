"use client";

// ============================================
// Kampf-Avatar — Spritesheet-Animation mit Bild-Rückfall
// ============================================
// Spielt Card.avatarAnimationsJson (siehe lib/battle-cards/avatar-animation.ts)
// als CSS-Steps-Animation über background-position ab — kein Video-Decoding
// nötig, ein einzelnes (transparentes) Spritesheet-Bild pro Zustand reicht.
// Solange eine Karte (noch) keine Animation für den aktuellen Zustand hat,
// wird ganz normal `imageUrl` als statisches Bild gezeigt — exakt das
// bisherige Verhalten, das für alle heutigen Karten weiterhin greift.

import { useEffect, useState } from "react";
import { pickAvatarAnimationClip, type AvatarAnimationSet, type AvatarAnimationState } from "@/lib/battle-cards/avatar-animation";

let styleTagInjected = false;

/** Injiziert die generische Keyframe-Animation genau einmal pro Seite — die
 *  konkrete Frame-Anzahl/Geschwindigkeit kommt pro Instanz über inline
 *  animationDuration/-timingFunction (steps(frames)), die Keyframe-Regel selbst
 *  ist für jeden Clip identisch (0% → 100% background-position). */
function ensureKeyframes() {
  if (styleTagInjected || typeof document === "undefined") return;
  styleTagInjected = true;
  const style = document.createElement("style");
  style.textContent = `
@keyframes battle-avatar-sprite {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}`;
  document.head.appendChild(style);
}

export default function AnimatedAvatar({
  imageUrl,
  animations,
  state,
  alt,
  className,
  style,
  onStaticImageError,
}: {
  imageUrl?: string | null;
  animations?: AvatarAnimationSet | null;
  state: AvatarAnimationState;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onStaticImageError?: () => void;
}) {
  useEffect(ensureKeyframes, []);
  const [failed, setFailed] = useState(false);
  const clip = pickAvatarAnimationClip(animations, state);

  if (!clip || failed) {
    if (!imageUrl) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        style={style}
        onError={() => {
          setFailed(true);
          onStaticImageError?.();
        }}
      />
    );
  }

  const loop = clip.loop ?? (state === "idle" || state === "victory");

  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        // `className` here is written for an <img> (e.g. "max-w-full max-h-full
        // object-contain") and relies on the element's own intrinsic size — a
        // plain background-image <div> has none, so inside a flex/`items-center`
        // parent it collapses to 0×0 and vanishes. Force it to fill its parent
        // explicitly; `style` (below) can still override if a caller ever needs to.
        width: "100%",
        height: "100%",
        backgroundPosition: "center",
        ...style,
        backgroundImage: `url(${clip.spriteUrl})`,
        backgroundSize: `${clip.frames * 100}% 100%`,
        backgroundRepeat: "no-repeat",
        animationName: "battle-avatar-sprite",
        animationDuration: `${clip.frames / clip.fps}s`,
        animationTimingFunction: `steps(${clip.frames})`,
        animationIterationCount: loop ? "infinite" : 1,
        animationFillMode: loop ? "none" : "forwards",
      }}
    />
  );
}
