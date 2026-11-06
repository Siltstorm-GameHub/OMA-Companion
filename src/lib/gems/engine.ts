// ============================================
// OMA Gems — Spiel-Engine (Edelsteine tauschen, Level mit Zielen)
// ============================================
// Rein und deterministisch: Seed + Zugfolge ergeben immer exakt dasselbe Spiel. Der Browser nutzt die
// Engine zum Spielen und Animieren, der Server spielt eingereichte Runden damit nach (replayGame) und
// übernimmt nur sein eigenes Ergebnis.
//
// Regeln:
// - 8×8-Brett. Zwei benachbarte Steine tauschen; der Tausch zählt nur, wenn danach eine Reihe aus
//   mindestens 3 gleichen Steinen entsteht (sonst springt er zurück und kostet keinen Zug).
// - Sondersteine: 4 in einer Reihe → Linien-Stein (räumt die ganze Reihe bzw. Spalte),
//   L-/T-Form → Bombe (räumt 3×3), 5 in einer Reihe → Prisma (tauschen mit einem Stein räumt alle Steine
//   dieser Farbe; Prisma + Prisma räumt das ganze Brett). Sondersteine lösen aus, wenn sie mit abgeräumt werden.
// - Felsen lassen sich weder tauschen noch kombinieren — nur die Explosion eines Sondersteins zerstört sie.
// - Klassisch: Level für Level mit Ziel und Zug-Budget. Jedes zweite Level kommt eine Farbe dazu (bis 7),
//   dazwischen Felsen-Level. Ziel geschafft → nächstes Level (übrige Züge geben Bonus). Züge aufgebraucht → Ende.
// - Täglich: ein einziges Brett für alle (Seed aus dem Datum), 30 Züge, so viele Punkte wie möglich.
// - Gibt es keinen möglichen Zug mehr, wird das Brett gemischt (kostet nichts).

export const ROWS = 8;
export const COLS = 8;
export const CELLS = ROWS * COLS;
export const MAX_COLORS = 7;
export const DAILY_MOVES = 30;

export type GameMode = "classic" | "daily";
export type Special = "none" | "row" | "col" | "bomb" | "prism";

export interface Piece {
  /** Stabile ID (für Animationen: derselbe Stein rutscht, statt neu zu erscheinen). */
  id: number;
  kind: "gem" | "stone";
  /** Farbe 0..6 — Felsen und Prismen haben -1. */
  color: number;
  special: Special;
}

export type Goal =
  | { type: "score"; target: number }
  | { type: "collect"; color: number; count: number }
  | { type: "stones"; count: number }
  | { type: "none" };

export interface LevelDef {
  level: number;
  colors: number;
  stones: number;
  moves: number;
  goal: Goal;
  /** Was ist in diesem Level neu? (für die Level-Ansage) */
  novelty: "start" | "color" | "stones" | "none";
}

export interface GameState {
  mode: GameMode;
  seed: number;
  rng: number;
  nextId: number;
  board: Piece[];
  def: LevelDef;
  level: number;
  movesLeft: number;
  score: number;
  /** Punkte im aktuellen Level (für Punkte-Ziele). */
  levelScore: number;
  /** Fortschritt beim Sammel-/Felsen-Ziel. */
  progress: number;
  totalMoves: number;
  over: boolean;
}

export type Step =
  | {
      type: "clear";
      cascade: number;
      /** Brett nach dem Abräumen (Lücken = null), neue Sondersteine schon gesetzt. */
      board: (Piece | null)[];
      cleared: { id: number; index: number; kind: "gem" | "stone"; color: number }[];
      fired: { index: number; special: Special }[];
      created: { id: number; index: number; special: Special }[];
      points: number;
    }
  | { type: "fall"; board: Piece[]; spawned: number[] }
  | { type: "shuffle"; board: Piece[] }
  | { type: "level"; board: Piece[]; bonus: number; def: LevelDef };

export interface MoveResult {
  ok: boolean;
  state: GameState;
  steps: Step[];
}

// ── Zufall (mulberry32, Zustand im GameState → serialisierbar) ──

