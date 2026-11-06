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
//   dieser Farbe). Sondersteine lösen aus, wenn sie mit abgeräumt werden.
// - Kombos: Zwei Sondersteine miteinander tauschen geht immer und löst eine Kombo aus —
//   Linie+Linie = Kreuz, Linie+Bombe = 3 Reihen + 3 Spalten, Bombe+Bombe = 5×5,
//   Prisma+Linie/Bombe = alle Steine dieser Farbe werden zu Linien/Bomben und zünden, Prisma+Prisma = ganzes Brett.
// - Hindernisse (alle bleiben fest an ihrem Platz, andere Steine fallen an ihnen vorbei):
//   Felsen — weder tauschen noch kombinieren, nur Explosionen von Sondersteinen zerstören sie.
//   Eis — der Stein darin lässt sich nicht tauschen; wird er in eine Reihe eingebaut oder getroffen, bricht
//   das Eis und der Stein ist frei.
//   Ketten — der Stein lässt sich nicht tauschen, aber ganz normal kombinieren.
// - Klassisch: Level für Level mit Ziel(en) und Zug-Budget; neue Farben und Hindernisse kommen nach und nach
//   dazu, ab Level 10 gibt es Doppelziele. Ziel geschafft → nächstes Level, übrige Züge geben Bonus und Sterne.
//   Züge aufgebraucht → einmal pro Runde gibt es einen Joker (+5 Züge), danach ist Schluss.
// - Täglich: ein einziges Brett für alle (Seed aus dem Datum), 30 Züge, so viele Punkte wie möglich.
// - Nachfallende Steine kommen je Spalte in einer festen Reihenfolge (aus Seed, Level, Spalte, Nummer) —
//   so hängt der Nachschub nicht vom Zufall ab, sondern nur davon, wie viele Steine man in der Spalte räumt.
// - Gibt es keinen möglichen Zug mehr, wird das Brett gemischt (kostet nichts).

export const ROWS = 8;
export const COLS = 8;
export const CELLS = ROWS * COLS;
export const MAX_COLORS = 7;
export const DAILY_MOVES = 30;
export const JOKER_MOVES = 5;
/** Kodierter „Zug“ für den Joker in Replays (außerhalb aller Tausch-Codes). */
export const JOKER_CODE = CELLS * 2;

export type GameMode = "classic" | "daily";
export type Special = "none" | "row" | "col" | "bomb" | "prism";
export type Lock = "none" | "ice" | "chain";
/** Art einer Explosion (für Anzeige/Klang): ein Sonderstein oder eine Kombo. */
export type BlastKind = Exclude<Special, "none"> | "cross" | "cross3" | "bomb5" | "board" | "ice";

export interface Piece {
  /** Stabile ID (für Animationen: derselbe Stein rutscht, statt neu zu erscheinen). */
  id: number;
  kind: "gem" | "stone";
  /** Farbe 0..6 — Felsen und Prismen haben -1. */
  color: number;
  special: Special;
  /** Eis / Kette (nur bei normalen Steinen). Fehlt = keins. */
  lock?: Lock;
}

export type Goal =
  | { type: "score"; target: number }
  | { type: "collect"; color: number; count: number }
  | { type: "stones"; count: number }
  | { type: "ice"; count: number }
  | { type: "none" };

export interface LevelDef {
  level: number;
  colors: number;
  stones: number;
  ice: number;
  chains: number;
  /** Sondersteine, die zu Levelbeginn schon auf dem Brett liegen. */
  startSpecials: number;
  moves: number;
  goals: Goal[];
  /** Was ist in diesem Level neu? (für die Level-Ansage) */
  novelty: "start" | "color" | "stones" | "ice" | "chains" | "double" | "none";
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
  /** Fortschritt je Ziel (gleiche Reihenfolge wie def.goals; bei Punkte-Zielen ungenutzt). */
  progress: number[];
  totalMoves: number;
  /** Nachgefallene Steine je Spalte im aktuellen Level (für die feste Nachschub-Reihenfolge). */
  spawnCounts: number[];
  jokers: number;
  jokerUsedThisLevel: boolean;
  /** Züge aufgebraucht, Ziel nicht erreicht — es bleibt nur der Joker (oder Aufhören). */
  outOfMoves: boolean;
  /** Gesammelte Sterne aller geschafften Level. */
  stars: number;
  over: boolean;
}

