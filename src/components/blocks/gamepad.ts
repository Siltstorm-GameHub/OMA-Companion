"use client";
// ============================================
// OMA Blocks — Controller-Steuerung (Gamepad API)
// ============================================
// Browser melden Controller-Eingaben nicht als Ereignisse, sondern nur als Zustand
// (navigator.getGamepads()). Ein gemeinsamer Abfrage-Takt (requestAnimationFrame) vergleicht den Zustand
// mit dem vorherigen Bild und meldet daraus Drücken/Loslassen je Aktion an alle angemeldeten Hörer.
// Mehrere Controller werden zusammengefasst (gedrückt, wenn auf irgendeinem gedrückt).
//
// Belegung: Tasten-Indizes nach dem "standard"-Layout (W3C): 0 = A/✕, 1 = B/○, 2 = X/□, 3 = Y/△,
// 4/5 = LB/RB, 6/7 = LT/RT, 8 = Back/Share, 9 = Start/Options, 10/11 = Sticks, 12–15 = Steuerkreuz.
// Der linke Stick gilt zusätzlich als virtuelle Tasten (STICK_*).

import { useEffect, useRef, useState } from "react";
import {
  BINDABLE_ACTIONS, MAX_BUTTONS_PER_ACTION, STICK_DOWN, STICK_LEFT, STICK_RIGHT, STICK_UP, type BindableAction, type PadBindings,
} from "./settings";

/** Stick-Ausschlag ab dem gedrückt / unter dem losgelassen wird (Hysterese gegen Flattern). */
const STICK_PRESS = 0.6;
const STICK_RELEASE = 0.4;
/** Analoge Trigger zählen ab diesem Wert als gedrückt. */
const TRIGGER_PRESS = 0.5;

/** Legt `button` auf `action`; war er anderswo belegt, wird er dort entfernt (`takenFrom`). */
export function bindButton(bindings: PadBindings, action: BindableAction, button: number): { bindings: PadBindings; takenFrom: BindableAction | null } {
  let takenFrom: BindableAction | null = null;
  const next = {} as PadBindings;
  for (const a of BINDABLE_ACTIONS) {
    const buttons = bindings[a].filter((b) => b !== button);
    if (buttons.length !== bindings[a].length && a !== action) takenFrom = a;
    next[a] = buttons;
  }
  if (next[action].length >= MAX_BUTTONS_PER_ACTION) next[action] = next[action].slice(1);
  next[action] = [...next[action], button];
  return { bindings: next, takenFrom };
}

export function unbindButton(bindings: PadBindings, action: BindableAction, button: number): PadBindings {
  return { ...bindings, [action]: bindings[action].filter((b) => b !== button) };
}

const BUTTON_NAMES: Record<number, string> = {
  0: "A / ✕", 1: "B / ○", 2: "X / □", 3: "Y / △", 4: "LB / L1", 5: "RB / R1", 6: "LT / L2", 7: "RT / R2",
  8: "Back / Share", 9: "Start / Options", 10: "L3", 11: "R3", 12: "Kreuz ↑", 13: "Kreuz ↓", 14: "Kreuz ←", 15: "Kreuz →",
  16: "Home", [STICK_LEFT]: "Stick ←", [STICK_RIGHT]: "Stick →", [STICK_UP]: "Stick ↑", [STICK_DOWN]: "Stick ↓",
};
export function buttonName(b: number): string {
  return BUTTON_NAMES[b] ?? `Taste ${b}`;
}

// ---------- Abfrage ----------

function readPads(prev: Set<number>): Set<number> {
  const down = new Set<number>();
  if (typeof navigator === "undefined" || !navigator.getGamepads) return down;
  let pads: (Gamepad | null)[];
  try {
    pads = navigator.getGamepads();
  } catch {
    return down;
  }
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    pad.buttons.forEach((btn, i) => {
      if (i > 16) return;
      const analog = i === 6 || i === 7;
      if (btn.pressed || (analog && btn.value >= TRIGGER_PRESS)) down.add(i);
    });
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    const stick = (code: number, value: number) => {
      if (value >= (prev.has(code) ? STICK_RELEASE : STICK_PRESS)) down.add(code);
    };
    stick(STICK_LEFT, -x);
    stick(STICK_RIGHT, x);
    stick(STICK_UP, -y);
    stick(STICK_DOWN, y);
  }
  return down;
}