function nextRandom(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randInt(state: { rng: number }, n: number): number {
  return Math.floor(nextRandom(state) * n);
}

// ── Level ──

/** Level-Definition für den klassischen Modus. Farbe kommt aus dem Seed-Zufall (randInt). */
export function classicLevelDef(level: number, pickColor: (colors: number) => number): LevelDef {
  if (level === 1) return { level, colors: 5, stones: 0, moves: 20, goal: { type: "score", target: 1500 }, novelty: "start" };
  if (level === 2) return { level, colors: 5, stones: 3, moves: 30, goal: { type: "stones", count: 3 }, novelty: "stones" };
  if (level === 3) return { level, colors: 6, stones: 0, moves: 22, goal: { type: "collect", color: pickColor(6), count: 18 }, novelty: "color" };
  if (level === 4) return { level, colors: 6, stones: 4, moves: 34, goal: { type: "stones", count: 4 }, novelty: "stones" };
  if (level === 5) return { level, colors: 7, stones: 0, moves: 22, goal: { type: "score", target: 2400 * 5 }, novelty: "color" };
  // Ab Level 6: 7 Farben, abwechselnd Felsen / Sammeln / Punkte, langsam schwerer.
  const k = level - 6;
  const tier = Math.floor(k / 3);
  switch (k % 3) {
    case 0: {
      const stones = Math.min(10, 4 + tier);
      return { level, colors: 7, stones, moves: 26 + 2 * stones, goal: { type: "stones", count: stones }, novelty: "stones" };
    }
    case 1:
      return { level, colors: 7, stones: Math.min(8, tier * 2), moves: 22, goal: { type: "collect", color: pickColor(7), count: Math.min(40, 18 + 3 * tier) }, novelty: "none" };
    default:
      return { level, colors: 7, stones: Math.min(8, tier * 2), moves: 22, goal: { type: "score", target: (2600 + 200 * tier) * level }, novelty: "none" };
  }
}

/** Tages-Brett: Farben und Felsen hängen vom Tag ab, Ziel = Punkte in 30 Zügen. */
export function dailyLevelDef(seed: number): LevelDef {
  const colors = 5 + (seed % 3); // 5..7
  const stones = [0, 4, 8][(seed >>> 3) % 3];
  return { level: 1, colors, stones, moves: DAILY_MOVES, goal: { type: "none" }, novelty: "start" };
}

/** Punkte-Multiplikator: höhere Level geben mehr Punkte je Stein. */
function levelMultiplier(state: GameState): number {
  return state.mode === "daily" ? 1 : state.level;
}

// ── Brett-Hilfen ──

const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;

export function areAdjacent(a: number, b: number): boolean {
  if (a < 0 || b < 0 || a >= CELLS || b >= CELLS) return false;
  const dr = Math.abs(rowOf(a) - rowOf(b));
  const dc = Math.abs(colOf(a) - colOf(b));
  return dr + dc === 1;
}

/** Zug als Zahl (für Replays): kleinerer Index × 2 + Richtung (0 = rechts, 1 = unten). */
export function encodeMove(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo * 2 + (hi - lo === 1 ? 0 : 1);
}

export function decodeMove(code: number): [number, number] | null {
  if (!Number.isInteger(code) || code < 0 || code >= CELLS * 2) return null;
  const a = code >> 1;
  const b = code & 1 ? a + COLS : a + 1;
  return areAdjacent(a, b) ? [a, b] : null;
}

function colorAt(board: (Piece | null)[], i: number): number {
  const p = board[i];
  return p && p.kind === "gem" ? p.color : -1;
}

/** Alle Reihen aus ≥3 gleichen Farben. */
function findRuns(board: (Piece | null)[]): { cells: number[]; dir: "h" | "v" }[] {
  const runs: { cells: number[]; dir: "h" | "v" }[] = [];
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const col = colorAt(board, r * COLS + c);
      let e = c + 1;
      while (col >= 0 && e < COLS && colorAt(board, r * COLS + e) === col) e++;
      if (col >= 0 && e - c >= 3) runs.push({ cells: Array.from({ length: e - c }, (_, k) => r * COLS + c + k), dir: "h" });
      c = e;
    }
  }
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const col = colorAt(board, r * COLS + c);
      let e = r + 1;
      while (col >= 0 && e < ROWS && colorAt(board, e * COLS + c) === col) e++;
      if (col >= 0 && e - r >= 3) runs.push({ cells: Array.from({ length: e - r }, (_, k) => (r + k) * COLS + c), dir: "v" });
      r = e;
    }
  }
  return runs;
}

