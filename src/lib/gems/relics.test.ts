import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import { applyRelics, guardianStageForRelic, RELIC_SLOTS, RELICS, relicForGuardianStage } from "./relics";

function unit(cls: BattleUnitDefinition["class"]): BattleUnitDefinition {
  const passive = { name: "p", description: "", trigger: "battleStart" as const, effects: [] };
  const skill = { name: "s", description: "", cost: 50, effects: [] };
  return { cardId: cls, name: cls, class: cls, level: 1, baseHp: 1000, baseAttack: 100, baseDefense: 100, speed: 100, passivePositive: passive, passiveNegative: passive, activeSkill: skill, ultimateSkill: skill };
}

describe("Relikte", () => {
  test("ein Relikt je Turmwächter von Stufe 20 bis 90, danach keine mehr", () => {
    assert.equal(relicForGuardianStage(20)?.id, RELICS[0].id);
    assert.equal(relicForGuardianStage(90)?.id, RELICS[7].id);
    assert.equal(relicForGuardianStage(100), null);
    assert.equal(relicForGuardianStage(25), null);
    assert.equal(relicForGuardianStage(10), null);
    assert.equal(guardianStageForRelic(RELICS[3].id), 50);
  });

  test("wirken auf die genannte Seite und Klasse, Start-Rage addiert sich", () => {
    const { teamA, teamB, startRage } = applyRelics(
      ["bollwerk-siegel", "ruestungsbrecher"],
      [unit("TANK"), unit("SUPPORT")],
      [unit("TANK")]
    );
    assert.equal(teamA[0].baseHp, 1120);
    assert.equal(teamA[1].baseHp, 1000);
    assert.equal(teamB[0].baseDefense, 88);
    assert.equal(startRage, 0);
    assert.equal(applyRelics(["kampfschrei"], [unit("TANK")], []).startRage, 25);
  });

  test("höchstens so viele wie Plätze, unbekannte werden ignoriert", () => {
    const three = applyRelics(["schaerfe", "klingenoel", "zaehigkeit"], [unit("DAMAGE_DEALER")], []);
    assert.equal(RELIC_SLOTS, 2);
    assert.equal(three.teamA[0].baseHp, 1000, "drittes Relikt wirkt nicht");
    assert.equal(applyRelics(["gibt-es-nicht"], [unit("TANK")], []).teamA[0].baseHp, 1000);
  });
});
