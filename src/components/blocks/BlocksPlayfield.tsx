"use client";
// ============================================
// OMA Blocks — Spielfeld (Canvas + Tastatur + Touch-Steuerung)
// ============================================
// Erzeugt je Seed einen BlocksRunner (runner.ts). Der Elternteil steuert über `running`, ob die
// Zeit läuft (Countdown, Pause), und bekommt Ereignisse, HUD-Takt und das Endergebnis gemeldet.

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BlocksEngine, EngineEvent, GameMode, HandlingSettings } from "@/lib/blocks/engine";
import { BlocksRunner, type RunnerResult } from "./runner";
import { BOARD_LEFT, LAYOUT_COLS, LAYOUT_ROWS } from "./render";
import { actionForKey } from "./settings";
import { PAD_HEIGHT, TouchPad, useBoardGestures } from "./TouchControls";

export interface PlayfieldProps {
  seed: number;
  mode: GameMode;
  handling: HandlingSettings;
  ghost: boolean;
  running: boolean;
  touchControls: "auto" | "on" | "off";
  /** Wischgesten auf dem Feld (nur bei Touch-Eingabe). */
  gestures?: boolean;
  /** Vibration bei Touch-Eingaben. */
  haptics?: boolean;
  /** Platz, der unter/über dem Feld frei bleiben soll (Kopfzeile, Touch-Buttons). */
  reserveHeight?: number;
  /** Maximale Zellgröße in CSS-Pixeln. */
  maxCell?: number;
  onEvents?: (events: EngineEvent[], engine: BlocksEngine) => void;
  onSync?: (engine: BlocksEngine) => void;
  onGameOver?: (result: RunnerResult) => void;
  /** Escape / P (nur Solo). */
  onPauseKey?: () => void;
  /** R (nur Solo). */
  onRestartKey?: () => void;
  runnerRef?: { current: BlocksRunner | null };
  /** Overlay über dem Feld (Countdown, Pause, Ergebnis). */
  overlay?: ReactNode;
}

interface Callout {
  id: number;
  title: string;
  sub: string | null;
}

function calloutFor(e: Extract<EngineEvent, { type: "clear" }>): Omit<Callout, "id"> | null {
  const { lines, spin, combo, b2b, perfectClear } = e.info;
  const names = ["", "SINGLE", "DOUBLE", "TRIPLE", "QUAD"];
  let title = "";
  if (perfectClear) title = "PERFECT CLEAR";
  else if (spin === "full") title = `T-SPIN ${names[lines] ?? ""}`.trim();
  else if (spin === "mini") title = `MINI T-SPIN ${names[lines] ?? ""}`.trim();
  else if (lines >= 4) title = "QUAD";
  else if (lines >= 2 && combo < 1) title = names[lines];
  const parts: string[] = [];
  if (b2b) parts.push("B2B");
  if (combo >= 1) parts.push(`${combo} COMBO`);
  if (!title && parts.length === 0) return null;
  return { title: title || parts.shift()!, sub: parts.length ? parts.join(" · ") : null };
}

function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return touch;
}

