"use client";
// ============================================
// OMA Blocks — Steuerung & Einstellungen (pro Gerät im localStorage)
// ============================================

import { useCallback, useEffect, useState } from "react";
import { clampHandling, DEFAULT_HANDLING, Input, type HandlingSettings } from "@/lib/blocks/engine";

export type Action = "left" | "right" | "soft" | "cw" | "ccw" | "r180" | "hard" | "hold";

/** Eingabe-Codes beim Drücken / Loslassen. Aktionen ohne "up" sind einmalige Auslöser. */
export const ACTION_INPUTS: Record<Action, { down: number; up?: number }> = {
  left: { down: Input.LeftDown, up: Input.LeftUp },
  right: { down: Input.RightDown, up: Input.RightUp },
  soft: { down: Input.SoftDown, up: Input.SoftUp },
  cw: { down: Input.RotateCW },
  ccw: { down: Input.RotateCCW },
  r180: { down: Input.Rotate180 },
  hard: { down: Input.HardDrop },
  hold: { down: Input.Hold },
};

export const ACTION_LABELS: Record<Action, string> = {
  left: "Links",
  right: "Rechts",
  soft: "Soft Drop",
  cw: "Drehen ↻",
  ccw: "Drehen ↺",
  r180: "Drehen 180°",
  hard: "Hard Drop",
  hold: "Hold",
};

/** Standard-Tastenbelegung (KeyboardEvent.code). */
export const DEFAULT_KEYS: Record<Action, string[]> = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  soft: ["ArrowDown"],
  cw: ["ArrowUp", "KeyX"],
  ccw: ["KeyZ", "KeyY", "ControlLeft"],
  r180: ["KeyA"],
  hard: ["Space"],
  hold: ["KeyC", "ShiftLeft"],
};

export interface BlocksSettings {
  handling: HandlingSettings;
  ghost: boolean;
  touchControls: "auto" | "on" | "off";
  /** Wischen/Tippen direkt auf dem Spielfeld (nur bei Touch-Eingabe aktiv). */
  gestures: boolean;
  /** Kurzes Vibrieren bei Touch-Eingaben (falls das Gerät es kann). */
  haptics: boolean;
}

const STORAGE_KEY = "oma-blocks-settings";
const DEFAULTS: BlocksSettings = { handling: DEFAULT_HANDLING, ghost: true, touchControls: "auto", gestures: true, haptics: true };

function load(): BlocksSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<BlocksSettings>;
    return {
      handling: clampHandling(p.handling),
      ghost: p.ghost !== false,
      touchControls: p.touchControls === "on" || p.touchControls === "off" ? p.touchControls : "auto",
      gestures: p.gestures !== false,
      haptics: p.haptics !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useBlocksSettings(): [BlocksSettings, (s: BlocksSettings) => void] {
  const [settings, setSettings] = useState<BlocksSettings>(DEFAULTS);
  useEffect(() => {
    // erst nach dem Mount lesen (SSR kennt kein localStorage)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(load());
  }, []);
  const save = useCallback((s: BlocksSettings) => {
    const next = { ...s, handling: clampHandling(s.handling) };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* privater Modus o.ä. */
    }
  }, []);
  return [settings, save];
}

/** Ordnet einen Tastencode einer Aktion zu. */
export function actionForKey(code: string): Action | null {
  for (const [action, keys] of Object.entries(DEFAULT_KEYS) as [Action, string[]][]) {
    if (keys.includes(code)) return action;
  }
  return null;
}
