// ============================================
// OMA Blocks — Spiel-Engine (rein, deterministisch, ohne DOM)
// ============================================
// Fallende-Blöcke-Puzzle mit 7er-Beutel, Hold, 5er-Vorschau, SRS-Drehung (inkl. 180°), T-Spins,
// Combos, Back-to-Back und Perfect Clears. Läuft in festen Frames (60 pro Sekunde) und rechnet
// ausschließlich mit Ganzzahlen — dieselbe Eingabefolge mit demselben Seed ergibt in jedem Browser
// und auf dem Server exakt denselben Spielverlauf. Darauf beruht die Highscore-Prüfung
// (siehe replay.ts): der Server spielt den Lauf aus Seed + Eingaben nach und zählt selbst.
//
// Koordinaten: x = Spalte (0 links), y = Zeile (0 oben, wächst nach unten). Das Feld ist 40 Zeilen
// hoch, sichtbar sind die unteren 20 (VISIBLE_TOP .. HEIGHT-1); darüber liegt die Puffer-Zone, in der
// neue Teile erscheinen.
//
// Wird von Browser (components/blocks), Next-Server (Highscore-Prüfung) und Multiplayer-Server
// (src/blocks-server) genutzt — deshalb keine Imports mit "@/"-Alias und keine Node-/DOM-APIs.

export const WIDTH = 10;
export const HEIGHT = 40;
export const VISIBLE_ROWS = 20;
export const VISIBLE_TOP = HEIGHT - VISIBLE_ROWS;
export const FPS = 60;
export const PREVIEW_COUNT = 5;

// ── Teile ────────────────────────────────────────────────────────────────────

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
/** Zell-Code im Feld: 0 = leer, 1..7 = Teil (Index in PIECES + 1), 8 = Garbage. */
export const GARBAGE_CELL = 8;
export function pieceCell(type: PieceType): number {
  return PIECES.indexOf(type) + 1;
}

type Cell = readonly [number, number];

// Grundform (Ausrichtung 0) im Begrenzungsrahmen.
const BASE: Record<PieceType, { size: number; cells: Cell[] }> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

function rotateCW(cells: Cell[], size: number): Cell[] {
  return cells.map(([x, y]) => [size - 1 - y, x] as const);
}

/** SHAPES[type][rot] = Zellen relativ zur linken oberen Ecke des Rahmens. */
export const SHAPES: Record<PieceType, Cell[][]> = Object.fromEntries(
  PIECES.map((t) => {
    const { size, cells } = BASE[t];
    if (t === "O") return [t, [cells, cells, cells, cells]];
    const r1 = rotateCW(cells, size);
    const r2 = rotateCW(r1, size);
    const r3 = rotateCW(r2, size);
    return [t, [cells, r1, r2, r3]];
  }),
) as Record<PieceType, Cell[][]>;

export const SPAWN_X = 3;
export const SPAWN_Y = VISIBLE_TOP - 2;

// SRS-Wandsprünge (Guideline-Tabelle, y zeigt dort nach OBEN — wird beim Anwenden umgedreht).
type Kick = readonly [number, number];
const KICKS_JLSTZ: Record<string, Kick[]> = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I: Record<string, Kick[]> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};
const KICKS_180: Record<string, Kick[]> = {
  "0>2": [[0, 0], [0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0]],
  "2>0": [[0, 0], [0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0]],
  "1>3": [[0, 0], [1, 0], [1, 2], [1, 1], [0, 2], [0, 1]],
  "3>1": [[0, 0], [-1, 0], [-1, 2], [-1, 1], [0, 2], [0, 1]],
};

// ── Zufall (deterministisch) ─────────────────────────────────────────────────