export default function BlocksPlayfield(props: PlayfieldProps) {
  const {
    seed, mode, handling, ghost, running, touchControls, gestures = true, haptics = true, reserveHeight = 200, maxCell = 32,
    runnerRef: externalRef, overlay,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalRef = useRef<BlocksRunner | null>(null);
  const callbacksRef = useRef(props);
  const [cssCell, setCssCell] = useState(20);
  const [callout, setCallout] = useState<Callout | null>(null);
  const isTouch = useIsTouch();
  const showTouch = touchControls === "on" || (touchControls === "auto" && isTouch);
  const gestureHandlers = useBoardGestures(internalRef, cssCell, BOARD_LEFT, gestures, haptics);

  useEffect(() => {
    callbacksRef.current = props;
  });

  // Runner je Seed (neue Runde = neuer Runner)
  useEffect(() => {
    let calloutId = 0;
    const runner = new BlocksRunner(seed, mode, handling, {
      onEvents: (events, engine) => {
        for (const ev of events) {
          if (ev.type === "clear") {
            const c = calloutFor(ev);
            if (c) setCallout({ id: ++calloutId, ...c });
          }
        }
        callbacksRef.current.onEvents?.(events, engine);
      },
      onSync: (engine) => callbacksRef.current.onSync?.(engine),
      onGameOver: (r) => callbacksRef.current.onGameOver?.(r),
    });
    internalRef.current = runner;
    if (externalRef) externalRef.current = runner;
    return () => {
      runner.destroy();
      if (internalRef.current === runner) internalRef.current = null;
      if (externalRef && externalRef.current === runner) externalRef.current = null;
    };
    // handling/mode gehören zur Runde — Änderungen greifen erst in der nächsten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    internalRef.current?.setRunning(running);
  }, [running, seed]);

  useEffect(() => {
    internalRef.current?.setGhost(ghost);
  }, [ghost, seed]);

  // Callout nach kurzer Zeit ausblenden
  useEffect(() => {
    if (!callout) return;
    const t = setTimeout(() => setCallout(null), 1100);
    return () => clearTimeout(t);
  }, [callout]);

  // Größe an Container + Fensterhöhe anpassen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = window.innerHeight - reserveHeight - (showTouch ? PAD_HEIGHT : 0);
      const cell = Math.max(10, Math.min(maxCell, Math.floor(Math.min(width / LAYOUT_COLS, height / LAYOUT_ROWS))));
      setCssCell(cell);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [reserveHeight, maxCell, showTouch]);

  // Canvas auflösen (devicePixelRatio) und an den Runner hängen
  useEffect(() => {
    const canvas = canvasRef.current;
    const runner = internalRef.current;
    if (!canvas || !runner) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cell = Math.round(cssCell * dpr);
    canvas.width = Math.round(LAYOUT_COLS * cell);
    canvas.height = Math.round(LAYOUT_ROWS * cell);
    runner.attach(canvas, cell, ghost);
    runner.setCell(cell);
    // ghost wird separat gesetzt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssCell, seed]);

  // Tastatur
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.code === "Escape" || e.code === "KeyP") {
        if (callbacksRef.current.onPauseKey) {
          e.preventDefault();
          callbacksRef.current.onPauseKey();
        }
        return;
      }
      if (e.code === "KeyR" && !e.ctrlKey && !e.metaKey) {
        if (callbacksRef.current.onRestartKey) {
          e.preventDefault();
          callbacksRef.current.onRestartKey();
        }
        return;
      }
      const action = actionForKey(e.code);
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return;
      internalRef.current?.press(action);
    };
    const onUp = (e: KeyboardEvent) => {
      const action = actionForKey(e.code);
      if (!action) return;
      e.preventDefault();
      internalRef.current?.release(action);
    };
    const onBlur = () => internalRef.current?.releaseAll();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const cssWidth = LAYOUT_COLS * cssCell;
  const cssHeight = LAYOUT_ROWS * cssCell;

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center gap-3">
      <div
        className={`relative ${gestures && isTouch ? "touch-none select-none" : ""}`}
        style={{ width: cssWidth, height: cssHeight, WebkitTouchCallout: "none" }}
        {...gestureHandlers}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} style={{ width: cssWidth, height: cssHeight }} className="block" />
        {callout && (
          <div
            key={callout.id}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center animate-fade-in"
            style={{ top: cssHeight * 0.35 }}
          >
            <p className="font-display font-black text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ fontSize: Math.max(14, cssCell * 0.9) }}>
              {callout.title}
            </p>
            {callout.sub && <p className="text-xs font-bold text-teal-300 drop-shadow">{callout.sub}</p>}
          </div>
        )}
        {overlay && <div className="absolute inset-0 flex items-center justify-center">{overlay}</div>}
      </div>

      {showTouch && (
        <TouchPad runner={internalRef} haptics={haptics} />
      )}
    </div>
  );
}
