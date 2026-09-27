import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { GOAL_STEP_TYPES, GROUP_ORDER, isObjectiveType, metaOf, OBJECTIVE_META } from "./quest-objectives";

describe("Ziel-Arten (Quest-Log/Editor)", () => {
  test("jede Ziel-Art hat ein Symbol, einen Namen und eine Gruppe", () => {
    for (const [type, meta] of Object.entries(OBJECTIVE_META)) {
      assert.ok(meta.icon, type);
      assert.ok(meta.label, type);
      assert.ok(GROUP_ORDER.includes(meta.group), type);
    }
  });

  test("isObjectiveType/metaOf: bekannte Arten erkannt, unbekannte fallen sanft zurück", () => {
    assert.ok(isObjectiveType("MONSTER_SLAIN"));
    assert.ok(!isObjectiveType("QUATSCH"));
    assert.equal(metaOf("MONSTER_SLAIN").icon, "⚔️");
    assert.equal(metaOf("QUATSCH").label, "QUATSCH");
  });

  test("Editor-Ziel-Schritte sind eine Teilmenge aller Ziel-Arten", () => {
    assert.ok(GOAL_STEP_TYPES.length >= 2);
    for (const g of GOAL_STEP_TYPES) assert.ok(isObjectiveType(g.type));
  });
});
