import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { advance, applyUltimateInterrupt, createInteractiveState } from "./interactive";
import { puzzleMonsterRoster } from "../gems/puzzle-monsters";

function newBattle() {
  const team = puzzleMonsterRoster(1).slice(0, 3);
  return advance(createInteractiveState(team, puzzleMonsterRoster(1).slice(0, 3), { seed: 42 }));
}

describe("OMA Gems: Kampf-Stepper", () => {
  test("pausiert beim ersten Spieler-Zug mit Brett", () => {
    const { state, pendingDecision } = newBattle();
    assert.ok(pendingDecision, "Spieler-Zug erwartet");
    assert.equal(pendingDecision.teamId, "A");
    assert.ok(pendingDecision.board, "Brett vorhanden");
    assert.equal(state.awaitingUnitId, pendingDecision.unitId);
  });

  test("Polling ohne Zug verändert nichts", () => {
    const { state, pendingDecision } = newBattle();
    const again = advance(state);
    assert.equal(again.pendingDecision?.unitId, pendingDecision?.unitId);
  });

  test("ein Brett-Zug lässt den Kampf bis zum nächsten Spieler-Zug weiterlaufen", () => {
    const { state, pendingDecision } = newBattle();
    const logBefore = state.log.length;
    const next = advance(state, { boardSwaps: [] });
    assert.ok(next.state.log.length > logBefore);
    assert.ok(next.state.winner || next.pendingDecision);
    if (next.pendingDecision) assert.ok(next.state.round > 1 || next.pendingDecision.unitId !== pendingDecision?.unitId);
  });

  test("Ultimate der wartenden Einheit verbraucht ihren Brett-Zug nicht", () => {
    const { state, pendingDecision } = newBattle();
    const caster = state.unitsA.find((u) => u.instanceId === pendingDecision!.unitId)!;
    caster.rage = 200;
    const result = applyUltimateInterrupt(state, caster.instanceId);
    assert.equal(result.applied, true);
    assert.equal(result.pendingDecision?.unitId, caster.instanceId, "Zug bleibt offen");
    assert.ok(result.pendingDecision?.board, "Brett bleibt offen");
  });

  test("Monster können kein Ultimate per Klick auslösen", () => {
    const { state } = newBattle();
    const monster = state.unitsB[0];
    monster.rage = 200;
    assert.equal(applyUltimateInterrupt(state, monster.instanceId).applied, false);
  });
});
