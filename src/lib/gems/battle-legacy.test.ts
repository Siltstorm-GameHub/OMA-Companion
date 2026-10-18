import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isStaleOpenBattle, isUsableBattleState, LEGACY_BATTLE_CUTOFF } from "./battle-legacy";
import { createInteractiveState } from "../battle-engine/interactive";
import { puzzleMonsterRoster } from "./puzzle-monsters";

const after = new Date(LEGACY_BATTLE_CUTOFF.getTime() + 60_000);
const before = new Date(LEGACY_BATTLE_CUTOFF.getTime() - 60_000);

function freshState() {
  const roster = puzzleMonsterRoster(1).slice(0, 3);
  return JSON.parse(JSON.stringify(createInteractiveState(roster, roster, { seed: 1 })));
}

describe("alte offene Kämpfe", () => {
  test("ein heutiger Zustand ist brauchbar, ein alter ohne Brett nicht", () => {
    assert.equal(isUsableBattleState(freshState()), true);
    const old = freshState();
    delete old.boardGrid;
    delete old.boardSpecials;
    assert.equal(isUsableBattleState(old), false);
    assert.equal(isUsableBattleState(null), false);
    assert.equal(isUsableBattleState({ unitsA: [], unitsB: [] }), false);
  });

  test("veraltet: vor dem Stichtag oder unbrauchbarer Zustand — nie Turniere oder beendete Kämpfe", () => {
    const state = freshState();
    const open = { mode: "CAMPAIGN_lvl-11", status: "active", updatedAt: after, stateJson: state };
    assert.equal(isStaleOpenBattle(open), false);
    assert.equal(isStaleOpenBattle({ ...open, updatedAt: before }), true);
    assert.equal(isStaleOpenBattle({ ...open, stateJson: {} }), true);
    assert.equal(isStaleOpenBattle({ ...open, status: "finished", updatedAt: before }), false);
    assert.equal(isStaleOpenBattle({ ...open, mode: "TOURNAMENT_abc", updatedAt: before }), false);
  });
});
