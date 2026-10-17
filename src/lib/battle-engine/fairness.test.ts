import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { advance, applyUltimateInterrupt, createInteractiveState, playerFirstInOpeningRound } from "./interactive";
import { rollDamage } from "./damage";
import { MIN_DAMAGE_ATTACK_SHARE, PLAYER_ULTIMATE_MAX_HP_SHARE } from "./constants";
import { puzzleMonsterRoster } from "../gems/puzzle-monsters";

describe("OMA Gems: faire Kämpfe", () => {
  test("Runde 1: der schnellste eigene Held zieht zuerst, sonst bleibt die Reihenfolge", () => {
    const order = [
      { id: "b1", teamId: "B" as const },
      { id: "a1", teamId: "A" as const },
      { id: "b2", teamId: "B" as const },
      { id: "a2", teamId: "A" as const },
    ];
    assert.deepEqual(playerFirstInOpeningRound(order, 1).map((u) => u.id), ["a1", "b1", "b2", "a2"]);
    assert.deepEqual(playerFirstInOpeningRound(order, 2).map((u) => u.id), ["b1", "a1", "b2", "a2"]);
  });

  test("kein Gegner handelt vor dem ersten Spieler-Zug, auch wenn er schneller ist", () => {
    const fastEnemies = puzzleMonsterRoster(1).slice(0, 3).map((m) => ({ ...m, speed: 999 }));
    const { state, pendingDecision } = advance(createInteractiveState(puzzleMonsterRoster(1).slice(0, 3), fastEnemies, { seed: 7 }));
    assert.equal(pendingDecision?.teamId, "A");
    assert.ok(!state.log.some((e) => e.type === "action"), "vor dem ersten Zug keine Aktion");
  });

  test("Mindestschaden: hohe Verteidigung drückt einen Treffer nicht auf 1", () => {
    const alwaysHigh = Object.assign(() => 0.99, { getState: () => 0 });
    const roll = rollDamage(200, 10_000, alwaysHigh);
    assert.equal(roll.amount, Math.round(200 * MIN_DAMAGE_ATTACK_SHARE));
  });

  test("Spieler-Ultimate trifft zusätzlich mit einem Anteil der maximalen Gegner-Leben", () => {
    const { state } = advance(createInteractiveState(puzzleMonsterRoster(1).slice(0, 1), puzzleMonsterRoster(1).slice(0, 1), { seed: 3 }));
    const hero = state.unitsA[0];
    const enemy = state.unitsB[0];
    enemy.maxHp = 100_000;
    enemy.currentHp = 100_000;
    hero.rage = 100;
    applyUltimateInterrupt(state, hero.instanceId);
    const dealt = 100_000 - enemy.currentHp;
    assert.ok(dealt >= 100_000 * PLAYER_ULTIMATE_MAX_HP_SHARE, `Ultimate-Schaden ${dealt}`);
  });
});