/** mulberry32 — kleiner, schneller PRNG mit reiner 32-Bit-Ganzzahl-Arithmetik. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

// ── Eingaben ─────────────────────────────────────────────────────────────────

export const Input = {
  LeftDown: 0,
  LeftUp: 1,
  RightDown: 2,
  RightUp: 3,
  SoftDown: 4,
  SoftUp: 5,
  RotateCW: 6,
  RotateCCW: 7,
  Rotate180: 8,
  HardDrop: 9,
  Hold: 10,
  Forfeit: 11,
} as const;
export type InputCode = (typeof Input)[keyof typeof Input];
export const INPUT_COUNT = 12;

/** Steuerungs-Einstellungen in Frames. Gehören zum Replay, weil sie den Verlauf beeinflussen. */
export interface HandlingSettings {
  /** Delayed Auto Shift: Frames, bis gehaltenes Links/Rechts automatisch wiederholt. */
  das: number;
  /** Auto Repeat Rate: Frames zwischen automatischen Schritten (0 = sofort bis zur Wand). */
  arr: number;
  /** Soft-Drop-Faktor (Vielfaches der Fallgeschwindigkeit, SDF_INSTANT = sofort nach unten). */
  sdf: number;
}
export const DEFAULT_HANDLING: HandlingSettings = { das: 10, arr: 2, sdf: 20 };
export const SDF_INSTANT = 41;
export const HANDLING_LIMITS = {
  das: { min: 1, max: 20 },
  arr: { min: 0, max: 5 },
  sdf: { min: 5, max: SDF_INSTANT },
} as const;

export function clampHandling(h: Partial<HandlingSettings> | null | undefined): HandlingSettings {
  const pick = (k: keyof HandlingSettings) => {
    const v = h?.[k];
    const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : DEFAULT_HANDLING[k];
    return Math.min(HANDLING_LIMITS[k].max, Math.max(HANDLING_LIMITS[k].min, n));
  };
  return { das: pick("das"), arr: pick("arr"), sdf: pick("sdf") };
}

// ── Geschwindigkeit, Punkte, Angriffe ────────────────────────────────────────

/** Fallgeschwindigkeit je Level in Zeilen pro Frame × 65536 (Guideline-Formel, vorberechnet, damit
 *  keine Gleitkomma-Potenz je nach JS-Engine anders rundet). Ab Level 19: 20G. */
const GRAVITY_FP = [
  1092, 1377, 1768, 2311, 3075, 4169, 5759, 8107, 11634, 17026, 25416, 38709, 60169, 95483, 154742,
  256187, 433425, 749597, 1310720, 1310720,
];
const FP_ONE = 65536;
const MAX_FP = 20 * FP_ONE;
export const MAX_LEVEL = GRAVITY_FP.length;
export function gravityFor(level: number): number {
  return GRAVITY_FP[Math.min(MAX_LEVEL, Math.max(1, level)) - 1];
}

export const LOCK_DELAY = 30;
export const MAX_LOCK_RESETS = 15;
/** Höchstens so viele Garbage-Zeilen kommen pro abgelegtem Teil herein (Rest wartet). */
export const GARBAGE_CAP = 8;

export type SpinKind = "none" | "mini" | "full";

export interface ClearInfo {
  lines: number;
  spin: SpinKind;
  /** Combo-Zähler nach diesem Clear (0 = erster Clear in Folge). */
  combo: number;
  /** true = Back-to-Back-Bonus griff (schwerer Clear direkt nach schwerem Clear). */
  b2b: boolean;
  perfectClear: boolean;
}

const COMBO_ATTACK = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];

/** Garbage-Zeilen, die ein Clear im Versus auslöst. Wird von Client und Server gleich gerechnet. */
export function attackFor(c: ClearInfo): number {
  if (c.lines <= 0) return 0;
  let base: number;
  if (c.spin === "full") base = [0, 2, 4, 6, 6][Math.min(4, c.lines)];
  else if (c.spin === "mini") base = [0, 0, 1, 2, 2][Math.min(4, c.lines)];
  else base = [0, 0, 1, 2, 4][Math.min(4, c.lines)];
  let total = base + (c.b2b ? 1 : 0) + COMBO_ATTACK[Math.min(COMBO_ATTACK.length - 1, Math.max(0, c.combo))];
  if (c.perfectClear) total += 10;
  return total;
}
/** Obergrenze von attackFor — der Multiplayer-Server lehnt höhere Werte ab. */
export const MAX_ATTACK_PER_CLEAR = 6 + 1 + 5 + 10;

function clearScore(lines: number, spin: SpinKind): number {
  if (spin === "full") return [400, 800, 1200, 1600, 1600][lines];
  if (spin === "mini") return [100, 200, 400, 400, 400][lines];
  return [0, 100, 300, 500, 800][lines];
}
const PC_SCORE = [0, 800, 1200, 1800, 2000];

// ── Engine ───────────────────────────────────────────────────────────────────

export type GameMode = "marathon" | "versus";

