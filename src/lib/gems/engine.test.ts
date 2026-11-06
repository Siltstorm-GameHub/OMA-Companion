import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELLS,
  JOKER_CODE,
  isFixed,
  playJoker,
  starsFor,
  COLS,
  applyMove,
  classicLevelDef,
  dailySeed,
  decodeMove,
  encodeMove,
  findMoves,
  newGame,
  replayGame,
  type GameState,
  type Piece,
} from "./engine";

function hasRun(board: Piece[]): boolean {
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (p.kind !== "gem" || p.color < 0) continue;
    const c = i % COLS;
    if (c <= COLS - 3 && board[i + 1].color === p.color && board[i + 2].color === p.color && board[i + 1].kind === "gem" && board[i + 2].kind === "gem") return true;
    if (i + 2 * COLS < CELLS && board[i + COLS].color === p.color && board[i + 2 * COLS].color === p.color && board[i + COLS].kind === "gem" && board[i + 2 * COLS].kind === "gem") return true;
  }
  return false;
}

/** Spielt mit dem jeweils ersten möglichen Zug, bis das Spiel endet oder `limit` erreicht ist. */
function autoplay(mode: "classic" | "daily", seed: number, limit = 400): { state: GameState; codes: number[] } {
  let state = newGame(mode, seed);
  const codes: number[] = [];
  while (!state.over && codes.length < limit) {
    if (state.outOfMoves) {
      state = playJoker(state)!;
      codes.push(JOKER_CODE);
      continue;
    }
    const [a, b] = findMoves(state.board)[0];
    const res = applyMove(state, a, b);
    assert.ok(res.ok);
    codes.push(encodeMove(a, b));
    state = res.state;
  }
  return { state, codes };
}

test("neues Brett: voll, ohne fertige Reihen, mit mindestens einem Zug", () => {
  for (let seed = 1; seed < 40; seed++) {
    const s = newGame("classic", seed);
    assert.equal(s.board.length, CELLS);
    assert.ok(!hasRun(s.board), `Seed ${seed} hat eine fertige Reihe`);
    assert.ok(findMoves(s.board).length > 0);
  }
});

test("gleicher Seed → gleiches Brett", () => {
  assert.deepEqual(newGame("classic", 123).board, newGame("classic", 123).board);
  assert.notDeepEqual(newGame("classic", 123).board, newGame("classic", 124).board);
});

test("Zug-Kodierung ist umkehrbar und lehnt Ränder ab", () => {
  assert.deepEqual(decodeMove(encodeMove(10, 11)), [10, 11]);
  assert.deepEqual(decodeMove(encodeMove(10, 18)), [10, 18]);
  assert.equal(decodeMove(7 * 2), null); // Feld 7 nach rechts würde in die nächste Reihe springen
  assert.equal(decodeMove(-1), null);
  assert.equal(decodeMove(CELLS * 2), null);
});

test("ungültiger Tausch ändert nichts", () => {
  const s = newGame("classic", 5);
  const res = applyMove(s, 0, 9); // nicht benachbart
  assert.equal(res.ok, false);
  assert.equal(res.state, s);
});

test("Zug kostet einen Zug und das Brett bleibt voll und ohne Reihen", () => {
  const s = newGame("classic", 9);
  const [a, b] = findMoves(s.board)[0];
  const res = applyMove(s, a, b);
  assert.ok(res.ok);
  assert.equal(res.state.movesLeft, s.movesLeft - 1);
  assert.ok(res.state.score > 0);
  assert.equal(res.state.board.length, CELLS);
  assert.ok(res.state.board.every(Boolean));
  assert.ok(!hasRun(res.state.board));
  // Eingabe-Zustand bleibt unverändert
  assert.equal(s.score, 0);
});

test("Replay ergibt exakt dasselbe Ergebnis", () => {
  for (const mode of ["classic", "daily"] as const) {
    const { state, codes } = autoplay(mode, 4242);
    const rep = replayGame(mode, 4242, codes);
    assert.ok(rep.ok);
    if (rep.ok) {
      assert.equal(rep.state.score, state.score);
      assert.equal(rep.state.level, state.level);
      assert.equal(rep.state.over, state.over);
    }
  }
});

test("Replay lehnt ungültige Züge ab", () => {
  const rep = replayGame("classic", 1, [encodeMove(0, 1), encodeMove(0, 1), encodeMove(0, 1)]);
  // Mindestens einer der Züge kann keine Reihe bilden → abgelehnt
  if (rep.ok) assert.fail("hätte abgelehnt werden müssen");
});

test("Tagesmodus endet nach 30 Zügen", () => {
  const { state, codes } = autoplay("daily", dailySeed("2026-11-06"));
  assert.equal(codes.length, 30);
  assert.equal(state.over, true);
});

test("Tages-Seed ist pro Tag stabil und unterschiedlich", () => {
  assert.equal(dailySeed("2026-11-06"), dailySeed("2026-11-06"));
  assert.notEqual(dailySeed("2026-11-06"), dailySeed("2026-11-07"));
});

