// ============================================
// OMA Blocks — Replays (Eingabe-Aufzeichnung + Nachspielen)
// ============================================
// Ein Lauf ist vollständig beschrieben durch Seed, Steuerungs-Einstellungen und die Eingabeliste.
// Jede Eingabe ist eine Zahl: frame * 16 + Eingabe-Code. Der Browser zeichnet während des Spiels auf,
// der Server spielt den Lauf beim Einreichen nach (verifyReplay) und übernimmt NUR das selbst
// errechnete Ergebnis — ein manipulierter Punktestand im Request bringt also nichts.
//
// Rein (keine Node-/DOM-APIs), damit Browser und Server denselben Code nutzen.

import { BlocksEngine, INPUT_COUNT, Input, type EngineStats, type HandlingSettings } from "./engine";

const SHIFT = 16;
/** Längster zugelassener Lauf: 2 Stunden. */
export const MAX_REPLAY_FRAMES = 2 * 60 * 60 * 60;
export const MAX_REPLAY_INPUTS = 200_000;

export function encodeInput(frame: number, code: number): number {
  return frame * SHIFT + code;
}

export function decodeInput(n: number): { frame: number; code: number } {
  return { frame: Math.floor(n / SHIFT), code: n % SHIFT };
}

export interface ReplayResult {
  ok: boolean;
  error?: string;
  stats?: EngineStats;
}

/**
 * Spielt einen Marathon-Lauf nach. Der Lauf muss mit Game Over enden (Top-Out oder Aufgeben),
 * und `frames` muss genau dem Frame entsprechen, in dem das Spiel endete.
 */
export function verifyReplay(seed: number, handling: HandlingSettings, inputs: number[], frames: number): ReplayResult {
  if (!Number.isInteger(frames) || frames < 0 || frames > MAX_REPLAY_FRAMES) return { ok: false, error: "Ungültige Spieldauer." };
  if (!Array.isArray(inputs) || inputs.length > MAX_REPLAY_INPUTS) return { ok: false, error: "Ungültige Eingaben." };

  const engine = new BlocksEngine(seed, "marathon", handling);
  let idx = 0;
  let lastFrame = 0;
  // Eingaben eines Frames werden VOR dessen Tick angewandt (so arbeitet auch der Browser).
  for (let f = 0; f <= frames && !engine.gameOver; f++) {
    while (idx < inputs.length) {
      const raw = inputs[idx];
      if (!Number.isInteger(raw) || raw < 0) return { ok: false, error: "Ungültige Eingabe." };
      const { frame, code } = decodeInput(raw);
      if (frame < lastFrame || code >= INPUT_COUNT) return { ok: false, error: "Ungültige Eingabe-Reihenfolge." };
      if (frame !== f) break;
      lastFrame = frame;
      engine.applyInput(code);
      idx++;
      if (engine.gameOver) break;
    }
    if (engine.gameOver) break;
    if (f < frames) engine.tick();
  }
  engine.drainEvents();
  if (!engine.gameOver) return { ok: false, error: "Lauf ist nicht beendet." };
  if (idx < inputs.length) return { ok: false, error: "Eingaben nach Spielende." };
  if (engine.stats.frame !== frames) return { ok: false, error: "Spieldauer passt nicht zum Lauf." };
  return { ok: true, stats: { ...engine.stats } };
}

export { Input };
