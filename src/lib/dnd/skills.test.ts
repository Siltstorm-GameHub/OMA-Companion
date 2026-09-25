import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BRANCHES, canUnlock, sanitizeSkills, skillEffects, skillPointsLeft, treeOf } from "./skills";
import { DND_CLASSES } from "./classes";
import { abilitiesOf, buildFighter, getMonster, performAction, startCombat } from "./combat";

const mods = { str: 3, dex: 2, con: 2, int: 0, wis: 0, cha: 0 };
const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

describe("skills", () => {
  test("jede Klasse hat 3 Äste mit je 4 Stufen", () => {
    for (const c of DND_CLASSES) {
      const tree = treeOf(c.id);
      assert.equal(tree.length, 12, c.id);
      for (const b of BRANCHES) assert.deepEqual(tree.filter((n) => n.branch === b).map((n) => n.tier), [1, 2, 3, 4]);
    }
  });

  test("Punkte: ein Punkt je Stufe ab 2, Knoten kosten 1/1/2/2", () => {
    assert.equal(skillPointsLeft("krieger", 1, []), 0);
    assert.equal(skillPointsLeft("krieger", 5, []), 4);
    assert.equal(skillPointsLeft("krieger", 5, ["offense1", "offense2"]), 2);
    assert.equal(skillPointsLeft("krieger", 6, ["offense1", "offense2", "offense3"]), 1);
  });

  test("Freischalten prüft Voraussetzung, Punkte und Doppelte", () => {
    assert.equal(canUnlock("krieger", 5, [], "offense2").ok, false);
    assert.equal(canUnlock("krieger", 1, [], "offense1").ok, false);
    assert.equal(canUnlock("krieger", 5, [], "offense1").ok, true);
    assert.equal(canUnlock("krieger", 5, ["offense1"], "offense1").ok, false);
    assert.equal(canUnlock("krieger", 3, ["offense1", "offense2"], "offense3").ok, false); // kostet 2, nur 0 übrig
    assert.equal(canUnlock("krieger", 2, [], "gibtsnicht").ok, false);
  });

  test("Wirkungen summieren sich, Müll wird ignoriert", () => {
    const fx = skillEffects("magier", ["offense1", "offense2", "defense1", "art3", "quatsch"]);
    assert.equal(fx.hit, 1);
    assert.equal(fx.dmg, 2);
    assert.equal(fx.hp, 8);
    assert.equal(fx.second, true);
    assert.deepEqual(sanitizeSkills("magier", ["offense2", "offense2", "x", 5]), ["offense2"]);
  });

  test("Talente wirken im Kampf: mehr LP/RK, zweite Fähigkeit, Regeneration", () => {
    const base = buildFighter({ name: "T", classId: "krieger", level: 3, mods, critMin: 20, rerollFumble: false });
    const skilled = buildFighter({ name: "T", classId: "krieger", level: 3, mods, critMin: 20, rerollFumble: false, fx: skillEffects("krieger", ["defense1", "defense2", "defense3", "defense4", "offense4", "art3", "art1"]) });
    assert.equal(skilled.maxHp, base.maxHp + 20);
    assert.equal(skilled.ac, base.ac + 1);
    assert.equal(skilled.critMin, 19);
    assert.equal(abilitiesOf(base).second, null);
    assert.ok(abilitiesOf(skilled).second);

    // Zweite Fähigkeit nutzbar, hat eigene Abklingzeit; Klassenfähigkeit bleibt frei
    let s = startCombat(getMonster("golem")!, skilled);
    s = performAction(s, "ability2", seq(0.99, 0.5, 0.5, 0.5)).state;
    assert.ok(s.log.some((l) => l.includes("Wirbelschlag")));
    assert.equal(s.round, 2); // 3 AP verbraucht: Monster war dran, Abklingzeit 1 → 0
    assert.equal(s.cooldowns.kraftschlag, undefined);
    assert.ok(performAction(base && startCombat(getMonster("golem")!, base), "ability2").error);

    // Regeneration zu Rundenbeginn
    const regen = { ...startCombat(getMonster("ratte")!, skilled), hp: 10 };
    const after = performAction(regen, "end", seq(0.01)).state;
    assert.ok(after.log.some((l) => l.includes("erholst")));
  });

  test("Abklingzeit-Talent verkürzt auf 1 Runde", () => {
    const f = buildFighter({ name: "T", classId: "magier", level: 3, mods, critMin: 20, rerollFumble: false, fx: skillEffects("magier", ["art1"]) });
    const s = performAction(startCombat(getMonster("golem")!, f), "ability", seq(0.5, 0.5)).state;
    assert.equal(s.cooldowns.feuerball, 1);
  });
});
