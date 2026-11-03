import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BlocksEngine, Input, WIDTH, HEIGHT, PIECES, SHAPES, attackFor, MAX_ATTACK_PER_CLEAR, encodeVisibleBoard, isValidBoardString, DEFAULT_HANDLING,
} from "./engine";
import { verifyReplay, encodeInput } from "./replay";

/** Simuliert einen Spieler, der zufällig Eingaben gibt, und zeichnet sie auf. */
function playRandom(seed: number, maxFrames = 20000) {
  const engine = new BlocksEngine(seed, "marathon", DEFAULT_HANDLING);
  const inputs: number[] = [];
  let r = seed >>> 0;
  const rand = () => ((r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  while (!engine.gameOver && engine.stats.frame < maxFrames) {
    if (rand() < 0.25) {
      const codes = [Input.LeftDown, Input.LeftUp, Input.RightDown, Input.RightUp, Input.RotateCW, Input.RotateCCW, Input.Rotate180, Input.HardDrop, Input.Hold, Input.SoftDown, Input.SoftUp];
      const code = codes[Math.floor(rand() * codes.length)];
      inputs.push(encodeInput(engine.stats.frame, code));
      engine.applyInput(code);
      if (engine.gameOver) break;
    }
    engine.tick();
  }
  if (!engine.gameOver) {
    inputs.push(encodeInput(engine.stats.frame, Input.Forfeit));
    engine.applyInput(Input.Forfeit);
  }
  return { engine, inputs };
}

test("Formen haben je 4 Zellen in allen Ausrichtungen", () => {
  for (const t of PIECES) for (const rot of SHAPES[t]) assert.equal(rot.length, 4);
});

test("7er-Beutel: jedes Teil genau einmal je 7", () => {
  const e = new BlocksEngine(42);
  const seen = [e.active!.type, ...e.queue.slice(0, 6)];
  assert.equal(new Set(seen).size, 7);
});

test("Hard Drop legt Teil ab und vergibt 2 Punkte je Zeile", () => {
  const e = new BlocksEngine(1);
  const startY = e.active!.y;
  const ghost = e.ghostY();
  e.applyInput(Input.HardDrop);
  assert.equal(e.stats.pieces, 1);
  assert.equal(e.stats.score, (ghost - startY) * 2);
  assert.ok(e.board.some((c) => c !== 0));
});

test("Zeile wird geleert", () => {
  const e = new BlocksEngine(7);
  // Unterste Zeile bis auf Spalten 0-3 füllen, dann ein I waagrecht links einwerfen.
  for (let x = 4; x < WIDTH; x++) e.board[(HEIGHT - 1) * WIDTH + x] = 8;
  e.active = { type: "I", rot: 0, x: 0, y: 20 };
  e.applyInput(Input.HardDrop);
  assert.equal(e.stats.lines, 1);
  assert.ok(e.board.every((c) => c === 0) === false || e.stats.perfectClears === 1);
});

test("Replay ergibt denselben Punktestand", () => {
  for (const seed of [1, 99, 123456, 987654321]) {
    const { engine, inputs } = playRandom(seed);
    const res = verifyReplay(seed, DEFAULT_HANDLING, inputs, engine.stats.frame);
    assert.ok(res.ok, res.error);
    assert.deepEqual(res.stats, engine.stats);
  }
});

test("Manipulierte Replays werden abgelehnt", () => {
  const { engine, inputs } = playRandom(5);
  assert.equal(verifyReplay(5, DEFAULT_HANDLING, inputs, engine.stats.frame + 10).ok, false);
  assert.equal(verifyReplay(5, DEFAULT_HANDLING, inputs.slice(0, -1), engine.stats.frame).ok, false);
  assert.equal(verifyReplay(5, DEFAULT_HANDLING, [...inputs].reverse(), engine.stats.frame).ok, false);
});

test("Angriffstabelle", () => {
  assert.equal(attackFor({ lines: 4, spin: "none", combo: 0, b2b: false, perfectClear: false }), 4);
  assert.equal(attackFor({ lines: 2, spin: "full", combo: 0, b2b: true, perfectClear: false }), 5);
  assert.equal(attackFor({ lines: 1, spin: "none", combo: 0, b2b: false, perfectClear: false }), 0);
  assert.ok(attackFor({ lines: 3, spin: "full", combo: 99, b2b: true, perfectClear: true }) <= MAX_ATTACK_PER_CLEAR);
});

test("Garbage wird nach Teil ohne Clear eingefügt und eigener Angriff verrechnet", () => {
  const e = new BlocksEngine(3, "versus");
  e.queueGarbage(3, 4);
  e.applyInput(Input.HardDrop);
  const bottom = Array.from(e.board.slice((HEIGHT - 1) * WIDTH));
  assert.equal(bottom[4], 0);
  assert.equal(bottom.filter((c) => c === 8).length, 9);
  assert.equal(e.pendingGarbageTotal, 0);
});

test("Board-String für Gegner-Vorschau", () => {
  const e = new BlocksEngine(11);
  const s = encodeVisibleBoard(e);
  assert.ok(isValidBoardString(s));
});
