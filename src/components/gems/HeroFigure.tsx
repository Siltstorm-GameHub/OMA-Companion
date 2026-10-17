"use client";

// ============================================
// OMA Gems — Held im Cartoon-Stil (ersetzt die Pixel-Figuren)
// ============================================
// Zeichnet einen Helden aus seinem Look (lib/gems/hero) und spielt im Kampf kurze Animationen per CSS
// (globals.css, hero-*): Wippen im Leerlauf, Ausfallschritt beim Angriff, Ducken beim Block,
// Umfallen bei K.O., Hüpfen beim Sieg. Die Kampf-Ansichten sagen nur WANN etwas passiert —
// attackKey/blockKey wechseln je Ereignis (Replay) bzw. attacking/blocking springen auf true (Live).

import { useState } from "react";
import { HeroParts } from "@/lib/gems/hero/parts";
import type { HeroLook } from "@/lib/gems/hero/look";

interface Props {
  look: HeroLook;
  title?: string;
  /** Kampf: wechselt bei jeder Angriffs-Handlung (Replay) bzw. true = gerade jetzt (Live). */
  attackKey?: number;
  blockKey?: number;
  attacking?: boolean;
  blocking?: boolean;
  alive?: boolean;
  victory?: boolean;
  /** Leichtes Wippen im Leerlauf (im Kampf an, auf Karten aus). */
  idle?: boolean;
  className?: string;
}

export default function HeroFigure({
  look,
  title,
  attackKey = 0,
  blockKey = 0,
  attacking = false,
  blocking = false,
  alive = true,
  victory = false,
  idle = false,
  className,
}: Props) {
  const [playing, setPlaying] = useState<"attack" | "block" | null>(null);
  const [replay, setReplay] = useState(0);

  // Wechsel direkt beim Rendern erkennen (wie zuvor bei der Pixel-Figur), ohne zusätzlichen Effekt.
  const [seen, setSeen] = useState({ attackKey, attacking, blockKey, blocking });
  if (seen.attackKey !== attackKey || seen.attacking !== attacking || seen.blockKey !== blockKey || seen.blocking !== blocking) {
    setSeen({ attackKey, attacking, blockKey, blocking });
    if (alive) {
      if ((attackKey && attackKey !== seen.attackKey) || (attacking && !seen.attacking)) {
        setPlaying("attack");
        setReplay((n) => n + 1);
      } else if ((blockKey && blockKey !== seen.blockKey) || (blocking && !seen.blocking)) {
        setPlaying("block");
        setReplay((n) => n + 1);
      }
    }
  }

  const motion = !alive
    ? "hero-ko"
    : playing === "attack"
      ? "hero-attack"
      : playing === "block"
        ? "hero-block"
        : victory
          ? "victory-hop"
          : idle
            ? "hero-idle"
            : "";

  return (
    <svg
      key={playing ? replay : "rest"}
      viewBox="0 0 220 240"
      preserveAspectRatio="xMidYMax meet"
      className={`${motion} ${className ?? "w-full h-full"}`}
      style={{ overflow: "visible", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.45))" }}
      onAnimationEnd={() => setPlaying(null)}
      role="img"
      aria-label={title}
    >
      <HeroParts look={look} />
    </svg>
  );
}