export interface ActivePiece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export type EngineEvent =
  | { type: "lock"; lines: number }
  | { type: "clear"; info: ClearInfo; attack: number; sent: number; score: number }
  | { type: "garbage"; lines: number }
  | { type: "levelup"; level: number }
  | { type: "gameover"; reason: "topout" | "lockout" | "forfeit" | "garbage" };

export interface EngineStats {
  score: number;
  lines: number;
  level: number;
  pieces: number;
  frame: number;
  tspins: number;
  quads: number;
  perfectClears: number;
  maxCombo: number;
  attackSent: number;
}

interface PendingGarbage {
  lines: number;
  hole: number;
}

export class BlocksEngine {
  readonly mode: GameMode;
  readonly handling: HandlingSettings;
  board: Uint8Array;
  active: ActivePiece | null = null;
  hold: PieceType | null = null;
  holdUsed = false;
  queue: PieceType[] = [];
  gameOver = false;
  stats: EngineStats = {
    score: 0, lines: 0, level: 1, pieces: 0, frame: 0, tspins: 0, quads: 0, perfectClears: 0, maxCombo: 0, attackSent: 0,
  };
  /** Wartende Garbage (Versus), wird nach einem Teil ohne Clear eingefügt. */
  pendingGarbage: PendingGarbage[] = [];
  combo = -1;
  b2b = false;

  private rng: () => number;
  private events: EngineEvent[] = [];
  private gravityAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private lowestY = 0;
  private lastWasRotation = false;
  private lastKickIndex = 0;
  // Eingabezustand
  private leftHeld = false;
  private rightHeld = false;
  private softHeld = false;
  private dir: -1 | 0 | 1 = 0;
  private dasTimer = 0;
  private arrTimer = 0;

  constructor(seed: number, mode: GameMode = "marathon", handling: HandlingSettings = DEFAULT_HANDLING) {
    this.mode = mode;
    this.handling = clampHandling(handling);
    this.board = new Uint8Array(WIDTH * HEIGHT);
    this.rng = createRng(seed);
    this.fillQueue();
    this.spawn();
  }

  // ── Öffentliche API ──

  /** Ereignisse seit dem letzten Aufruf abholen. */
  drainEvents(): EngineEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get pendingGarbageTotal(): number {
    return this.pendingGarbage.reduce((s, g) => s + g.lines, 0);
  }

  /** Versus: eingehende Garbage vormerken (hole = Lücken-Spalte 0..9). */
  queueGarbage(lines: number, hole: number): void {
    if (this.gameOver || lines <= 0) return;
    this.pendingGarbage.push({ lines: Math.min(lines, 40), hole: ((hole % WIDTH) + WIDTH) % WIDTH });
  }

  cell(x: number, y: number): number {
    return this.board[y * WIDTH + x];
  }

  /** Zellen des aktiven Teils als absolute Koordinaten. */
  activeCells(p: ActivePiece | null = this.active): [number, number][] {
    if (!p) return [];
    return SHAPES[p.type][p.rot].map(([cx, cy]) => [p.x + cx, p.y + cy]);
  }

  /** y-Position, auf der das aktive Teil landen würde (Ghost). */
  ghostY(): number {
    const p = this.active;
    if (!p) return 0;
    let y = p.y;
    while (this.fits(p.type, p.rot, p.x, y + 1)) y++;
    return y;
  }

  applyInput(code: number): void {
    if (this.gameOver) return;
    switch (code) {
      case Input.LeftDown:
        this.leftHeld = true;
        this.startShift(-1);
        break;
      case Input.RightDown:
        this.rightHeld = true;
        this.startShift(1);
        break;
      case Input.LeftUp:
        this.leftHeld = false;
        if (this.dir === -1) this.releaseShift();
        break;
      case Input.RightUp:
        this.rightHeld = false;
        if (this.dir === 1) this.releaseShift();
        break;
      case Input.SoftDown:
        this.softHeld = true;
        break;
      case Input.SoftUp:
        this.softHeld = false;
        break;
      case Input.RotateCW:
        this.rotate(1);
        break;
      case Input.RotateCCW:
        this.rotate(3);
        break;
      case Input.Rotate180:
        this.rotate(2);
        break;
      case Input.HardDrop:
        this.hardDrop();
        break;
      case Input.Hold:
        this.doHold();
        break;
      case Input.Forfeit:
        this.end("forfeit");
        break;
    }
  }

