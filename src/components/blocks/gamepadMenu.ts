"use client";
// ============================================
// OMA Blocks — Menüs mit dem Controller bedienen
// ============================================
// Steuerkreuz / linker Stick bewegen den Fokus räumlich zwischen Buttons, Links und Eingabefeldern
// (nächstes Element in der gedrückten Richtung; Schieberegler: links/rechts verstellt), A klickt das fokussierte Element, B schließt einen offenen
// Dialog. Gedrückt halten wiederholt die Bewegung.
//
// Sicherheit: A klickt nur ein Element, das per Controller fokussiert wurde. Ist noch nichts per Controller
// gewählt (z.B. A wird beim Game Over noch gehämmert), fokussiert A nur das Startelement (data-pad-default).
// Die Belegung ist bewusst fest (unabhängig von der Spiel-Belegung), wie bei Konsolen-Menüs üblich.

import { useEffect } from "react";
import { STICK_DOWN, STICK_LEFT, STICK_RIGHT, STICK_UP } from "./settings";
import { subscribePadButtons } from "./gamepad";

type Dir = "up" | "down" | "left" | "right";

const DIR_BUTTONS: Record<number, Dir> = {
  12: "up", 13: "down", 14: "left", 15: "right",
  [STICK_UP]: "up", [STICK_DOWN]: "down", [STICK_LEFT]: "left", [STICK_RIGHT]: "right",
};
const CONFIRM = 0;
const BACK = 1;

const REPEAT_DELAY_MS = 380;
const REPEAT_MS = 140;

const FOCUSABLE = "button, a[href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex='-1'])";

/** Bevorzugtes Startelement, wenn noch nichts gewählt ist (z.B. „Spielen“). */
const DEFAULT_ATTR = "data-pad-default";

function firstOf(list: HTMLElement[]): HTMLElement {
  return list.find((el) => el.hasAttribute(DEFAULT_ATTR)) ?? list[0];
}

/** Markiert per Controller fokussierte Elemente (sichtbarer Fokus-Ring, siehe globals.css). */
const PAD_ATTR = "data-pad-focus";

function root(): ParentNode {
  const dialogs = document.querySelectorAll<HTMLElement>("[role=dialog][aria-modal=true]");
  return dialogs.length ? dialogs[dialogs.length - 1] : document;
}

function candidates(): HTMLElement[] {
  return [...root().querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-hidden") === "true" || el.closest("[inert]")) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.pointerEvents !== "none";
  });
}

function center(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
}

/** Nächstes Element in Richtung `dir`: Abstand in Bewegungsrichtung plus doppelt gewichteter Seitenversatz. */
function findNext(from: HTMLElement, list: HTMLElement[], dir: Dir): HTMLElement | null {
  const a = center(from);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === from) continue;
    const b = center(el);
    let main: number;
    let side: number;
    // Kanten statt Mitten für die Richtungsprüfung — sonst „springen“ breite Buttons über schmale nebeneinander.
    if (dir === "right") { main = b.r.left - a.r.right; side = Math.abs(b.y - a.y); if (b.x <= a.x + 1) continue; }
    else if (dir === "left") { main = a.r.left - b.r.right; side = Math.abs(b.y - a.y); if (b.x >= a.x - 1) continue; }
    else if (dir === "down") { main = b.r.top - a.r.bottom; side = Math.abs(b.x - a.x); if (b.y <= a.y + 1) continue; }
    else { main = a.r.top - b.r.bottom; side = Math.abs(b.x - a.x); if (b.y >= a.y - 1) continue; }
    const score = Math.max(0, main) + side * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function padFocus(el: HTMLElement): void {
  document.querySelectorAll(`[${PAD_ATTR}]`).forEach((e) => e.removeAttribute(PAD_ATTR));
  el.setAttribute(PAD_ATTR, "");
  // focusVisible: Fokus-Ring auch bei programmatischem Fokus (ältere Browser ignorieren die Option → PAD_ATTR-Stil)
  el.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function padFocused(): HTMLElement | null {
  const el = document.activeElement as HTMLElement | null;
  return el && el.hasAttribute(PAD_ATTR) && candidates().includes(el) ? el : null;
}

function move(dir: Dir): void {
  const list = candidates();
  if (!list.length) return;
  const current = padFocused() ?? (list.includes(document.activeElement as HTMLElement) ? (document.activeElement as HTMLElement) : null);
  if (!current) {
    padFocus(firstOf(list));
    return;
  }
  // Schieberegler: links/rechts verstellt den Wert (React bekommt ein echtes input-Ereignis)
  if (current instanceof HTMLInputElement && current.type === "range" && (dir === "left" || dir === "right")) {
    const before = current.value;
    if (dir === "left") current.stepDown();
    else current.stepUp();
    const after = current.value;
    if (after !== before) {
      // React merkt sich den letzten Wert — über den nativen Setter setzen, damit onChange feuert
      current.value = before;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(current, after);
      current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (!current.hasAttribute(PAD_ATTR)) padFocus(current);
    return;
  }
  const next = findNext(current, list, dir);
  if (next) padFocus(next);
  else if (!current.hasAttribute(PAD_ATTR)) padFocus(current);
}

function confirm(): void {
  const el = padFocused();
  if (!el) {
    const list = candidates();
    if (list.length) padFocus(firstOf(list));
    return;
  }
  if (el instanceof HTMLInputElement && el.type !== "checkbox" && el.type !== "radio" && el.type !== "button" && el.type !== "submit") {
    el.select?.();
    return;
  }
  el.click();
}

function back(): void {
  const dialogs = document.querySelectorAll<HTMLElement>("[role=dialog][aria-modal=true]");
  const dialog = dialogs[dialogs.length - 1];
  dialog?.querySelector<HTMLElement>("button[aria-label='Schließen']")?.click();
}

/** Controller-Menüsteuerung, solange `enabled` (also nicht während man selbst spielt). */
export function useGamepadMenu(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let held: Dir | null = null;
    let heldButton = -1;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      held = null;
      heldButton = -1;
    };
    const repeat = () => {
      if (!held) return;
      move(held);
      timer = setTimeout(repeat, REPEAT_MS);
    };
    const unsubscribe = subscribePadButtons((pressed, released) => {
      if (released.includes(heldButton)) stop();
      for (const b of pressed) {
        const dir = DIR_BUTTONS[b];
        if (dir) {
          stop();
          held = dir;
          heldButton = b;
          move(dir);
          timer = setTimeout(repeat, REPEAT_DELAY_MS);
        } else if (b === CONFIRM) confirm();
        else if (b === BACK) back();
      }
    });
    return () => {
      unsubscribe();
      stop();
      document.querySelectorAll(`[${PAD_ATTR}]`).forEach((e) => e.removeAttribute(PAD_ATTR));
    };
  }, [enabled]);
}