function hasMatchAt(board: (Piece | null)[], i: number): boolean {
  const col = colorAt(board, i);
  if (col < 0) return false;
  const r = rowOf(i);
  const c = colOf(i);
  let h = 1;
  for (let x = c - 1; x >= 0 && colorAt(board, r * COLS + x) === col; x--) h++;
  for (let x = c + 1; x < COLS && colorAt(board, r * COLS + x) === col; x++) h++;
  if (h >= 3) return true;
  let v = 1;
  for (let y = r - 1; y >= 0 && colorAt(board, y * COLS + c) === col; y--) v++;
  for (let y = r + 1; y < ROWS && colorAt(board, y * COLS + c) === col; y++) v++;
  return v >= 3;
}

function isSwappable(p: Piece | null): boolean {
  return !!p && p.kind === "gem";
}

/** Ist der Tausch a↔b ein gültiger Zug? */
export function isValidSwap(board: Piece[], a: number, b: number): boolean {
  if (!areAdjacent(a, b)) return false;
  const pa = board[a];
  const pb = board[b];
  if (!isSwappable(pa) || !isSwappable(pb)) return false;
  if (pa.special === "prism" || pb.special === "prism") return true;
  const next = board.slice();
  next[a] = pb;
  next[b] = pa;
  return hasMatchAt(next, a) || hasMatchAt(next, b);
}

/** Alle gültigen Züge (für Hinweise und die Prüfung „keine Züge mehr“). */
export function findMoves(board: Piece[]): [number, number][] {
  const moves: [number, number][] = [];
  for (let i = 0; i < CELLS; i++) {
    if (colOf(i) < COLS - 1 && isValidSwap(board, i, i + 1)) moves.push([i, i + 1]);
    if (rowOf(i) < ROWS - 1 && isValidSwap(board, i, i + COLS)) moves.push([i, i + COLS]);
  }
  return moves;
}

/** Ein Zug für den Hinweis-Puls (bevorzugt der, der am meisten Steine räumt — grob geschätzt). */
export function findHint(board: Piece[]): [number, number] | null {
  const moves = findMoves(board);
  return moves[0] ?? null;
}

// ── Brett erzeugen / mischen ──

function newGem(state: GameState, colors: number): Piece {
  return { id: state.nextId++, kind: "gem", color: randInt(state, colors), special: "none" };
}

function fillWithoutMatches(state: GameState, board: (Piece | null)[], colors: number): void {
  for (let i = 0; i < CELLS; i++) {
    if (board[i]) continue;
    const r = rowOf(i);
    const c = colOf(i);
    const banned = new Set<number>();
    if (c >= 2 && colorAt(board, i - 1) >= 0 && colorAt(board, i - 1) === colorAt(board, i - 2)) banned.add(colorAt(board, i - 1));
    if (r >= 2 && colorAt(board, i - COLS) >= 0 && colorAt(board, i - COLS) === colorAt(board, i - 2 * COLS)) banned.add(colorAt(board, i - COLS));
    const allowed = Array.from({ length: colors }, (_, k) => k).filter((k) => !banned.has(k));
    board[i] = { id: state.nextId++, kind: "gem", color: allowed[randInt(state, allowed.length)], special: "none" };
  }
}

function generateBoard(state: GameState, def: LevelDef): Piece[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const board: (Piece | null)[] = new Array(CELLS).fill(null);
    // Felsen nicht in die oberste Reihe — dort fallen neue Steine herein.
    const free = Array.from({ length: CELLS - COLS }, (_, k) => k + COLS);
    for (let s = 0; s < def.stones && free.length > 0; s++) {
      const idx = free.splice(randInt(state, free.length), 1)[0];
      board[idx] = { id: state.nextId++, kind: "stone", color: -1, special: "none" };
    }
    fillWithoutMatches(state, board, def.colors);
    const full = board as Piece[];
    if (findMoves(full).length > 0) return full;
  }
  // Praktisch unerreichbar — notfalls ohne Felsen.
  const board: (Piece | null)[] = new Array(CELLS).fill(null);
  fillWithoutMatches(state, board, def.colors);
  return board as Piece[];
}

