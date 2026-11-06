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

/** Alles, was sich auf Tasten legen lässt: Spielaktionen plus Pause und Neustart (nur Solo). */
export type BindableAction = Action | "pause" | "restart";
export type KeyBindings = Record<BindableAction, string[]>;

/** Reihenfolge in den Einstellungen. */
export const BINDABLE_ACTIONS: BindableAction[] = ["left", "right", "soft", "hard", "cw", "ccw", "r180", "hold", "pause", "restart"];

export const BINDABLE_LABELS: Record<BindableAction, string> = {
  ...ACTION_LABELS,
  pause: "Pause",
  restart: "Neustart",
};

/** Höchstens so viele Tasten pro Aktion. */
export const MAX_KEYS_PER_ACTION = 3;

/** Tasten, die sich nicht belegen lassen (Fokus-Wechsel, Systemtasten). */
const RESERVED_KEYS = new Set(["Tab", "MetaLeft", "MetaRight", "ContextMenu", "F5", "F11", "F12"]);
export function isBindableKey(code: string): boolean {
  return !!code && !RESERVED_KEYS.has(code) && code !== "Unidentified";
}

/** Standard-Tastenbelegung (KeyboardEvent.code). */
export const DEFAULT_KEYS: KeyBindings = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  soft: ["ArrowDown"],
  hard: ["Space"],
  cw: ["ArrowUp", "KeyX"],
  ccw: ["KeyZ", "KeyY", "ControlLeft"],
  r180: ["KeyA"],
  hold: ["KeyC", "ShiftLeft"],
  pause: ["Escape", "KeyP"],
  restart: ["KeyR"],
};

export function defaultKeyBindings(): KeyBindings {
  return Object.fromEntries(BINDABLE_ACTIONS.map((a) => [a, [...DEFAULT_KEYS[a]]])) as KeyBindings;
}

/** Bereinigt gespeicherte Belegungen: fehlende Aktionen bekommen den Standard, jede Taste gehört
 *  höchstens einer Aktion, höchstens MAX_KEYS_PER_ACTION Tasten je Aktion. */
export function normalizeKeyBindings(input: unknown): KeyBindings {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const used = new Set<string>();
  const out = {} as KeyBindings;
  for (const a of BINDABLE_ACTIONS) {
    const raw = Array.isArray(src[a]) ? (src[a] as unknown[]) : DEFAULT_KEYS[a];
    const keys: string[] = [];
    for (const k of raw) {
      if (typeof k !== "string" || !isBindableKey(k) || used.has(k) || keys.length >= MAX_KEYS_PER_ACTION) continue;
      used.add(k);
      keys.push(k);
    }
    out[a] = keys;
  }
  return out;
}

/** Legt `code` auf `action`. War die Taste anderswo belegt, wird sie dort entfernt (`takenFrom`). */
export function bindKey(bindings: KeyBindings, action: BindableAction, code: string): { bindings: KeyBindings; takenFrom: BindableAction | null } {
  let takenFrom: BindableAction | null = null;
  const next = {} as KeyBindings;
  for (const a of BINDABLE_ACTIONS) {
    const keys = bindings[a].filter((k) => k !== code);
    if (keys.length !== bindings[a].length && a !== action) takenFrom = a;
    next[a] = keys;
  }
  if (next[action].length >= MAX_KEYS_PER_ACTION) next[action] = next[action].slice(1);
  next[action] = [...next[action], code];
  return { bindings: next, takenFrom };
}

export function unbindKey(bindings: KeyBindings, action: BindableAction, code: string): KeyBindings {
  return { ...bindings, [action]: bindings[action].filter((k) => k !== code) };
}

const KEY_NAMES: Record<string, string> = {
  ArrowLeft: "←", ArrowRight: "→", ArrowDown: "↓", ArrowUp: "↑", Space: "Leertaste", Escape: "Esc", Enter: "Enter",
  ControlLeft: "Strg", ControlRight: "Strg rechts", ShiftLeft: "Shift", ShiftRight: "Shift rechts",
  AltLeft: "Alt", AltRight: "Alt Gr", Backspace: "Rücktaste", CapsLock: "Feststell", Comma: ",", Period: ".",
  Slash: "-", Minus: "ß", Equal: "´", Semicolon: "Ö", Quote: "Ä", BracketLeft: "Ü", BracketRight: "+",
  Backslash: "#", IntlBackslash: "<", Backquote: "^", Delete: "Entf", Insert: "Einfg", Home: "Pos1", End: "Ende",
  PageUp: "Bild ↑", PageDown: "Bild ↓", NumpadEnter: "Num Enter",
};
/** Lesbarer Name einer Taste (deutsche Tastatur). */
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

