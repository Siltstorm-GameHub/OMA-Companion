import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import { generateDailyChallengeLevel, generateEndlessLevel } from "./endless-levels";
import { currentLevelId, nextLevelId } from "./campaign";
import {
  applyWeeklyModifier,
  guardianAbilityFor,
  isGuardianStage,
  nextGuardianStage,
  pickDefeatTip,
  WEEKLY_MODIFIERS,
  weeklyModifierFor,
} from "./tower-rules";

function unit(cls: BattleUnitDefinition["class"]): BattleUnitDefinition {
  const passive = { name: "p", description: "", trigger: "battleStart" as const, effects: [] };
  const skill = { name: "s", description: "", cost: 50, effects: [] };
  return {
    cardId: cls,
    name: cls,
    class: cls,
    level: 1,
    baseHp: 1000,
    baseAttack: 100,
    baseDefense: 50,
    speed: 60,
    passivePositive: passive,
    passiveNegative: passive,
    activeSkill: skill,
    ultimateSkill: skill,
  };
}

describe("Turmwächter", () => {
  test("jede 10. Endlos-Stufe ab 20", () => {
    assert.equal(isGuardianStage(10), false);
    assert.equal(isGuardianStage(20), true);
    assert.equal(isGuardianStage(25), false);
    assert.equal(nextGuardianStage(13), 20);
    assert.equal(nextGuardianStage(20), 20);
    assert.equal(nextGuardianStage(21), 30);
  });

  test("Wächter-Stufe: Boss mit Wächter-Fähigkeit, andere Stufen unverändert", () => {
    const level = generateEndlessLevel(30);
    assert.equal(level.isGuardian, true);
    assert.equal(level.isBoss, true);
    assert.equal(level.monsters[0].passivePositive.name, guardianAbilityFor(30).passive.name);
    assert.equal(generateEndlessLevel(25).isGuardian, false);
    assert.notEqual(guardianAbilityFor(20).id, guardianAbilityFor(30).id);
  });

  test("Tages-Herausforderung: gleicher Tag gleiche Gegner, anderer Tag andere", () => {
    assert.deepEqual(generateDailyChallengeLevel("2026-10-17"), generateDailyChallengeLevel("2026-10-17"));
    assert.equal(generateDailyChallengeLevel("2026-10-17").monsters.length, 5);
    const names = (d: string) => generateDailyChallengeLevel(d).monsters.map((m) => m.name).join();
    const differs = ["2026-10-18", "2026-10-19", "2026-10-20"].some((d) => names(d) !== names("2026-10-17"));
    assert.ok(differs);
  });
});

describe("Wochen-Modifikator", () => {
  test("jede Woche eine Regel, reihum", () => {
    assert.equal(weeklyModifierFor(0).id, WEEKLY_MODIFIERS[0].id);
    assert.equal(weeklyModifierFor(WEEKLY_MODIFIERS.length).id, WEEKLY_MODIFIERS[0].id);
    assert.equal(weeklyModifierFor(-1).id, WEEKLY_MODIFIERS[WEEKLY_MODIFIERS.length - 1].id);
  });

  test("wirkt nur auf die genannte Klasse und Seite", () => {
    const tankWeek = WEEKLY_MODIFIERS.find((m) => m.id === "tank-woche")!;
    const { teamA, teamB } = applyWeeklyModifier(tankWeek, [unit("TANK"), unit("SUPPORT")], [unit("TANK")]);
    assert.equal(teamA[0].baseHp, 1300);
    assert.equal(teamA[0].baseDefense, 60);
    assert.equal(teamA[1].baseHp, 1000);
    assert.equal(teamB[0].baseHp, 1000);
  });
});

describe("Kampagne: nächste und aktuelle Stufe", () => {
  test("nach Level 12 kommt die erste Endlos-Stufe", () => {
    assert.equal(nextLevelId("lvl-03"), "lvl-04");
    assert.equal(nextLevelId("lvl-12"), "endless-13");
    assert.equal(nextLevelId("endless-41"), "endless-42");
    assert.equal(nextLevelId("quatsch"), null);
  });

  test("aktuelle Stufe: erstes offenes Kapitel-Level, sonst nach der höchsten Endlos-Stufe", () => {
    assert.equal(currentLevelId(new Set()), "lvl-01");
    assert.equal(currentLevelId(new Set(["lvl-01", "lvl-02"])), "lvl-03");
    const chapter = Array.from({ length: 12 }, (_, i) => `lvl-${String(i + 1).padStart(2, "0")}`);
    assert.equal(currentLevelId(new Set(chapter)), "endless-13");
    assert.equal(currentLevelId(new Set([...chapter, "endless-13", "endless-14"])), "endless-15");
  });
});

describe("Tipp nach einer Niederlage", () => {
  const base = { enemyHpPercent: 0.5, guardian: null, modifier: null, lineupClasses: [], seed: 3 };

  test("Wächter-Fähigkeit geht vor", () => {
    assert.match(pickDefeatTip({ ...base, guardian: guardianAbilityFor(20) }), /Turmwächter/);
  });

  test("Wochen-Regel, wenn kaum passende Klasse im Lineup", () => {
    const tankWeek = WEEKLY_MODIFIERS.find((m) => m.id === "tank-woche")!;
    assert.match(pickDefeatTip({ ...base, modifier: tankWeek, lineupClasses: ["SUPPORT", "TANK"] }), /Tanks/);
    assert.doesNotMatch(pickDefeatTip({ ...base, modifier: tankWeek, lineupClasses: ["TANK", "TANK"] }), /Bollwerk/);
  });

  test("ganz knapp verloren", () => {
    assert.match(pickDefeatTip({ ...base, enemyHpPercent: 0.1 }), /knapp/);
  });
});