/** Mischt alle beweglichen Steine (Felsen bleiben liegen), bis es keine Reihe, aber einen Zug gibt. */
function shuffleBoard(state: GameState): Piece[] {
  const board = state.board;
  const slots: number[] = [];
  const gems: Piece[] = [];
  board.forEach((p, i) => {
    if (p.kind === "gem") {
      slots.push(i);
      gems.push(p);
    }
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    const pool = gems.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randInt(state, i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const next = board.slice();
    slots.forEach((slot, k) => (next[slot] = pool[k]));
    if (findRuns(next).length === 0 && findMoves(next).length > 0) return next;
  }
  // Mischen hilft nicht (z.B. sehr viele Felsen) — bewegliche Steine neu würfeln.
  for (let attempt = 0; attempt < 100; attempt++) {
    const next: (Piece | null)[] = board.map((p) => (p.kind === "stone" ? p : null));
    fillWithoutMatches(state, next, state.def.colors);
    if (findMoves(next as Piece[]).length > 0) return next as Piece[];
  }
  // Letzter Ausweg: Felsen entfernen.
  const next: (Piece | null)[] = new Array(CELLS).fill(null);
  fillWithoutMatches(state, next, state.def.colors);
  return next as Piece[];
}

// ── Spiel ──

export function newGame(mode: GameMode, seed: number): GameState {
  const state: GameState = {
    mode,
    seed,
    rng: seed | 0,
    nextId: 1,
    board: [],
    def: dailyLevelDef(seed),
    level: 1,
    movesLeft: 0,
    score: 0,
    levelScore: 0,
    progress: 0,
    totalMoves: 0,
    over: false,
  };
  const def = mode === "daily" ? dailyLevelDef(seed) : classicLevelDef(1, (n) => randInt(state, n));
  startLevel(state, def);
  return state;
}

function startLevel(state: GameState, def: LevelDef): void {
  state.def = def;
  state.level = def.level;
  state.movesLeft = def.moves;
  state.levelScore = 0;
  state.progress = 0;
  state.board = generateBoard(state, def);
}

export function goalReached(state: GameState): boolean {
  const g = state.def.goal;
  switch (g.type) {
    case "score":
      return state.levelScore >= g.target;
    case "collect":
      return state.progress >= g.count;
    case "stones":
      return state.progress >= g.count;
    default:
      return false;
  }
}

/** Fortschritt fürs HUD: aktueller Wert und Zielwert. */
export function goalProgress(state: GameState): { value: number; target: number } | null {
  const g = state.def.goal;
  if (g.type === "score") return { value: Math.min(state.levelScore, g.target), target: g.target };
  if (g.type === "collect" || g.type === "stones") return { value: Math.min(state.progress, g.count), target: g.count };
  return null;
}

function cloneState(s: GameState): GameState {
  return { ...s, board: s.board.slice(), def: { ...s.def, goal: { ...s.def.goal } } };
}

/** Wirkungsbereich eines ausgelösten Sondersteins. */
function blastCells(board: (Piece | null)[], index: number, special: Special): number[] {
  const r = rowOf(index);
  const c = colOf(index);
  if (special === "row") return Array.from({ length: COLS }, (_, k) => r * COLS + k);
  if (special === "col") return Array.from({ length: ROWS }, (_, k) => k * COLS + c);
  if (special === "bomb") {
    const out: number[] = [];
    for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if (y >= 0 && y < ROWS && x >= 0 && x < COLS) out.push(y * COLS + x);
    return out;
  }
  if (special === "prism") {
    // Von einer Explosion getroffen: räumt die häufigste Farbe auf dem Brett.
    const counts = new Array(MAX_COLORS).fill(0);
    board.forEach((p) => {
      if (p && p.kind === "gem" && p.color >= 0) counts[p.color]++;
    });
    const top = counts.indexOf(Math.max(...counts));
    const out = [index];
    board.forEach((p, i) => {
      if (p && p.kind === "gem" && p.color === top) out.push(i);
    });
    return out;
  }
  return [];
}

interface ClearPlan {
  /** Zellen, die durch Reihen abgeräumt werden. */
  matched: Set<number>;
  /** Zellen, die zusätzlich durch Explosionen getroffen werden (auch Felsen). */
  blasted: Set<number>;
  fired: { index: number; special: Special }[];
  created: { index: number; special: Special; color: number }[];
}

/** Explosionen der Sondersteine in `seeds` auslösen (Kettenreaktion). */
function chainBlasts(board: (Piece | null)[], plan: ClearPlan, seeds: number[], protectedCells: Set<number>): void {
  const queue = seeds.slice();
  const firedSet = new Set(plan.fired.map((f) => f.index));
  while (queue.length > 0) {
    const i = queue.shift()!;
    const p = board[i];
    if (!p || p.kind !== "gem" || p.special === "none" || firedSet.has(i)) continue;
    firedSet.add(i);
    plan.fired.push({ index: i, special: p.special });
    for (const t of blastCells(board, i, p.special)) {
      if (protectedCells.has(t)) continue;
      if (!plan.matched.has(t)) plan.blasted.add(t);
      const tp = board[t];
      if (tp && tp.kind === "gem" && tp.special !== "none" && !firedSet.has(t)) queue.push(t);
    }
  }
}

function planMatches(board: Piece[], preferred: number[]): ClearPlan | null {
  const runs = findRuns(board);
  if (runs.length === 0) return null;
  // Reihen, die sich eine Zelle teilen, gehören zu einer Gruppe (L-/T-Formen).
  const parent = runs.map((_, k) => k);
  const find = (k: number): number => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  const owner = new Map<number, number>();
  runs.forEach((run, k) => {
    for (const cell of run.cells) {
      const o = owner.get(cell);
      if (o !== undefined) parent[find(k)] = find(o);
      else owner.set(cell, k);
    }
  });
  const groups = new Map<number, number[]>();
  runs.forEach((_, k) => {
    const root = find(k);
    groups.set(root, [...(groups.get(root) ?? []), k]);
  });

  const plan: ClearPlan = { matched: new Set(), blasted: new Set(), fired: [], created: [] };
  const createdCells = new Set<number>();
  for (const members of groups.values()) {
    const cells = new Set<number>();
    let longest = runs[members[0]];
    const dirs = new Set<string>();
    for (const k of members) {
      runs[k].cells.forEach((c) => cells.add(c));
      dirs.add(runs[k].dir);
      if (runs[k].cells.length > longest.cells.length) longest = runs[k];
    }
    cells.forEach((c) => plan.matched.add(c));
    let special: Special = "none";
    if (longest.cells.length >= 5) special = "prism";
    else if (dirs.size === 2) special = "bomb";
    else if (longest.cells.length === 4) special = longest.dir === "h" ? "row" : "col";
    if (special === "none") continue;
    // Ort: wo der Spieler getauscht hat, sonst die Mitte der längsten Reihe.
    const at = preferred.find((p) => cells.has(p) && !createdCells.has(p)) ?? longest.cells[Math.floor((longest.cells.length - 1) / 2)];
    createdCells.add(at);
    plan.created.push({ index: at, special, color: special === "prism" ? -1 : board[at].color });
  }
  return plan;
}

/** Räumt ab, setzt neue Sondersteine, rechnet Punkte/Ziele und lässt nachrutschen. Gibt Steps zurück. */
function resolvePlan(state: GameState, plan: ClearPlan, cascade: number, steps: Step[]): void {
  const board: (Piece | null)[] = state.board.slice();
  const createdCells = new Set(plan.created.map((c) => c.index));
  // Sondersteine in abgeräumten Reihen lösen aus (Neu entstandene bleiben stehen).
  const seeds = [...plan.matched].filter((i) => !createdCells.has(i) && board[i]?.special !== "none");
  chainBlasts(board, plan, seeds, createdCells);

  const cleared: Extract<Step, { type: "clear" }>["cleared"] = [];
  let gems = 0;
  let stones = 0;
  const all = new Set([...plan.matched, ...plan.blasted]);
  for (const i of [...all].sort((a, b) => a - b)) {
    if (createdCells.has(i)) continue;
    const p = board[i];
    if (!p) continue;
    // Felsen gehen nur durch Explosionen kaputt.
    if (p.kind === "stone" && !plan.blasted.has(i)) continue;
    cleared.push({ id: p.id, index: i, kind: p.kind, color: p.color });
    if (p.kind === "stone") stones++;
    else {
      gems++;
      if (state.def.goal.type === "collect" && p.color === state.def.goal.color) state.progress++;
    }
    board[i] = null;
  }
  const created: Extract<Step, { type: "clear" }>["created"] = [];
  for (const c of plan.created) {
    const old = board[c.index];
    const piece: Piece = { id: old?.id ?? state.nextId++, kind: "gem", color: c.color, special: c.special };
    // Der Stein, der zum Sonderstein wird, zählt beim Sammeln mit.
    if (state.def.goal.type === "collect" && old && old.color === state.def.goal.color) state.progress++;
    board[c.index] = piece;
    created.push({ id: piece.id, index: c.index, special: c.special });
  }
  if (state.def.goal.type === "stones") state.progress += stones;

  const mult = levelMultiplier(state);
  const points = (gems * 10 * cascade + stones * 100 + created.length * 50 + plan.fired.length * 30) * mult;
  state.score += points;
  state.levelScore += points;
  steps.push({ type: "clear", cascade, board: board.slice(), cleared, fired: plan.fired, created, points });

  // Schwerkraft: alles fällt nach unten, oben kommen neue Steine dazu.
  const spawned: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const column: Piece[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const p = board[r * COLS + c];
      if (p) column.push(p);
    }
    while (column.length < ROWS) {
      const g = newGem(state, state.def.colors);
      spawned.push(g.id);
      column.push(g);
    }
    for (let r = ROWS - 1, k = 0; r >= 0; r--, k++) board[r * COLS + c] = column[k];
  }
  state.board = board as Piece[];
  steps.push({ type: "fall", board: state.board.slice(), spawned });
}

/**
 * Führt einen Zug aus. Ungültige Züge (kein Nachbar, Felsen, keine Reihe) ändern nichts: ok = false.
 * Der übergebene Zustand bleibt unverändert.
 */
export function applyMove(input: GameState, a: number, b: number): MoveResult {
  if (input.over || !isValidSwap(input.board, a, b)) return { ok: false, state: input, steps: [] };
  const state = cloneState(input);
  const steps: Step[] = [];
  state.movesLeft--;
  state.totalMoves++;

  const pa = state.board[a];
  const pb = state.board[b];
  state.board[a] = pb;
  state.board[b] = pa;

  let cascade = 1;
  if (pa.special === "prism" || pb.special === "prism") {
    // Prisma-Tausch: räumt eine Farbe (oder bei zwei Prismen das ganze Brett).
    const plan: ClearPlan = { matched: new Set(), blasted: new Set(), fired: [], created: [] };
    if (pa.special === "prism" && pb.special === "prism") {
      plan.fired.push({ index: a, special: "prism" }, { index: b, special: "prism" });
      for (let i = 0; i < CELLS; i++) plan.blasted.add(i);
    } else {
      const prismAt = pa.special === "prism" ? b : a; // nach dem Tausch
      const other = pa.special === "prism" ? pb : pa;
      plan.fired.push({ index: prismAt, special: "prism" });
      plan.blasted.add(prismAt);
      const seeds: number[] = [];
      state.board.forEach((p, i) => {
        if (p.kind === "gem" && p.color === other.color) {
          plan.blasted.add(i);
          if (p.special !== "none") seeds.push(i);
        }
      });
      chainBlasts(state.board, plan, seeds, new Set());
    }
    resolvePlan(state, plan, cascade++, steps);
  }

  for (;;) {
    const plan = planMatches(state.board, cascade === 1 ? [b, a] : []);
    if (!plan) break;
    resolvePlan(state, plan, cascade++, steps);
    if (cascade > 60) break; // Sicherheitsnetz
  }

  if (state.mode === "classic" && goalReached(state)) {
    const bonus = state.movesLeft * 50 * state.level;
    state.score += bonus;
    const next = classicLevelDef(state.level + 1, (n) => randInt(state, n));
    startLevel(state, next);
    steps.push({ type: "level", board: state.board.slice(), bonus, def: next });
  } else if (state.movesLeft <= 0) {
    state.over = true;
  } else if (findMoves(state.board).length === 0) {
    state.board = shuffleBoard(state);
    steps.push({ type: "shuffle", board: state.board.slice() });
  }

  return { ok: true, state, steps };
}

export const MAX_REPLAY_MOVES = 20_000;

/** Spielt eine Runde aus Seed + Zügen nach (Server). Jeder Zug muss gültig sein. */
export function replayGame(
  mode: GameMode,
  seed: number,
  moves: number[],
): { ok: true; state: GameState } | { ok: false; error: string } {
  if (moves.length > MAX_REPLAY_MOVES) return { ok: false, error: "Zu viele Züge." };
  let state = newGame(mode, seed);
  for (const code of moves) {
    const pair = decodeMove(code);
    if (!pair || state.over) return { ok: false, error: "Ungültiger Zug." };
    const res = applyMove(state, pair[0], pair[1]);
    if (!res.ok) return { ok: false, error: "Ungültiger Zug." };
    state = res.state;
  }
  return { ok: true, state };
}

/** Seed der täglichen Herausforderung für einen Tag "YYYY-MM-DD" (für alle gleich). */
export function dailySeed(day: string): number {
  let h = 2166136261;
  for (const ch of `oma-gems-daily:${day}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) || 1;
}

export const COLOR_NAMES = ["Rubin", "Topas", "Smaragd", "Saphir", "Amethyst", "Bernstein", "Perle"];
