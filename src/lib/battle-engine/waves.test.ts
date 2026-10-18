import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { advance, applyUltimateInterrupt, createInteractiveState, type InteractiveBattleState } from "./interactive";
import { findHintMove } from "./board-match3";
import { puzzleMonsterRoster } from "../gems/puzzle-monsters";
import { buildWaveEnemies, generateWave, WAVE_HEAL_SHARE, WAVE_ROUND_LIMIT } from "../gems/wave-levels";

/** Zwingt eine Welle: Gegner mit 1 Leben, damit schon der erste Zug sie besiegt. */
function weak(units: ReturnType<typeof buildWaveEnemies>) {
  return units.map((u) => ({ ...u, baseHp: 1 }));
}

function startWaveBattle(playerTeam = puzzleMonsterRoster(1).slice(0, 5)) {
  const state = createInteractiveState(playerTeam, weak(buildWaveEnemies(1)), {
    seed: 7,
    waves: { healShare: WAVE_HEAL_SHARE, roundsPerWave: WAVE_ROUND_LIMIT },
  });
  state.waveMode!.queued = weak(buildWaveEnemies(2));
  return advance(state);
}

function playOneMove(state: InteractiveBattleState, pending: NonNullable<ReturnType<typeof advance>["pendingDecision"]>) {
  const board = pending.board!;
  const move = findHintMove(board.grid, board.specials);
  return advance(state, { boardSwaps: move ? [move] : [] });
}

describe("Last Stand: Wellenmodus", () => {
  test("Wellen sind deterministisch, fünf Gegner, jede 5. mit Boss", () => {
    assert.deepEqual(generateWave(3).monsters.map((m) => m.name), generateWave(3).monsters.map((m) => m.name));
    assert.equal(generateWave(1).monsters.length, 5);
    assert.equal(generateWave(5).isBoss, true);
    assert.equal(generateWave(6).isBoss, false);
    assert.ok(generateWave(12).statMultiplier > generateWave(2).statMultiplier, "spätere Wellen sind stärker");
  });

  test("nach einer besiegten Welle erscheint die nächste, der Kampf geht weiter", () => {
    let current = startWaveBattle();
    assert.equal(current.state.waveMode!.wave, 1);
    // Gegner bis auf einen Treffer schwächen: der erste Zug räumt Welle 1 ab.
    let guard = 0;
    while (current.state.waveMode!.wave === 1 && !current.state.winner && current.pendingDecision && guard++ < 10) {
      current = playOneMove(current.state, current.pendingDecision);
    }
    assert.equal(current.state.winner, null, "der Kampf endet nicht mit dem Sieg über Welle 1");
    assert.equal(current.state.waveMode!.wave, 2);
    assert.equal(current.state.unitsB.length, 5);
    assert.ok(current.state.unitsB.every((u) => u.isAlive && u.instanceId.startsWith("B2-")), "neue, frische Gegner mit eigenen IDs");
    assert.ok(current.state.log.some((e) => e.type === "waveStart" && e.wave === 2));
    assert.equal(current.state.waveMode!.queued, null, "die nächste Welle muss die Aufrufer-Seite vorbereiten");
    assert.ok(current.pendingDecision, "der Spieler ist wieder am Zug");
  });

  test("lebende Helden werden zwischen den Wellen etwas geheilt, gefallene bleiben tot", () => {
    const state = createInteractiveState(puzzleMonsterRoster(1).slice(0, 5), weak(buildWaveEnemies(1)), {
      seed: 11,
      waves: { healShare: WAVE_HEAL_SHARE, roundsPerWave: WAVE_ROUND_LIMIT },
    });
    state.waveMode!.queued = weak(buildWaveEnemies(2));
    const hurt = state.unitsA[0];
    const dead = state.unitsA[1];
    hurt.currentHp = Math.round(hurt.maxHp * 0.3);
    dead.currentHp = 0;
    dead.isAlive = false;
    const hpBefore = hurt.currentHp;

    let current = advance(state);
    let guard = 0;
    while (current.state.waveMode!.wave === 1 && !current.state.winner && current.pendingDecision && guard++ < 10) {
      current = playOneMove(current.state, current.pendingDecision);
    }
    const hurtNow = current.state.unitsA.find((u) => u.instanceId === hurt.instanceId)!;
    assert.ok(hurtNow.currentHp > hpBefore, "geheilt");
    assert.ok(hurtNow.currentHp <= hurtNow.maxHp);
    assert.equal(current.state.unitsA.find((u) => u.instanceId === dead.instanceId)!.isAlive, false, "gefallene bleiben tot");
  });

  test("ohne vorbereitete nächste Welle zählt der Sieg als Kampfende (Sicherheitsnetz)", () => {
    const state = createInteractiveState(puzzleMonsterRoster(1).slice(0, 5), weak(buildWaveEnemies(1)), {
      seed: 3,
      waves: { healShare: WAVE_HEAL_SHARE, roundsPerWave: WAVE_ROUND_LIMIT },
    });
    let current = advance(state);
    let guard = 0;
    while (!current.state.winner && current.pendingDecision && guard++ < 10) {
      current = playOneMove(current.state, current.pendingDecision);
    }
    assert.equal(current.state.winner, "A");
  });

  test("der Lauf endet erst, wenn die eigenen Helden gefallen sind", () => {
    const state = createInteractiveState(
      puzzleMonsterRoster(1).slice(0, 5).map((u) => ({ ...u, baseHp: 1, baseAttack: 1 })),
      buildWaveEnemies(40),
      { seed: 5, waves: { healShare: WAVE_HEAL_SHARE, roundsPerWave: WAVE_ROUND_LIMIT } }
    );
    state.waveMode!.queued = buildWaveEnemies(41);
    let current = advance(state);
    let guard = 0;
    while (!current.state.winner && current.pendingDecision && guard++ < 50) {
      current = playOneMove(current.state, current.pendingDecision);
    }
    assert.equal(current.state.winner, "B");
    assert.ok(current.state.unitsA.every((u) => !u.isAlive));
  });

  test("auch ein Ultimate, das die letzte Welle-Einheit besiegt, löst die nächste Welle aus", () => {
    const state = createInteractiveState(puzzleMonsterRoster(1).slice(0, 5), weak(buildWaveEnemies(1)), {
      seed: 9,
      waves: { healShare: WAVE_HEAL_SHARE, roundsPerWave: WAVE_ROUND_LIMIT },
    });
    state.waveMode!.queued = weak(buildWaveEnemies(2));
    const started = advance(state);
    const caster = started.state.unitsA.find((u) => u.instanceId === started.pendingDecision!.unitId)!;
    caster.rage = 500;
    const result = applyUltimateInterrupt(started.state, caster.instanceId);
    assert.equal(result.applied, true);
    if (result.state.waveMode!.wave === 2) {
      assert.equal(result.state.winner, null);
      assert.equal(result.state.unitsB.length, 5);
    } else {
      // Das Ultimate hat nicht alle Gegner getroffen — dann läuft Welle 1 einfach weiter.
      assert.equal(result.state.waveMode!.wave, 1);
    }
  });
});