  /** Einen Frame weiterrechnen. */
  tick(): void {
    if (this.gameOver) return;
    this.stats.frame++;
    if (this.mode === "versus") {
      // Versus: Tempo steigt alle 30 Sekunden.
      const lvl = Math.min(15, 1 + Math.floor(this.stats.frame / (FPS * 30)));
      if (lvl !== this.stats.level) this.stats.level = lvl;
    }
    if (!this.active) return;

    this.processShift();

    // Schwerkraft (+ Soft Drop)
    const grav = gravityFor(this.stats.level);
    let rate = grav;
    let soft = false;
    if (this.softHeld) {
      soft = true;
      rate = this.handling.sdf >= SDF_INSTANT ? MAX_FP : Math.min(MAX_FP, Math.max(grav, grav * this.handling.sdf, FP_ONE / 4));
    }
    const p = this.active;
    if (this.fits(p.type, p.rot, p.x, p.y + 1)) {
      this.gravityAcc += rate;
      while (this.gravityAcc >= FP_ONE) {
        if (!this.fits(p.type, p.rot, p.x, p.y + 1)) {
          this.gravityAcc = 0;
          break;
        }
        p.y++;
        this.gravityAcc -= FP_ONE;
        this.lastWasRotation = false;
        if (soft) this.stats.score += 1;
        this.onDescended();
      }
    } else {
      this.gravityAcc = 0;
    }

    // Lock Delay
    if (!this.fits(p.type, p.rot, p.x, p.y + 1)) {
      this.lockTimer++;
      if (this.lockTimer >= LOCK_DELAY || this.lockResets >= MAX_LOCK_RESETS) this.lock();
    }
  }

  // ── Intern ──

  private fillQueue(): void {
    while (this.queue.length < PREVIEW_COUNT + 1) {
      const bag = [...PIECES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = this.rng() % (i + 1);
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.queue.push(...bag);
    }
  }

  private fits(type: PieceType, rot: number, x: number, y: number): boolean {
    for (const [cx, cy] of SHAPES[type][rot]) {
      const bx = x + cx;
      const by = y + cy;
      if (bx < 0 || bx >= WIDTH || by >= HEIGHT) return false;
      if (by >= 0 && this.board[by * WIDTH + bx] !== 0) return false;
    }
    return true;
  }

  private spawn(type?: PieceType): void {
    if (!type) {
      type = this.queue.shift()!;
      this.fillQueue();
    }
    const piece: ActivePiece = { type, rot: 0, x: SPAWN_X, y: SPAWN_Y };
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastWasRotation = false;
    this.lowestY = piece.y;
    if (!this.fits(piece.type, piece.rot, piece.x, piece.y)) {
      this.active = piece;
      this.end("topout");
      return;
    }
    this.active = piece;
    // Gehaltene Richtung mit voller DAS-Ladung sofort anwenden (wie üblich bei "DAS-Übertrag").
    if (this.dir !== 0 && this.dasTimer >= this.handling.das && this.handling.arr === 0) {
      while (this.tryMove(this.dir, 0)) { /* bis zur Wand */ }
    }
    // Neues Teil sofort eine Zeile tiefer, falls frei (Guideline).
    if (this.fits(piece.type, piece.rot, piece.x, piece.y + 1)) {
      piece.y++;
      this.lowestY = piece.y;
    }
  }

  private startShift(dir: -1 | 1): void {
    this.dir = dir;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.tryMove(dir, 0);
  }

  private releaseShift(): void {
    const other: -1 | 0 | 1 = this.leftHeld ? -1 : this.rightHeld ? 1 : 0;
    this.dir = other;
    this.dasTimer = 0;
    this.arrTimer = 0;
    if (other !== 0) this.tryMove(other, 0);
  }

  private processShift(): void {
    if (this.dir === 0) return;
    if (this.dasTimer < this.handling.das) {
      this.dasTimer++;
      if (this.dasTimer < this.handling.das) return;
      // DAS gerade voll — erster Auto-Schritt
      if (this.handling.arr === 0) {
        while (this.tryMove(this.dir, 0)) { /* bis zur Wand */ }
      } else {
        this.tryMove(this.dir, 0);
        this.arrTimer = 0;
      }
      return;
    }
    if (this.handling.arr === 0) {
      while (this.tryMove(this.dir, 0)) { /* bis zur Wand */ }
      return;
    }
    this.arrTimer++;
    if (this.arrTimer >= this.handling.arr) {
      this.arrTimer = 0;
      this.tryMove(this.dir, 0);
    }
  }

  private tryMove(dx: number, dy: number): boolean {
    const p = this.active;
    if (!p || this.gameOver) return false;
    if (!this.fits(p.type, p.rot, p.x + dx, p.y + dy)) return false;
    p.x += dx;
    p.y += dy;
    this.lastWasRotation = false;
    this.onMoved();
    return true;
  }

  private onMoved(): void {
    const p = this.active!;
    if (p.y > this.lowestY) {
      this.onDescended();
      return;
    }
    if (this.lockTimer > 0 || !this.fits(p.type, p.rot, p.x, p.y + 1)) {
      if (this.lockResets < MAX_LOCK_RESETS) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    }
  }

  private onDescended(): void {
    const p = this.active!;
    if (p.y > this.lowestY) {
      this.lowestY = p.y;
      this.lockResets = 0;
      this.lockTimer = 0;
    }
  }

  private rotate(delta: 1 | 2 | 3): void {
    const p = this.active;
    if (!p || p.type === "O") return;
    const to = (p.rot + delta) % 4;
    const key = `${p.rot}>${to}`;
    const table = delta === 2 ? KICKS_180 : p.type === "I" ? KICKS_I : KICKS_JLSTZ;
    const kicks = table[key] ?? [[0, 0]];
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      const nx = p.x + kx;
      const ny = p.y - ky;
      if (this.fits(p.type, to, nx, ny)) {
        p.x = nx;
        p.y = ny;
        p.rot = to;
        this.onMoved();
        this.lastWasRotation = true;
        this.lastKickIndex = i;
        return;
      }
    }
  }