type RawListener = (pressed: number[], released: number[]) => void;
const listeners = new Set<RawListener>();
/** Solange belegt (Tastenbelegung im Einstellungen-Dialog), bekommt nur dieser Hörer neue Tastendrücke. */
let exclusive: RawListener | null = null;
let raf = 0;
let state = new Set<number>();

function poll() {
  const next = readPads(state);
  const pressed: number[] = [];
  const released: number[] = [];
  for (const b of next) if (!state.has(b)) pressed.push(b);
  for (const b of state) if (!next.has(b)) released.push(b);
  state = next;
  if (pressed.length || released.length) {
    for (const l of [...listeners]) {
      // Loslassen bekommen alle (sonst blieben Aktionen hängen), neue Drücke nur der exklusive Hörer.
      if (exclusive && l !== exclusive) {
        if (released.length) l([], released);
      } else l(pressed, released);
    }
  }
  raf = listeners.size ? requestAnimationFrame(poll) : 0;
}

/** Meldet rohe Tasten-Änderungen (Indizes inkl. STICK_*). `capture` = alle anderen Hörer stummschalten. Gibt die Abmeldung zurück. */
export function subscribePadButtons(listener: RawListener, capture = false): () => void {
  if (typeof window === "undefined") return () => {};
  if (listeners.size === 0) state = readPads(new Set()); // schon gehaltene Tasten nicht als neuen Druck werten
  listeners.add(listener);
  if (capture) exclusive = listener;
  if (!raf) raf = requestAnimationFrame(poll);
  return () => {
    listeners.delete(listener);
    if (exclusive === listener) exclusive = null;
    if (!listeners.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

/**
 * Ruft `onPress` / `onRelease` je Aktion auf, solange `enabled`. Eine Aktion gilt als gehalten, solange
 * mindestens eine ihrer Tasten gedrückt ist. Beim Abschalten werden gehaltene Aktionen losgelassen.
 */
export function useGamepadActions(
  bindings: PadBindings,
  enabled: boolean,
  onPress: (action: BindableAction) => void,
  onRelease?: (action: BindableAction) => void,
): void {
  const ref = useRef({ bindings, onPress, onRelease });
  useEffect(() => {
    ref.current = { bindings, onPress, onRelease };
  });

  useEffect(() => {
    if (!enabled) return;
    const held = new Map<BindableAction, Set<number>>();
    const actionFor = (b: number): BindableAction | null => {
      for (const a of BINDABLE_ACTIONS) if (ref.current.bindings[a]?.includes(b)) return a;
      return null;
    };
    const unsubscribe = subscribePadButtons((pressed, released) => {
      for (const b of released) {
        for (const [a, set] of held) {
          if (!set.delete(b) || set.size) continue;
          held.delete(a);
          ref.current.onRelease?.(a);
        }
      }
      for (const b of pressed) {
        const a = actionFor(b);
        if (!a) continue;
        const set = held.get(a) ?? new Set<number>();
        const first = set.size === 0;
        set.add(b);
        held.set(a, set);
        if (first) ref.current.onPress(a);
      }
    });
    return () => {
      unsubscribe();
      for (const a of held.keys()) ref.current.onRelease?.(a);
      held.clear();
    };
  }, [enabled]);
}

/** Name des zuletzt verbundenen Controllers (null = keiner). Browser melden Controller erst nach dem ersten Tastendruck. */
export function useGamepadName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const update = () => {
      let found: string | null = null;
      try {
        for (const p of navigator.getGamepads()) if (p?.connected) found = p.id;
      } catch {
        /* z.B. durch Permissions-Policy gesperrt */
      }
      setName(found);
    };
    update();
    window.addEventListener("gamepadconnected", update);
    window.addEventListener("gamepaddisconnected", update);
    return () => {
      window.removeEventListener("gamepadconnected", update);
      window.removeEventListener("gamepaddisconnected", update);
    };
  }, []);
  return name;
}