test("Level bringen nach und nach neue Farben, Hindernisse und Doppelziele", () => {
  const defs = Array.from({ length: 14 }, (_, k) => classicLevelDef(k + 1, () => 0));
  assert.deepEqual(defs.slice(0, 6).map((d) => d.colors), [5, 5, 6, 6, 7, 6]);
  assert.equal(defs[1].goals[0].type, "stones");
  assert.ok(defs[1].stones > 0 && defs[1].startSpecials > 0);
  assert.equal(defs[3].goals[0].type, "ice");
  assert.equal(defs[5].novelty, "chains");
  assert.ok(defs.slice(0, 9).every((d) => d.goals.length === 1));
  assert.ok(defs.slice(9).every((d) => d.goals.length === 2), "ab Level 10 Doppelziele");
});

// ── Hand-Bretter: Grundmuster ohne fertige Reihe ((r + 2c) mod 5 → Nachbarn nie gleich) ──
let nextId = 1;
function gem(color: number, extra: Partial<Piece> = {}): Piece {
  return { id: nextId++, kind: "gem", color, special: "none", ...extra };
}
function patternBoard(): Piece[] {
  return Array.from({ length: CELLS }, (_, i) => gem((Math.floor(i / COLS) + 2 * (i % COLS)) % 5));
}
function withBoard(board: Piece[], level = 2): GameState {
  const s = newGame("classic", 99);
  const def = classicLevelDef(level, () => 0);
  return { ...s, board, def, level, movesLeft: 10, progress: def.goals.map(() => 0) };
}
const idx = (r: number, c: number) => r * COLS + c;
const clearedIds = (steps: ReturnType<typeof applyMove>["steps"]) => steps.flatMap((s) => (s.type === "clear" ? s.cleared.map((c) => c.id) : []));

test("Felsen werden nicht durch normale Reihen zerstört, wohl aber durch Linien-Steine", () => {
  const board = patternBoard();
  const stone: Piece = { id: 5000, kind: "stone", color: -1, special: "none" };
  board[idx(7, 7)] = stone;
  // Reihe 7: [0]=Linie(Farbe 9) [1]=9 [2]=x, darüber (6,2)=9 → Tausch bildet 3er-Reihe mit dem Linien-Stein
  board[idx(7, 0)] = gem(4, { special: "row" });
  board[idx(7, 1)] = gem(4);
  board[idx(6, 2)] = gem(4);
  board[idx(6, 0)] = gem(0);
  board[idx(6, 1)] = gem(1);
  const res = applyMove(withBoard(board), idx(6, 2), idx(7, 2));
  assert.ok(res.ok);
  assert.ok(clearedIds(res.steps).includes(5000), "Felsen sollte vom Linien-Stein zerstört werden");
});

test("Felsen bleiben fest an ihrem Platz, Steine fallen daran vorbei", () => {
  const board = patternBoard();
  const stone: Piece = { id: 6000, kind: "stone", color: -1, special: "none" };
  board[idx(5, 3)] = stone;
  // Waagrechte 3er-Reihe in Zeile 7, Spalten 2–4 → Spalte 3 rutscht über den Felsen hinweg nach
  board[idx(7, 2)] = gem(4);
  board[idx(7, 3)] = gem(4);
  board[idx(6, 4)] = gem(4);
  board[idx(7, 4)] = gem(0);
  const res = applyMove(withBoard(board), idx(6, 4), idx(7, 4));
  assert.ok(res.ok);
  const after = res.state.level === 2 ? res.state.board : null;
  if (after) assert.equal(after[idx(5, 3)].id, 6000);
  assert.ok(res.steps.filter((s) => s.type === "fall").every((s) => s.type === "fall" && s.board[idx(5, 3)].id === 6000));
});

test("Eis: nicht tauschbar, bricht beim Einbau in eine Reihe — der Stein bleibt", () => {
  const board = patternBoard();
  board[idx(7, 0)] = gem(4, { lock: "ice", id: 7000 });
  board[idx(7, 1)] = gem(4);
  board[idx(6, 2)] = gem(4);
  const state = withBoard(board, 4);
  assert.equal(isFixed(board[idx(7, 0)]), true);
  assert.equal(applyMove(state, idx(7, 0), idx(6, 0)).ok, false, "Eis lässt sich nicht tauschen");
  const res = applyMove(state, idx(6, 2), idx(7, 2));
  assert.ok(res.ok);
  assert.ok(!clearedIds(res.steps).includes(7000), "Stein im Eis wird nicht abgeräumt");
  const clear = res.steps.find((s) => s.type === "clear");
  assert.ok(clear && clear.type === "clear" && clear.unfrozen.includes(idx(7, 0)));
  assert.equal(res.state.progress[0], 1);
});