  private hardDrop(): void {
    const p = this.active;
    if (!p) return;
    let dist = 0;
    while (this.fits(p.type, p.rot, p.x, p.y + 1)) {
      p.y++;
      dist++;
    }
    if (dist > 0) this.lastWasRotation = false;
    this.stats.score += dist * 2;
    this.lock();
  }

  private doHold(): void {
    const p = this.active;
    if (!p || this.holdUsed) return;
    const prev = this.hold;
    this.hold = p.type;
    this.holdUsed = true;
    this.spawn(prev ?? undefined);
  }

  private detectSpin(): SpinKind {
    const p = this.active!;
    if (p.type !== "T" || !this.lastWasRotation) return "none";
    const corners: [number, number][] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const occ = corners.map(([cx, cy]) => {
      const x = p.x + cx;
      const y = p.y + cy;
      if (x < 0 || x >= WIDTH || y >= HEIGHT) return true;
      return y >= 0 && this.board[y * WIDTH + x] !== 0;
    });
    if (occ.filter(Boolean).length < 3) return "none";
    // Vordere Ecken (Richtung, in die die T-Spitze zeigt)
    const front: Record<number, [number, number]> = { 0: [0, 1], 1: [1, 2], 2: [2, 3], 3: [3, 0] };
    const [a, b] = front[p.rot];
    if ((occ[a] && occ[b]) || this.lastKickIndex === 4) return "full";
    return "mini";
  }

  private lock(): void {
    const p = this.active;
    if (!p) return;
    const spin = this.detectSpin();
    let aboveVisible = true;
    for (const [x, y] of this.activeCells(p)) {
      if (y >= 0) this.board[y * WIDTH + x] = pieceCell(p.type);
      if (y >= VISIBLE_TOP) aboveVisible = false;
    }
    this.active = null;
    this.stats.pieces++;
    this.holdUsed = false;

    // Volle Zeilen entfernen
    let lines = 0;
    for (let y = HEIGHT - 1; y >= 0; y--) {
      let full = true;
      for (let x = 0; x < WIDTH; x++) {
        if (this.board[y * WIDTH + x] === 0) { full = false; break; }
      }
      if (full) {
        this.board.copyWithin(WIDTH, 0, y * WIDTH);
        this.board.fill(0, 0, WIDTH);
        lines++;
        y++; // dieselbe Zeile erneut prüfen
      }
    }
    this.events.push({ type: "lock", lines });

    if (lines > 0 || spin !== "none") this.scoreClear(lines, spin);
    if (lines === 0) this.combo = -1;

    if (aboveVisible && lines === 0) {
      this.end("lockout");
      return;
    }

    if (lines === 0 && this.pendingGarbage.length > 0) this.insertGarbage();
    if (this.gameOver) return;
    this.spawn();
  }

