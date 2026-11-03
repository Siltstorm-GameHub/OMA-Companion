"use client";
// ============================================
// OMA Blocks — Touch-Steuerung (Gesten auf dem Spielfeld + Gamepad-Buttons)
// ============================================
// Gesten: ziehen = Teil zellgenau mitschieben, nach unten ziehen = Soft Drop, nach unten wischen =
// Hard Drop, nach oben wischen = Hold, tippen = drehen (linke Feldhälfte ↺, rechte ↻, Hold-Box = Hold).
// Alles läuft über runner.press/release — Replays zeichnen Gesten also genauso auf wie Tasten.

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { WIDTH } from "@/lib/blocks/engine";
import type { BlocksRunner } from "./runner";
import type { Action } from "./settings";

type RunnerRef = { current: BlocksRunner | null };

export function buzz(enabled: boolean, ms = 8): void {
  if (!enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  // Vor der ersten echten Berührung blockiert der Browser vibrate() ohnehin (mit Konsolenfehler)
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* nicht unterstützt */
  }
}

/** Pointer festhalten, damit Bewegungen außerhalb des Elements weiter ankommen (kann werfen, wenn der Pointer schon weg ist). */
function capture(e: ReactPointerEvent<HTMLElement>): void {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    /* egal */
  }
}

/** Empfindlichkeit 1 (träge) … 5 (sehr empfindlich): Zugweg pro Zelle (× Zellbreite) und
 *  Mindest-Geschwindigkeit (px/ms), ab der eine Bewegung als Wisch zählt. */
export const SENSITIVITY_MIN = 1;
export const SENSITIVITY_MAX = 5;
export const SENSITIVITY_DEFAULT = 3;
const STEP_FACTOR = [1.4, 1.15, 0.95, 0.8, 0.65];
const FLICK_SPEED = [1.3, 1.1, 0.9, 0.75, 0.6];

function tuning(sensitivity: number, cssCell: number): { step: number; flick: number } {
  const i = Math.max(SENSITIVITY_MIN, Math.min(SENSITIVITY_MAX, Math.round(sensitivity))) - 1;
  return { step: Math.max(12, cssCell * STEP_FACTOR[i]), flick: FLICK_SPEED[i] };
}
/** Maximale Dauer eines Taps. */
const TAP_MS = 260;

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  startT: number;
  anchorX: number;
  moved: number;
  soft: boolean;
  /** Letzte Positionen für die Wischgeschwindigkeit. */
  samples: { t: number; x: number; y: number }[];
}

/**
 * Pointer-Handler für Gesten auf dem Spielfeld. `cssCell` = Kantenlänge einer Zelle in CSS-Pixeln,
 * `boardLeft` = linker Rand des Feldes (in Zellen) innerhalb des Canvas-Layouts.
 */
