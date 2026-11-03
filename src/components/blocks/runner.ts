// ============================================
// OMA Blocks — Spielschleife im Browser
// ============================================
// Hält die Engine, rechnet in festen 60-Hz-Schritten (unabhängig von der Bildwiederholrate),
// zeichnet per requestAnimationFrame und zeichnet jede Eingabe für das Replay auf
// (frame * 16 + code, siehe lib/blocks/replay.ts). Eingaben werden sofort beim Tastendruck auf den
// aktuellen Frame angewandt — der Server spielt sie in derselben Reihenfolge vor dem Tick nach.

import { BlocksEngine, FPS, Input, type EngineEvent, type EngineStats, type GameMode, type HandlingSettings } from "@/lib/blocks/engine";
import { encodeInput } from "@/lib/blocks/replay";
import { ACTION_INPUTS, type Action } from "./settings";
import { drawGame } from "./render";

const STEP_MS = 1000 / FPS;
/** Mehr Frames pro Bild werden nicht nachgeholt (z.B. nach Tab-Wechsel). */
const MAX_CATCHUP = 8;
const HUD_INTERVAL_MS = 100;

export interface RunnerResult {
  inputs: number[];
  frames: number;
  stats: EngineStats;
}

export interface RunnerCallbacks {
  onEvents?: (events: EngineEvent[], engine: BlocksEngine) => void;
  /** ~10× pro Sekunde (HUD aktualisieren, Feld an Gegner senden). */
  onSync?: (engine: BlocksEngine) => void;
  onGameOver?: (result: RunnerResult) => void;
}

export class BlocksRunner {
  readonly engine: BlocksEngine;
  readonly inputs: number[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private cell = 24;
  private ghost = true;
  private running = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private lastSync = 0;
  private flash = 0;
  private held = new Set<Action>();
  private finished = false;
  private destroyed = false;

  constructor(
    seed: number,
    mode: GameMode,
    handling: HandlingSettings,
    private callbacks: RunnerCallbacks,
  ) {
    this.engine = new BlocksEngine(seed, mode, handling);
  }

  attach(canvas: HTMLCanvasElement, cell: number, ghost: boolean): void {
    this.canvas = canvas;
    this.cell = cell;
    this.ghost = ghost;
    if (!this.raf && !this.destroyed) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  setCell(cell: number): void {
    this.cell = cell;
  }

  setGhost(ghost: boolean): void {
    this.ghost = ghost;
  }

  setRunning(running: boolean): void {
    if (running === this.running) return;
    if (!running) this.releaseAll();
    this.running = running;
    this.last = performance.now();
    this.acc = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }

  press(action: Action): void {
    if (!this.running || this.finished) return;
    const io = ACTION_INPUTS[action];
    if (io.up !== undefined) {
      if (this.held.has(action)) return;
      this.held.add(action);
    }
    this.apply(io.down);
  }

  release(action: Action): void {
    const io = ACTION_INPUTS[action];
    if (io.up === undefined || !this.held.has(action)) return;
    this.held.delete(action);
    if (!this.running || this.finished) return;
    this.apply(io.up);
  }

  /** Alle gehaltenen Tasten loslassen (Pause, Fokusverlust) — wird mit aufgezeichnet. */
  releaseAll(): void {
    for (const action of [...this.held]) {
      this.held.delete(action);
      const up = ACTION_INPUTS[action].up;
      if (up !== undefined && !this.finished) this.apply(up);
    }
  }

  forfeit(): void {
    if (this.finished) return;
    this.apply(Input.Forfeit);
  }

  queueGarbage(lines: number, hole: number): void {
    this.engine.queueGarbage(lines, hole);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private apply(code: number): void {
    this.inputs.push(encodeInput(this.engine.stats.frame, code));
    this.engine.applyInput(code);
    this.afterStep();
  }

  private afterStep(): void {
    const events = this.engine.drainEvents();
    if (events.length) {
      if (events.some((e) => e.type === "clear" && e.info.lines > 0)) this.flash = 1;
      this.callbacks.onEvents?.(events, this.engine);
    }
    if (this.engine.gameOver && !this.finished) {
      this.finished = true;
      this.running = false;
      this.held.clear();
      this.callbacks.onSync?.(this.engine);
      this.callbacks.onGameOver?.({ inputs: [...this.inputs], frames: this.engine.stats.frame, stats: { ...this.engine.stats } });
    }
  }

  private frame = (now: number) => {
    if (this.destroyed) return;
    const dt = now - this.last;
    this.last = now;
    if (this.running && !this.finished) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP_MS && steps < MAX_CATCHUP && !this.finished) {
        this.engine.tick();
        this.acc -= STEP_MS;
        steps++;
        this.afterStep();
      }
      if (steps >= MAX_CATCHUP) this.acc = 0;
    }
    if (now - this.lastSync >= HUD_INTERVAL_MS) {
      this.lastSync = now;
      this.callbacks.onSync?.(this.engine);
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt / 180);
    const ctx = this.canvas?.getContext("2d");
    if (ctx) drawGame(ctx, this.engine, { cell: this.cell, flash: this.flash, ghost: this.ghost });
    this.raf = requestAnimationFrame(this.frame);
  };
}