  private scoreClear(lines: number, spin: SpinKind): void {
    const level = this.stats.level;
    const difficult = lines > 0 && (lines === 4 || spin !== "none");
    let combo = this.combo;
    if (lines > 0) combo = this.combo + 1;
    const b2bBonus = difficult && this.b2b;

    let points = clearScore(Math.min(lines, 4), spin) * level;
    if (b2bBonus) points = Math.floor((points * 3) / 2);
    if (lines > 0 && combo > 0) points += 50 * combo * level;

    let perfectClear = false;
    if (lines > 0) {
      perfectClear = this.board.every((c) => c === 0);
      if (perfectClear) points += PC_SCORE[Math.min(lines, 4)] * level;
    }
    this.stats.score += points;

    if (lines === 0) return; // T-Spin ohne Linie: nur Punkte

    this.combo = combo;
    if (difficult) this.b2b = true;
    else this.b2b = false;

    if (spin !== "none") this.stats.tspins++;
    if (lines === 4) this.stats.quads++;
    if (perfectClear) this.stats.perfectClears++;
    if (combo > this.stats.maxCombo) this.stats.maxCombo = combo;

    this.stats.lines += lines;
    if (this.mode === "marathon") {
      const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(this.stats.lines / 10));
      if (newLevel > this.stats.level) {
        this.stats.level = newLevel;
        this.events.push({ type: "levelup", level: newLevel });
      }
    }

    const info: ClearInfo = { lines, spin, combo, b2b: b2bBonus, perfectClear };
    const attack = this.mode === "versus" ? attackFor(info) : 0;
    let sent = attack;
    // Eigener Angriff verrechnet zuerst wartende Garbage.
    while (sent > 0 && this.pendingGarbage.length > 0) {
      const g = this.pendingGarbage[0];
      const cancel = Math.min(g.lines, sent);
      g.lines -= cancel;
      sent -= cancel;
      if (g.lines === 0) this.pendingGarbage.shift();
    }
    this.stats.attackSent += sent;
    this.events.push({ type: "clear", info, attack, sent, score: points });
  }

  private insertGarbage(): void {
    let budget = GARBAGE_CAP;
    let inserted = 0;
    while (budget > 0 && this.pendingGarbage.length > 0) {
      const g = this.pendingGarbage[0];
      const n = Math.min(g.lines, budget);
      // Oberste n Zeilen müssen leer sein, sonst wird man aus dem Feld gedrückt.
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (this.board[y * WIDTH + x] !== 0) {
            this.end("garbage");
            return;
          }
        }
      }
      this.board.copyWithin(0, n * WIDTH);
      for (let y = HEIGHT - n; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) this.board[y * WIDTH + x] = x === g.hole ? 0 : GARBAGE_CELL;
      }
      g.lines -= n;
      budget -= n;
      inserted += n;
      if (g.lines === 0) this.pendingGarbage.shift();
    }
    if (inserted > 0) this.events.push({ type: "garbage", lines: inserted });
  }

  private end(reason: "topout" | "lockout" | "forfeit" | "garbage"): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.events.push({ type: "gameover", reason });
  }
}

// ── Kompakte Darstellung für Gegner-Vorschau (Versus) ────────────────────────

/** Sichtbares Feld (inkl. aktivem Teil) als 200-Zeichen-String "0".."8". */
export function encodeVisibleBoard(e: BlocksEngine): string {
  const cells = e.board.slice(VISIBLE_TOP * WIDTH);
  if (e.active && !e.gameOver) {
    const code = pieceCell(e.active.type);
    for (const [x, y] of e.activeCells()) {
      if (y >= VISIBLE_TOP) cells[(y - VISIBLE_TOP) * WIDTH + x] = code;
    }
  }
  let s = "";
  for (let i = 0; i < cells.length; i++) s += String.fromCharCode(48 + cells[i]);
  return s;
}

export function isValidBoardString(s: unknown): s is string {
  return typeof s === "string" && s.length === WIDTH * VISIBLE_ROWS && /^[0-8]+$/.test(s);
}
