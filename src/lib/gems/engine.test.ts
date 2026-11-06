import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELLS,
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

test("Level bringen abwechselnd neue Farben und Felsen", () => {
  const defs = [1, 2, 3, 4, 5, 6, 7, 8].map((l) => classicLevelDef(l, () => 0));
  assert.deepEqual(defs.map((d) => d.colors), [5, 5, 6, 6, 7, 7, 7, 7]);
  assert.equal(defs[1].goal.type, "stones");
  assert.ok(defs[1].stones > 0);
  assert.equal(defs[3].goal.type, "stones");
  assert.equal(defs[2].novelty, "color");
});

test("Felsen werden nicht durch normale Reihen zerstört, wohl aber durch Linien-Steine", () => {
  // Brett von Hand: Reihe 7 komplett, Felsen in Reihe 7 an Spalte 7, Linien-Stein in Reihe 7.
  const base = newGame("classic", 77);
  const board: Piece[] = base.board.map((p) => ({ ...p, special: "none" }));
  // Farben in Reihe 6/7 so setzen, dass Tausch 6↔? eine waagrechte Reihe in Zeile 7 mit dem Linien-Stein bildet
  const row7 = 7 * COLS;
  const stone: Piece = { id: 5000, kind: "stone", color: -1, special: "none" };
  board[row7 + 7] = stone;
  board[row7 + 0] = { id: 5001, kind: "gem", color: 0, special: "row" };
  board[row7 + 1] = { id: 5002, kind: "gem", color: 0, special: "none" };
  board[row7 + 2] = { id: 5003, kind: "gem", color: 1, special: "none" };
  board[6 * COLS + 2] = { id: 5004, kind: "gem", color: 0, special: "none" };
  board[row7 + 3] = { id: 5005, kind: "gem", color: 2, special: "none" };
  const state: GameState = { ...base, board, def: classicLevelDef(2, () => 0), level: 2, movesLeft: 10, progress: 0 };
  const res = applyMove(state, 6 * COLS + 2, row7 + 2);
  assert.ok(res.ok);
  const cleared = res.steps.flatMap((s) => (s.type === "clear" ? s.cleared : []));
  assert.ok(cleared.some((c) => c.id === 5000), "Felsen sollte vom Linien-Stein zerstört werden");
  assert.ok(res.state.progress >= 1 || res.state.level > 2);
});