export function useBoardGestures(
  runner: RunnerRef, cssCell: number, boardLeft: number, enabled: boolean, haptics: boolean, sensitivity = SENSITIVITY_DEFAULT,
) {
  const g = useRef<Gesture | null>(null);

  const tapMove = (action: "left" | "right") => {
    runner.current?.press(action);
    runner.current?.release(action);
  };

  const endSoft = (gest: Gesture) => {
    if (gest.soft) {
      gest.soft = false;
      runner.current?.release("soft");
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || e.pointerType !== "touch" || g.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    if (!runner.current?.isRunning) return;
    capture(e);
    const t = performance.now();
    g.current = {
      id: e.pointerId, startX: e.clientX, startY: e.clientY, startT: t, anchorX: e.clientX,
      moved: 0, soft: false, samples: [{ t, x: e.clientX, y: e.clientY }],
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const gest = g.current;
    if (!gest || gest.id !== e.pointerId) return;
    const t = performance.now();
    gest.samples.push({ t, x: e.clientX, y: e.clientY });
    while (gest.samples.length > 2 && t - gest.samples[0].t > 90) gest.samples.shift();

    // Horizontal: pro Zelle Zugweg ein Schritt
    const { step } = tuning(sensitivity, cssCell);
    let dx = e.clientX - gest.anchorX;
    while (Math.abs(dx) >= step) {
      const dir = dx > 0 ? 1 : -1;
      tapMove(dir > 0 ? "right" : "left");
      gest.anchorX += dir * step;
      gest.moved++;
      dx = e.clientX - gest.anchorX;
      buzz(haptics, 4);
    }

    // Vertikal: langsames Ziehen nach unten = Soft Drop (solange gehalten)
    const dy = e.clientY - gest.startY;
    const totalDx = Math.abs(e.clientX - gest.startX);
    if (!gest.soft && dy > step * 1.6 && dy > totalDx * 1.4) {
      gest.soft = true;
      runner.current?.press("soft");
    } else if (gest.soft && dy < step * 0.8) {
      endSoft(gest);
    }
  };

  const finish = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const gest = g.current;
    if (!gest || gest.id !== e.pointerId) return;
    g.current = null;
    endSoft(gest);
    if (cancelled) return;

    const t = performance.now();
    const first = gest.samples[0];
    const span = Math.max(1, t - first.t);
    const vy = (e.clientY - first.y) / span;
    const vx = (e.clientX - first.x) / span;
    const dy = e.clientY - gest.startY;
    const dist = Math.hypot(e.clientX - gest.startX, dy);
    const { step, flick } = tuning(sensitivity, cssCell);

    // Wisch nach unten = Hard Drop, nach oben = Hold
    if (Math.abs(vy) > flick && Math.abs(vy) > Math.abs(vx) * 1.2 && Math.abs(dy) > step) {
      if (vy > 0) runner.current?.press("hard");
      else runner.current?.press("hold");
      buzz(haptics, 14);
      return;
    }

    // Tap = drehen (bzw. Hold auf der Hold-Box)
    if (gest.moved === 0 && t - gest.startT < TAP_MS && dist < step * 0.6) {
      const rect = e.currentTarget.getBoundingClientRect();
      const col = (e.clientX - rect.left) / cssCell - boardLeft;
      if (col < -0.3) runner.current?.press("hold");
      else runner.current?.press(col < WIDTH / 2 ? "ccw" : "cw");
      buzz(haptics, 8);
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => finish(e, false),
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => finish(e, true),
  };
}

// ── Gamepad-Buttons ──

const ICONS: Record<Action, ReactNode> = {
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  soft: <path d="M5 9l7 7 7-7" />,
  hard: (
    <>
      <path d="M6 5l6 6 6-6" />
      <path d="M6 11l6 6 6-6" />
      <path d="M5 20h14" />
    </>
  ),
  cw: (
    <>
      <path d="M19 12a7 7 0 1 1-2.05-4.95" />
      <path d="M19 4v4h-4" />
    </>
  ),
  ccw: (
    <>
      <path d="M5 12a7 7 0 1 0 2.05-4.95" />
      <path d="M5 4v4h4" />
    </>
  ),
  r180: (
    <>
      <path d="M5 13a7 7 0 0 1 14 0" />
      <path d="M19 8v5h-5" />
    </>
  ),
  hold: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
      <path d="M9 12h6" />
    </>
  ),
};

function PadButton({
  action, label, runner, haptics, className = "", accent = false,
}: { action: Action; label: string; runner: RunnerRef; haptics: boolean; className?: string; accent?: boolean }) {
  const [pressed, setPressed] = useState(false);
  const down = useRef(false);
  const up = () => {
    if (!down.current) return;
    down.current = false;
    setPressed(false);
    runner.current?.release(action);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative flex flex-col items-center justify-center gap-0.5 select-none touch-none rounded-2xl border transition-[transform,background-color,box-shadow] duration-75 ${
        accent
          ? "bg-gradient-to-b from-teal-400/30 to-teal-600/20 border-teal-300/30 text-teal-100 shadow-[0_4px_0_rgba(13,148,136,0.35)]"
          : "bg-gradient-to-b from-white/[0.10] to-white/[0.04] border-white/10 text-white shadow-[0_4px_0_rgba(0,0,0,0.35)]"
      } ${pressed ? "translate-y-[3px] !shadow-none brightness-125" : ""} ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        capture(e);
        down.current = true;
        setPressed(true);
        buzz(haptics);
        runner.current?.press(action);
      }}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[action]}
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60">{label}</span>
    </button>
  );
}

/** Höhe, die das Gamepad unter dem Feld braucht (inkl. Abstand). */
export const PAD_HEIGHT = 136;

export function TouchPad({ runner, haptics }: { runner: RunnerRef; haptics: boolean }) {
  const p = { runner, haptics };
  return (
    <div className="w-full max-w-md grid grid-cols-[1fr_1.15fr] gap-4 px-1">
      {/* links: Bewegung */}
      <div className="grid grid-cols-3 gap-2">
        <PadButton action="hold" label="Hold" className="col-span-3 h-12" {...p} />
        <PadButton action="left" label="Links" className="h-16" {...p} />
        <PadButton action="soft" label="Soft" className="h-16" {...p} />
        <PadButton action="right" label="Rechts" className="h-16" {...p} />
      </div>
      {/* rechts: Drehen + Hard Drop */}
      <div className="grid grid-cols-3 gap-2">
        <PadButton action="ccw" label="Dreh L" className="h-12" {...p} />
        <PadButton action="r180" label="180°" className="h-12" {...p} />
        <PadButton action="cw" label="Dreh R" className="h-12" {...p} />
        <PadButton action="hard" label="Hard Drop" className="col-span-3 h-16" accent {...p} />
      </div>
    </div>
  );
}