// ---------- Controller (Belegung; Abfrage siehe gamepad.ts) ----------

/** Controller-Tasten je Aktion (Indizes nach dem W3C-"standard"-Layout, STICK_* = linker Stick). */
export type PadBindings = Record<BindableAction, number[]>;

/** Virtuelle Tasten für den linken Stick. */
export const STICK_LEFT = 100;
export const STICK_RIGHT = 101;
export const STICK_UP = 102;
export const STICK_DOWN = 103;

export const MAX_BUTTONS_PER_ACTION = 3;

export const DEFAULT_PAD: PadBindings = {
  left: [14, STICK_LEFT],
  right: [15, STICK_RIGHT],
  soft: [13, STICK_DOWN],
  hard: [12],
  cw: [0, 3],
  ccw: [1, 2],
  r180: [7],
  hold: [4, 5],
  pause: [9],
  restart: [8],
};

export function defaultPadBindings(): PadBindings {
  return Object.fromEntries(BINDABLE_ACTIONS.map((a) => [a, [...DEFAULT_PAD[a]]])) as PadBindings;
}

const VALID = new Set([...Array.from({ length: 17 }, (_, i) => i), STICK_LEFT, STICK_RIGHT, STICK_UP, STICK_DOWN]);
export function isBindableButton(b: number): boolean {
  return VALID.has(b);
}

/** Bereinigt gespeicherte Belegungen (wie normalizeKeyBindings). */
export function normalizePadBindings(input: unknown): PadBindings {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const used = new Set<number>();
  const out = {} as PadBindings;
  for (const a of BINDABLE_ACTIONS) {
    const raw = Array.isArray(src[a]) ? (src[a] as unknown[]) : DEFAULT_PAD[a];
    const buttons: number[] = [];
    for (const b of raw) {
      if (typeof b !== "number" || !isBindableButton(b) || used.has(b) || buttons.length >= MAX_BUTTONS_PER_ACTION) continue;
      used.add(b);
      buttons.push(b);
    }
    out[a] = buttons;
  }
  return out;
}

export interface BlocksSettings {
  handling: HandlingSettings;
  ghost: boolean;
  touchControls: "auto" | "on" | "off";
  /** Wischen/Tippen direkt auf dem Spielfeld (nur bei Touch-Eingabe aktiv). */
  gestures: boolean;
  /** Wisch-Empfindlichkeit 1 (träge) … 5 (sehr empfindlich). */
  gestureSensitivity: number;
  /** Kurzes Vibrieren bei Touch-Eingaben (falls das Gerät es kann). */
  haptics: boolean;
  /** Eigene Tastenbelegung. */
  keys: KeyBindings;
  /** Controller-Steuerung aktiv. */
  gamepad: boolean;
  /** Controller-Belegung. */
  pad: PadBindings;
}

const STORAGE_KEY = "oma-blocks-settings";
const DEFAULTS: BlocksSettings = { handling: DEFAULT_HANDLING, ghost: true, touchControls: "auto", gestures: true, gestureSensitivity: 3, haptics: true, keys: defaultKeyBindings(), gamepad: true, pad: defaultPadBindings() };

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
      gestureSensitivity: typeof p.gestureSensitivity === "number" ? Math.max(1, Math.min(5, Math.round(p.gestureSensitivity))) : 3,
      haptics: p.haptics !== false,
      keys: normalizeKeyBindings(p.keys),
      gamepad: p.gamepad !== false,
      pad: normalizePadBindings(p.pad),
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
    const next = { ...s, handling: clampHandling(s.handling), keys: normalizeKeyBindings(s.keys), pad: normalizePadBindings(s.pad) };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* privater Modus o.ä. */
    }
  }, []);
  return [settings, save];
}

/** Ordnet einen Tastencode einer Aktion zu (inkl. Pause/Neustart). */
export function actionForKey(code: string, bindings: KeyBindings = DEFAULT_KEYS): BindableAction | null {
  for (const a of BINDABLE_ACTIONS) {
    if (bindings[a]?.includes(code)) return a;
  }
  return null;
}
