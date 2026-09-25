"use client";

// ============================================
// Time-Elements-Figur im Kampf — Angriff, Block, K.O., Sieg
// ============================================
// Die Kampf-Ansicht sagt nur WANN etwas passiert (attackKey/blockKey wechseln bei jedem neuen
// Ereignis bzw. attacking/blocking springen auf true); welche Animation dazu passt, ergibt sich aus
// der Ausrüstung (attackAnimFor): Bogen → Bogen, Support → Zauber, sonst Nahkampf. Treffer-Flash und
// Zurückweichen liefern die bestehenden CSS-Klassen der Kampf-Kacheln (hit-shake); besiegte
// Einheiten liegen in der K.O.-Pose, Sieger hüpfen leicht (victory-hop).

import { useState } from "react";
import TeCharacter from "./TeCharacter";
import { TE_CROP_FIGURE, attackAnimFor, type TeAnim, type TeCharacterConfig } from "@/lib/te-character";

interface Props {
  config: TeCharacterConfig;
  unitClass?: "TANK" | "DAMAGE_DEALER" | "SUPPORT";
  /** Team A steht unten und blickt nach oben, Team B steht oben und blickt nach unten. */
  team: "A" | "B";
  /** Wechselt bei jeder Angriffs-Handlung dieser Einheit (0 = keine). */
  attackKey?: number;
  /** Wechselt, wenn die Einheit einen Schild bekommt (Abwehr-Pose). */
  blockKey?: number;
  /** Alternative zu attackKey/blockKey für Ansichten ohne Schritt-Zähler (Live-Kampf): true =
   *  "gerade jetzt", die Animation startet beim Wechsel auf true. */
  attacking?: boolean;
  blocking?: boolean;
  alive?: boolean;
  victory?: boolean;
  /** Vergrößerung; die Figur schrumpft per CSS mit, wenn die Kachel schmaler ist. */
  scale?: number;
  title?: string;
}

export default function BattleFigure({
  config, unitClass, team, attackKey = 0, blockKey = 0, attacking = false, blocking = false, alive = true, victory = false, scale = 3, title,
}: Props) {
  // Aktuell laufende Einmal-Animation (null = Idle).
  const [playing, setPlaying] = useState<TeAnim | null>(null);
  const [replay, setReplay] = useState(0);

  // Wechsel wird direkt beim Rendern erkannt (statt in einem Effekt), damit kein zusätzlicher
  // Render-Durchlauf nötig ist.
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

  const anim: TeAnim = !alive ? "ko" : playing ?? "idle";
  const facing = !alive ? "down" : team === "A" ? "up" : "down";

  return (
    <div
      className={`relative flex items-end justify-center ${victory && alive ? "victory-hop" : ""}`}
      style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))" }}
    >
      <TeCharacter
        config={config}
        anim={anim}
        dir={facing}
        scale={scale}
        crop={TE_CROP_FIGURE}
        loop={playing === null || !alive ? true : false}
        onDone={() => setPlaying(null)}
        replayKey={replay}
        className="max-w-full h-auto"
        title={title}
      />
    </div>
  );
}