export interface ClearedCell {
  id: number;
  index: number;
  kind: "gem" | "stone";
  color: number;
}

export type Step =
  | {
      type: "clear";
      cascade: number;
      /** Brett nach dem Abräumen (Lücken = null), neue Sondersteine schon gesetzt, Eis schon gebrochen. */
      board: (Piece | null)[];
      cleared: ClearedCell[];
      fired: { index: number; kind: BlastKind }[];
      created: { id: number; index: number; special: Special }[];
      unfrozen: number[];
      points: number;
      combo: BlastKind | null;
    }
  | { type: "fall"; board: Piece[]; spawned: number[] }
  | { type: "shuffle"; board: Piece[] }
  | { type: "level"; board: Piece[]; bonus: number; stars: number; def: LevelDef };

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

/** Zahl aus festen Eingaben (für den Nachschub je Spalte). */
function hash32(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h ^= p | 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

// ── Level ──

const base = (level: number, colors: number, moves: number, goals: Goal[], extra: Partial<LevelDef> = {}): LevelDef => ({
  level,
  colors,
  stones: 0,
  ice: 0,
  chains: 0,
  startSpecials: 0,
  moves,
  goals,
  novelty: "none",
  ...extra,
});

/** Level-Definition für den klassischen Modus. Farben für Sammel-Ziele kommen aus dem Seed-Zufall. */
export function classicLevelDef(level: number, pickColor: (colors: number) => number): LevelDef {
  switch (level) {
    case 1:
      return base(1, 5, 20, [{ type: "score", target: 1500 }], { novelty: "start" });
    case 2:
      return base(2, 5, 25, [{ type: "stones", count: 3 }], { stones: 3, startSpecials: 1, novelty: "stones" });
    case 3:
      return base(3, 6, 22, [{ type: "collect", color: pickColor(6), count: 18 }], { novelty: "color" });
    case 4:
      return base(4, 6, 26, [{ type: "ice", count: 5 }], { ice: 5, novelty: "ice" });
    case 5:
      return base(5, 7, 22, [{ type: "score", target: 12000 }], { novelty: "color" });
    case 6:
      return base(6, 6, 30, [{ type: "stones", count: 3 }], { stones: 3, chains: 3, startSpecials: 2, novelty: "chains" });
    case 7:
      return base(7, 7, 24, [{ type: "collect", color: pickColor(7), count: 20 }], { ice: 4, chains: 2 });
    case 8:
      return base(8, 6, 28, [{ type: "ice", count: 7 }], { ice: 7, chains: 2 });
    case 9:
      return base(9, 7, 24, [{ type: "score", target: 2200 * 9 }], { stones: 2, chains: 3 });
  }
  // Ab Level 10: Zyklus aus Felsen / Eis / Sammeln / Punkte, jeweils mit einem Zweitziel, langsam schwerer.
  // Level mit Hindernis-Zielen bleiben bei 6 Farben — mit 7 entstehen zu selten Sondersteine.
  const k = level - 10;
  const tier = Math.floor(k / 4);
  const novelty = level === 10 ? "double" : "none";
  switch (k % 4) {
    case 0: {
      const stones = Math.min(8, 3 + tier);
      const color = pickColor(6);
      return base(level, 6, 28 + 2 * stones, [{ type: "stones", count: stones }, { type: "collect", color, count: 12 + 2 * tier }], {
        stones,
        chains: Math.min(8, 2 + tier),
        startSpecials: 2,
        novelty,
      });
    }
    case 1: {
      const ice = Math.min(16, 8 + 2 * tier);
      return base(level, 6, 26, [{ type: "ice", count: ice }, { type: "score", target: (1200 + 100 * tier) * level }], {
        ice,
        chains: Math.min(6, 1 + tier),
        novelty,
      });
    }
    case 2: {
      const color = pickColor(6);
      return base(level, 6, 26, [{ type: "collect", color, count: Math.min(40, 18 + 3 * tier) }, { type: "stones", count: Math.min(4, 2 + tier) }], {
        stones: Math.min(4, 2 + tier),
        ice: Math.min(6, 2 + tier),
        startSpecials: 1,
        novelty,
      });
    }
    default: {
      const ice = Math.min(10, 4 + tier);
      return base(level, tier >= 2 ? 7 : 6, 24, [{ type: "score", target: (2600 + 200 * tier) * level }, { type: "ice", count: ice }], {
        ice,
        chains: Math.min(6, 2 + tier),
        stones: Math.min(4, tier),
        novelty,
      });
    }
  }
}

/** Tages-Brett: Farben und Hindernisse hängen vom Tag ab, Ziel = Punkte in 30 Zügen. */
export function dailyLevelDef(seed: number): LevelDef {
  const colors = 5 + (seed % 2); // 5..6
  const stones = [0, 3, 6][(seed >>> 3) % 3];
  const ice = [0, 4, 8][(seed >>> 6) % 3];
  const chains = [0, 3][(seed >>> 9) % 2];
  return base(1, colors, DAILY_MOVES, [{ type: "none" }], { stones, ice, chains, novelty: "start" });
}

/** Punkte-Multiplikator: höhere Level geben mehr Punkte je Stein. */
function levelMultiplier(state: GameState): number {
  return state.mode === "daily" ? 1 : state.level;
}

// ── Brett-Hilfen ──

const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;
const lockOf = (p: Piece | null | undefined): Lock => p?.lock ?? "none";

/** Bleibt an seinem Platz (Felsen, Eis, Kette) — andere Steine fallen daran vorbei. */
export function isFixed(p: Piece | null | undefined): boolean {
  return !!p && (p.kind === "stone" || lockOf(p) !== "none");
}

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

export function isSwappable(p: Piece | null | undefined): boolean {
  return !!p && p.kind === "gem" && lockOf(p) === "none";
}

/** Ist der Tausch a↔b ein gültiger Zug? */
export function isValidSwap(board: Piece[], a: number, b: number): boolean {
  if (!areAdjacent(a, b)) return false;
  const pa = board[a];
  const pb = board[b];
  if (!isSwappable(pa) || !isSwappable(pb)) return false;
  if (pa.special === "prism" || pb.special === "prism") return true;
  if (pa.special !== "none" && pb.special !== "none") return true; // Kombo
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

/** Ein Zug für den Hinweis-Puls: bevorzugt Kombos, dann Züge, die Sondersteine erzeugen. */
export function findHint(board: Piece[]): [number, number] | null {
  const moves = findMoves(board);
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -1;
  for (const [a, b] of moves) {
    const pa = board[a];
    const pb = board[b];
    let s = 0;
    if (pa.special !== "none" && pb.special !== "none") s = 100;
    else if (pa.special === "prism" || pb.special === "prism") s = 80;
    else {
      const next = board.slice();
      next[a] = pb;
      next[b] = pa;
      const plan = planMatches(next, [b, a]);
      s = plan ? plan.matched.size + plan.created.length * 10 : 0;
    }
    if (s > bestScore) {
      bestScore = s;
      best = [a, b];
    }
  }
  return best;
}

// ── Brett erzeugen / mischen ──

function spawnGem(state: GameState, col: number): Piece {
  const n = state.spawnCounts[col]++;
  const color = hash32(state.seed, state.level, col, n) % state.def.colors;
  return { id: state.nextId++, kind: "gem", color, special: "none" };
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
  for (let attempt = 0; attempt < 60; attempt++) {
    const board: (Piece | null)[] = new Array(CELLS).fill(null);
    // Hindernisse nicht in die oberste Reihe — dort fallen neue Steine herein.
    const free = Array.from({ length: CELLS - COLS }, (_, k) => k + COLS);
    const take = () => free.splice(randInt(state, free.length), 1)[0];
    for (let s = 0; s < def.stones && free.length > 0; s++) board[take()] = { id: state.nextId++, kind: "stone", color: -1, special: "none" };
    fillWithoutMatches(state, board, def.colors);
    const full = board as Piece[];
    for (let s = 0; s < def.ice && free.length > 0; s++) {
      const i = take();
      full[i] = { ...full[i], lock: "ice" };
    }
    for (let s = 0; s < def.chains && free.length > 0; s++) {
      const i = take();
      full[i] = { ...full[i], lock: "chain" };
    }
    for (let s = 0; s < def.startSpecials && free.length > 0; s++) {
      const i = take();
      full[i] = { ...full[i], special: randInt(state, 2) === 0 ? "row" : "col" };
    }
    if (findMoves(full).length > 0) return full;
  }
  // Praktisch unerreichbar — notfalls ohne Hindernisse.
  const board: (Piece | null)[] = new Array(CELLS).fill(null);
  fillWithoutMatches(state, board, def.colors);
  return board as Piece[];
}

/** Mischt alle beweglichen Steine (Hindernisse bleiben liegen), bis es keine Reihe, aber einen Zug gibt. */
function shuffleBoard(state: GameState): Piece[] {
  const board = state.board;
  const slots: number[] = [];
  const gems: Piece[] = [];
  board.forEach((p, i) => {
    if (isSwappable(p)) {
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
  // Mischen hilft nicht (z.B. sehr viele Hindernisse) — bewegliche Steine neu würfeln.
  for (let attempt = 0; attempt < 100; attempt++) {
    const next: (Piece | null)[] = board.map((p) => (isSwappable(p) ? null : p));
    fillWithoutMatches(state, next, state.def.colors);
    if (findRuns(next).length === 0 && findMoves(next as Piece[]).length > 0) return next as Piece[];
  }
  // Letzter Ausweg: Hindernisse entfernen.
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
    progress: [],
    totalMoves: 0,
    spawnCounts: new Array(COLS).fill(0),
    jokers: mode === "classic" ? 1 : 0,
    jokerUsedThisLevel: false,
    outOfMoves: false,
    stars: 0,
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
  state.progress = def.goals.map(() => 0);
  state.spawnCounts = new Array(COLS).fill(0);
  state.jokerUsedThisLevel = false;
  state.outOfMoves = false;
  state.board = generateBoard(state, def);
}

function goalValue(state: GameState, k: number): number {
  return state.def.goals[k]?.type === "score" ? state.levelScore : (state.progress[k] ?? 0);
}

function goalTarget(g: Goal): number {
  return g.type === "score" ? g.target : g.type === "none" ? 0 : g.count;
}

export function goalReached(state: GameState): boolean {
  const goals = state.def.goals;
  if (goals.length === 0 || goals.some((g) => g.type === "none")) return false;
  return goals.every((g, k) => goalValue(state, k) >= goalTarget(g));
}

/** Fortschritt fürs HUD: je Ziel aktueller Wert und Zielwert. */
export function goalProgress(state: GameState): { goal: Goal; value: number; target: number }[] {
  return state.def.goals
    .map((g, k) => ({ goal: g, value: Math.min(goalValue(state, k), goalTarget(g)), target: goalTarget(g) }))
    .filter((x) => x.goal.type !== "none");
}

/** Sterne für ein geschafftes Level: je mehr Züge übrig, desto mehr. Mit Joker gibt es nur einen. */
export function starsFor(movesLeft: number, moves: number, jokerUsed: boolean): number {
  if (jokerUsed) return 1;
  const ratio = movesLeft / Math.max(1, moves);
  return ratio >= 0.25 ? 3 : ratio >= 0.1 ? 2 : 1;
}

function cloneState(s: GameState): GameState {
  return {
    ...s,
    board: s.board.slice(),
    progress: s.progress.slice(),
    spawnCounts: s.spawnCounts.slice(),
    def: { ...s.def, goals: s.def.goals.map((g) => ({ ...g })) },
  };
}

// ── Explosionen ──

function inBounds(r: number, c: number) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function rect(r0: number, c0: number, r1: number, c1: number): number[] {
  const out: number[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inBounds(r, c)) out.push(r * COLS + c);
  return out;
}

/** Wirkungsbereich einer Explosion. */
function blastCells(board: (Piece | null)[], index: number, kind: BlastKind): number[] {
  const r = rowOf(index);
  const c = colOf(index);
  switch (kind) {
    case "row":
      return rect(r, 0, r, COLS - 1);
    case "col":
      return rect(0, c, ROWS - 1, c);
    case "bomb":
      return rect(r - 1, c - 1, r + 1, c + 1);
    case "cross":
      return [...rect(r, 0, r, COLS - 1), ...rect(0, c, ROWS - 1, c)];
    case "cross3":
      return [...rect(r - 1, 0, r + 1, COLS - 1), ...rect(0, c - 1, ROWS - 1, c + 1)];
    case "bomb5":
      return rect(r - 2, c - 2, r + 2, c + 2);
    case "board":
      return rect(0, 0, ROWS - 1, COLS - 1);
    case "prism": {
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
    default:
      return [];
  }
}

interface ClearPlan {
  /** Zellen, die durch Reihen abgeräumt werden. */
  matched: Set<number>;
  /** Zellen, die zusätzlich durch Explosionen getroffen werden (auch Felsen). */
  blasted: Set<number>;
  fired: { index: number; kind: BlastKind }[];
  created: { index: number; special: Special; color: number }[];
  combo: BlastKind | null;
}

const emptyPlan = (): ClearPlan => ({ matched: new Set(), blasted: new Set(), fired: [], created: [], combo: null });

/** Explosionen der Sondersteine in `seeds` auslösen (Kettenreaktion). `done` = schon verbraucht. */
function chainBlasts(board: (Piece | null)[], plan: ClearPlan, seeds: number[], protectedCells: Set<number>, done: Set<number>): void {
  const queue = seeds.slice();
  while (queue.length > 0) {
    const i = queue.shift()!;
    const p = board[i];
    if (!p || p.kind !== "gem" || p.special === "none" || done.has(i)) continue;
    done.add(i);
    plan.fired.push({ index: i, kind: p.special as BlastKind });
    addBlast(board, plan, blastCells(board, i, p.special as BlastKind), protectedCells, done, queue);
  }
}

function addBlast(board: (Piece | null)[], plan: ClearPlan, cells: number[], protectedCells: Set<number>, done: Set<number>, queue: number[]) {
  for (const t of cells) {
    if (protectedCells.has(t)) continue;
    if (!plan.matched.has(t)) plan.blasted.add(t);
    const tp = board[t];
    if (tp && tp.kind === "gem" && tp.special !== "none" && !done.has(t)) queue.push(t);
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

  const plan = emptyPlan();
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
    // Ort: wo der Spieler getauscht hat, sonst die Mitte der längsten Reihe — nie auf Eis/Kette
    // und nie auf einem Sonderstein (der löst ja gerade aus).
    const ok = (p: number) => cells.has(p) && !createdCells.has(p) && lockOf(board[p]) === "none" && board[p].special === "none";
    const mid = longest.cells[Math.floor((longest.cells.length - 1) / 2)];
    const at = preferred.find(ok) ?? (ok(mid) ? mid : [...cells].find(ok));
    if (at === undefined) continue;
    createdCells.add(at);
    plan.created.push({ index: at, special, color: special === "prism" ? -1 : board[at].color });
  }
  return plan;
}

/** Räumt ab, setzt neue Sondersteine, bricht Eis, rechnet Punkte/Ziele und lässt nachrutschen. */
function resolvePlan(state: GameState, plan: ClearPlan, cascade: number, steps: Step[], done: Set<number> = new Set()): void {
  const board: (Piece | null)[] = state.board.slice();
  const createdCells = new Set(plan.created.map((c) => c.index));
  // Sondersteine in abgeräumten Reihen lösen aus (neu entstandene bleiben stehen).
  const seeds = [...plan.matched].filter((i) => !createdCells.has(i) && board[i]?.special !== "none");
  chainBlasts(board, plan, seeds, createdCells, done);

  const goals = state.def.goals;
  const bump = (type: Goal["type"], color = -1, n = 1) =>
    goals.forEach((g, k) => {
      if (g.type === type && (g.type !== "collect" || g.color === color)) state.progress[k] += n;
    });

  const cleared: ClearedCell[] = [];
  const unfrozen: number[] = [];
  let gems = 0;
  let stones = 0;
  const all = new Set([...plan.matched, ...plan.blasted]);
  for (const i of [...all].sort((a, b) => a - b)) {
    if (createdCells.has(i)) continue;
    const p = board[i];
    if (!p) continue;
    if (p.kind === "stone") {
      // Felsen gehen nur durch Explosionen kaputt.
      if (!plan.blasted.has(i)) continue;
      stones++;
    } else if (lockOf(p) === "ice") {
      // Eis bricht — der Stein bleibt und ist frei.
      board[i] = { ...p, lock: "none" };
      unfrozen.push(i);
      continue;
    } else {
      gems++;
      bump("collect", p.color);
    }
    cleared.push({ id: p.id, index: i, kind: p.kind, color: p.color });
    board[i] = null;
  }
  const created: Extract<Step, { type: "clear" }>["created"] = [];
  for (const c of plan.created) {
    const old = board[c.index];
    const piece: Piece = { id: old?.id ?? state.nextId++, kind: "gem", color: c.color, special: c.special };
    // Der Stein, der zum Sonderstein wird, zählt beim Sammeln mit.
    if (old) bump("collect", old.color);
    board[c.index] = piece;
    created.push({ id: piece.id, index: c.index, special: c.special });
  }
  bump("stones", -1, stones);
  bump("ice", -1, unfrozen.length);

  const mult = levelMultiplier(state);
  const comboBonus = plan.combo ? 300 : 0;
  const points = (gems * 10 * cascade + stones * 100 + unfrozen.length * 40 + created.length * 50 + plan.fired.length * 30 + comboBonus) * mult;
  state.score += points;
  state.levelScore += points;
  steps.push({ type: "clear", cascade, board: board.slice(), cleared, fired: plan.fired, created, unfrozen, points, combo: plan.combo });

  // Schwerkraft: bewegliche Steine fallen nach unten und an festen Feldern (Felsen, Eis, Ketten) vorbei,
  // oben kommen neue Steine dazu.
  const spawned: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const slots: number[] = [];
    const movable: Piece[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const i = r * COLS + c;
      if (isFixed(board[i])) continue;
      slots.push(i);
      if (board[i]) movable.push(board[i]!);
    }
    slots.forEach((slot, k) => {
      if (k < movable.length) board[slot] = movable[k];
      else {
        const g = spawnGem(state, c);
        spawned.push(g.id);
        board[slot] = g;
      }
    });
  }
  state.board = board as Piece[];
  steps.push({ type: "fall", board: state.board.slice(), spawned });
}

/** Plan für den Tausch zweier Sondersteine (bzw. Prisma + Stein). Null = normaler Tausch. */
function swapPlan(state: GameState, a: number, b: number, pa: Piece, pb: Piece): { plan: ClearPlan; done: Set<number> } | null {
  // Nach dem Tausch liegt pa auf b und pb auf a.
  const board = state.board;
  const plan = emptyPlan();
  const done = new Set<number>([a, b]);
  const sa = pa.special;
  const sb = pb.special;
  const isLine = (s: Special) => s === "row" || s === "col";
  const queue: number[] = [];
  const blast = (kind: BlastKind, at: number, cells: number[]) => {
    plan.fired.push({ index: at, kind });
    addBlast(board, plan, cells, new Set(), done, queue);
  };

  if (sa === "prism" && sb === "prism") {
    plan.combo = "board";
    blast("board", b, blastCells(board, b, "board"));
  } else if (sa === "prism" || sb === "prism") {
    const prismAt = sa === "prism" ? b : a;
    const other = sa === "prism" ? pb : pa;
    const otherAt = sa === "prism" ? a : b;
    if (other.special === "none") {
      // Prisma + normaler Stein: alle Steine dieser Farbe.
      const cells = [prismAt];
      board.forEach((p, i) => {
        if (p.kind === "gem" && p.color === other.color) cells.push(i);
      });
      blast("prism", prismAt, cells);
    } else {
      // Prisma + Linie/Bombe: alle Steine dieser Farbe werden zu diesem Sonderstein und zünden.
      plan.combo = "prism";
      plan.fired.push({ index: prismAt, kind: "prism" });
      plan.blasted.add(prismAt);
      plan.blasted.add(otherAt);
      let flip = 0;
      board.forEach((p, i) => {
        if (i === otherAt || p.kind !== "gem" || p.color !== other.color) return;
        const special: Special = isLine(other.special) ? (flip++ % 2 === 0 ? "row" : "col") : other.special;
        if (lockOf(p) === "none" && p.special === "none") board[i] = { ...p, special };
        queue.push(i);
        plan.blasted.add(i);
      });
      // Der getauschte Sonderstein zündet selbst auch.
      plan.fired.push({ index: otherAt, kind: other.special as BlastKind });
      addBlast(board, plan, blastCells(board, otherAt, other.special as BlastKind), new Set(), done, queue);
    }
  } else if (sa !== "none" && sb !== "none") {
    if (isLine(sa) && isLine(sb)) {
      plan.combo = "cross";
      blast("cross", b, blastCells(board, b, "cross"));
    } else if (sa === "bomb" && sb === "bomb") {
      plan.combo = "bomb5";
      blast("bomb5", b, blastCells(board, b, "bomb5"));
    } else {
      plan.combo = "cross3";
      blast("cross3", b, blastCells(board, b, "cross3"));
    }
  } else return null;

  chainBlasts(board, plan, queue, new Set(), done);
  return { plan, done };
}

/**
 * Führt einen Zug aus. Ungültige Züge (kein Nachbar, Hindernis, keine Reihe) ändern nichts: ok = false.
 * Der übergebene Zustand bleibt unverändert.
 */
export function applyMove(input: GameState, a: number, b: number): MoveResult {
  if (input.over || input.outOfMoves || input.movesLeft <= 0 || !isValidSwap(input.board, a, b)) {
    return { ok: false, state: input, steps: [] };
  }
  const state = cloneState(input);
  const steps: Step[] = [];
  state.movesLeft--;
  state.totalMoves++;

  const pa = state.board[a];
  const pb = state.board[b];
  state.board[a] = pb;
  state.board[b] = pa;

  let cascade = 1;
  const special = swapPlan(state, a, b, pa, pb);
  if (special) resolvePlan(state, special.plan, cascade++, steps, special.done);

  for (;;) {
    const plan = planMatches(state.board, cascade === 1 ? [b, a] : []);
    if (!plan) break;
    resolvePlan(state, plan, cascade++, steps);
    if (cascade > 60) break; // Sicherheitsnetz
  }

  finishMove(state, steps);
  return { ok: true, state, steps };
}

function finishMove(state: GameState, steps: Step[]): void {
  if (state.mode === "classic" && goalReached(state)) {
    const stars = starsFor(state.movesLeft, state.def.moves, state.jokerUsedThisLevel);
    const bonus = state.movesLeft * 50 * state.level;
    state.score += bonus;
    state.stars += stars;
    const next = classicLevelDef(state.level + 1, (n) => randInt(state, n));
    startLevel(state, next);
    steps.push({ type: "level", board: state.board.slice(), bonus, stars, def: next });
  } else if (state.movesLeft <= 0) {
    if (state.jokers > 0) state.outOfMoves = true;
    else state.over = true;
  } else if (findMoves(state.board).length === 0) {
    state.board = shuffleBoard(state);
    steps.push({ type: "shuffle", board: state.board.slice() });
  }
}

/** Joker einsetzen: nur wenn die Züge aufgebraucht sind und noch ein Joker übrig ist. */
export function playJoker(input: GameState): GameState | null {
  if (input.over || !input.outOfMoves || input.jokers <= 0) return null;
  const state = cloneState(input);
  state.jokers--;
  state.movesLeft = JOKER_MOVES;
  state.outOfMoves = false;
  state.jokerUsedThisLevel = true;
  if (findMoves(state.board).length === 0) state.board = shuffleBoard(state);
  return state;
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
    if (code === JOKER_CODE) {
      const next = playJoker(state);
      if (!next) return { ok: false, error: "Ungültiger Joker." };
      state = next;
      continue;
    }
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