test("Kette: nicht tauschbar, aber normal kombinierbar", () => {
  const board = patternBoard();
  board[idx(7, 0)] = gem(4, { lock: "chain", id: 7100 });
  board[idx(7, 1)] = gem(4);
  board[idx(6, 2)] = gem(4);
  const state = withBoard(board);
  assert.equal(applyMove(state, idx(7, 0), idx(6, 0)).ok, false);
  const res = applyMove(state, idx(6, 2), idx(7, 2));
  assert.ok(res.ok);
  assert.ok(clearedIds(res.steps).includes(7100));
});

test("Kombos: Linie + Linie räumt ein Kreuz, Bombe + Bombe 5×5", () => {
  const board = patternBoard();
  board[idx(3, 3)] = gem(0, { special: "row" });
  board[idx(3, 4)] = gem(1, { special: "col" });
  const res = applyMove(withBoard(board), idx(3, 3), idx(3, 4));
  assert.ok(res.ok, "zwei Sondersteine lassen sich immer tauschen");
  const first = res.steps[0];
  assert.ok(first.type === "clear" && first.combo === "cross");
  // Kreuz um (3,3): ganze Reihe 3 + ganze Spalte 3 = 15 Steine
  assert.ok(first.type === "clear" && first.cleared.length >= 15);

  const b2 = patternBoard();
  b2[idx(4, 4)] = gem(0, { special: "bomb" });
  b2[idx(4, 5)] = gem(1, { special: "bomb" });
  const r2 = applyMove(withBoard(b2), idx(4, 4), idx(4, 5));
  const f2 = r2.steps[0];
  assert.ok(f2.type === "clear" && f2.combo === "bomb5" && f2.cleared.length >= 25);
});

test("Kombo: Prisma + Linie macht alle Steine einer Farbe zu Linien", () => {
  const board = patternBoard();
  board[idx(2, 2)] = gem(-1, { special: "prism" });
  board[idx(2, 3)] = gem(3, { special: "row" });
  const res = applyMove(withBoard(board), idx(2, 2), idx(2, 3));
  const first = res.steps[0];
  assert.ok(first.type === "clear" && first.combo === "prism");
  assert.ok(first.type === "clear" && first.fired.length > 5);
});

test("Joker: nach dem letzten Zug +5 Züge, danach ist Schluss", () => {
  let state = { ...newGame("classic", 31), movesLeft: 1 };
  const [a, b] = findMoves(state.board)[0];
  state = applyMove(state, a, b).state;
  if (state.level > 1) return; // Ziel zufällig geschafft — nichts zu prüfen
  assert.equal(state.outOfMoves, true);
  assert.equal(state.over, false);
  assert.equal(applyMove(state, ...findMoves(state.board)[0]).ok, false, "ohne Züge kein Tausch");
  const j = playJoker(state);
  assert.ok(j);
  assert.equal(j!.movesLeft, 5);
  assert.equal(j!.jokers, 0);
  assert.equal(playJoker(j!), null);
});

test("Replay mit Joker", () => {
  // Spiele bis zum ersten „Züge aufgebraucht“, setze den Joker ein und spiele weiter.
  let state = newGame("classic", 555);
  const codes: number[] = [];
  while (!state.over && codes.length < 300) {
    if (state.outOfMoves) {
      state = playJoker(state)!;
      codes.push(JOKER_CODE);
      continue;
    }
    const [a, b] = findMoves(state.board)[0];
    state = applyMove(state, a, b).state;
    codes.push(encodeMove(a, b));
  }
  const rep = replayGame("classic", 555, codes);
  assert.ok(rep.ok);
  if (rep.ok) assert.equal(rep.state.score, state.score);
  assert.ok(codes.includes(JOKER_CODE));
  assert.equal(replayGame("daily", 1, [JOKER_CODE]).ok, false, "im Tagesmodus gibt es keinen Joker");
});

test("Sterne nach übrigen Zügen, mit Joker nur einer", () => {
  assert.equal(starsFor(8, 20, false), 3);
  assert.equal(starsFor(3, 20, false), 2);
  assert.equal(starsFor(0, 20, false), 1);
  assert.equal(starsFor(10, 20, true), 1);
});

test("Tagesmodus: Nachschub je Spalte hängt nicht von Zügen in anderen Spalten ab", () => {
  const seed = dailySeed("2026-11-20");
  const s = newGame("daily", seed);
  const moves = findMoves(s.board);
  // Zwei verschiedene erste Züge: die jeweils ersten nachgefallenen Steine einer Spalte haben dieselbe Farbe.
  const firstSpawnColor = (a: number, b: number) => {
    const res = applyMove(s, a, b);
    const out = new Map<number, number>();
    for (const st of res.steps) {
      if (st.type !== "fall") continue;
      st.board.forEach((p, i) => {
        if (st.spawned.includes(p.id) && !out.has(i % COLS)) out.set(i % COLS, p.color);
      });
      break;
    }
    return out;
  };
  const x = firstSpawnColor(...moves[0]);
  const y = firstSpawnColor(...moves[moves.length - 1]);
  for (const [col, color] of x) if (y.has(col) && s.board.every((p) => p.kind === "gem")) assert.equal(y.get(col), color);
});
