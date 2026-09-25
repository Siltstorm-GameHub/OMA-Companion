"use client";

// ============================================
// Pixel-Charakter im Kampf — Angriff, Block, Tod, Sieg
// ============================================
// Wrapper um PixelCharacter für die Kampf-Ansichten. Die Kampf-Ansicht sagt nur
// WANN etwas passiert (attackKey/blockKey wechseln bei jedem neuen Ereignis);
// welche Animation dazu passt, ergibt sich aus der Ausrüstung (attackAnimFor):
// Bogen → Fernkampf, Stab/Orb → Magie, Waffe/Schild → Nahkampf, sonst nach Klasse.
// Treffer-Flash und Zurückweichen liefern die bestehenden CSS-Klassen der Kampf-
// Kacheln (hit-shake), Tod = Figur kippt um, Sieg = kleiner, weich auslaufender Hüpfer im Idle (victory-hop).

import { useState } from "react";
import PixelCharacter from "./PixelCharacter";
import { attackAnimFor, type PixelAnim, type PixelCharacterConfig } from "@/lib/pixel-character";

interface Props {
  config: PixelCharacterConfig;
  unitClass?: "TANK" | "DAMAGE_DEALER" | "SUPPORT";
  /** Team A steht unten und blickt nach oben, Team B steht oben und blickt nach unten. */
  team: "A" | "B";
  /** Wechselt bei jeder Angriffs-Handlung dieser Einheit (0 = keine). */
  attackKey?: number;
  /** Wechselt, wenn die Einheit einen Schild bekommt (Block-Pose). */
  blockKey?: number;
  /** Alternative zu attackKey/blockKey für Ansichten ohne Schritt-Zähler (Live-Kampf): true =
   *  "gerade jetzt", die Animation startet beim Wechsel auf true. */
  attacking?: boolean;
  blocking?: boolean;
  alive?: boolean;
  victory?: boolean;
  /** Vergrößerung der 48×48-Ausschnitts; die Figur schrumpft per CSS mit, wenn die Kachel schmaler ist. */
  scale?: number;
  title?: string;
}

export default function BattleFigure({
  config, unitClass, team, attackKey = 0, blockKey = 0, attacking = false, blocking = false, alive = true, victory = false, scale = 2, title,
}: Props) {
  // Aktuell laufende Einmal-Animation (null = Idle-Schleife).
  const [playing, setPlaying] = useState<PixelAnim | null>(null);
  const [replay, setReplay] = useState(0);

  // Bei neuem Angriff/Block startet die passende Einmal-Animation. Der Wechsel wird direkt beim
  // Rendern erkannt (statt in einem Effekt), damit kein zusätzlicher Render-Durchlauf nötig ist.
  // Lässt eine Ausrüstung eine Animation nicht zu (z.B. Stab im Nahkampf), fehlt nur das Teil,
  // die Figur selbst bewegt sich trotzdem.
  const [seen, setSeen] = useState({ attackKey, attacking, blockKey, blocking });
  if (seen.attackKey !== attackKey || seen.attacking !== attacking || seen.blockKey !== blockKey || seen.blocking !== blocking) {
    setSeen({ attackKey, attacking, blockKey, blocking });
    if (alive) {
      if ((attackKey && attackKey !== seen.attackKey) || (attacking && !seen.attacking)) {
        setPlaying(attackAnimFor(config, unitClass));
        setReplay((n) => n + 1);
      } else if ((blockKey && blockKey !== seen.blockKey) || (blocking && !seen.blocking)) {
        setPlaying("block");
        setReplay((n) => n + 1);
      }
    }
  }

  const anim: PixelAnim = alive ? playing ?? "idle" : "idle";
  const facing = team === "A" ? "up" : "down";

  return (
    <div
      className={`relative flex items-end justify-center ${victory && alive ? "victory-hop" : ""}`}
      style={{
        transform: alive ? "none" : "rotate(90deg) translateX(-8%)",
        transformOrigin: "50% 80%",
        transition: "transform 350ms ease-in",
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))",
      }}
    >
      <PixelCharacter
        config={config}
        anim={anim}
        dir={facing}
        scale={scale}
        mode="focus"
        loop={playing === null || !alive}
        onDone={() => setPlaying(null)}
        replayKey={replay}
        className="max-w-full h-auto"
        title={title}
      />
    </div>
  );
}
