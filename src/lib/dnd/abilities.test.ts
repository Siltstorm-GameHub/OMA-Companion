import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildFighter, getMonster, MONSTERS, startCombat, performAction } from "./combat";
import { ABILITIES, abilitiesOfClass } from "./abilities";
import { startGroupCombat, performGroupAction, boonSum } from "./group-combat";
import { skillEffects } from "./skills";

const mods = { str: 3, dex: 2, con: 2, int: 3, wis: 3, cha: 2 };
const fighter = (classId: string, skills: string[] = []) => buildFighter({ name: classId, classId, level: 3, mods, critMin: 20, rerollFumble: false, fx: skillEffects(classId, skills) });
const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const ART = ["art1", "art2", "art3", "art4"];

describe("Klassenfähigkeiten: Elemente und Zustände", () => {
  test("jede Klasse hat vier Fähigkeiten, Kosten passen zum Entwurf", () => {
    assert.equal(ABILITIES.length, 28);
    for (const c of ["krieger", "paladin", "magier", "kleriker", "schurke", "waldlaeufer", "barde"]) {
      const l = abilitiesOfClass(c);
      assert.deepEqual(l.map((a) => a.slot), [1, 2, 3, 4]);
      assert.ok(l.every((a) => a.ap >= 1 && a.ap <= 3 && a.cd >= 2 && a.cd <= 3));
    }
  });

  test("Schwäche ×1,5, Resistenz ×0,5", () => {
    const weak = (m: string) => { const mon = getMonster(m)!; return mon.hp - performAction(startCombat(mon, fighter("magier")), "ability", seq(0.5, 0.5, 0.5)).state.monsterHp; };
    // Feuerball auf Ratte (schwach gegen Feuer) vs. Skorpion (resistent gegen Feuer): gleiche Würfel
    assert.ok(getMonster("ratte")!.weak!.includes("fire"));
    const s1 = performAction(startCombat(getMonster("ratte")!, fighter("magier")), "ability", seq(0.5, 0.5, 0.5)).state;
    const s2 = performAction(startCombat(getMonster("skorpion")!, fighter("magier")), "ability", seq(0.5, 0.5, 0.5)).state;
    assert.ok(getMonster("ratte")!.hp - s1.monsterHp > getMonster("skorpion")!.hp - s2.monsterHp);
    assert.ok(weak("ratte") > 0);
    assert.ok(s1.log.some((l) => l.includes("Schwäche")));
    assert.ok(s2.log.some((l) => l.includes("widersteht")));
  });

  test("Brennen tickt in der Monsterphase, Zustand läuft nach 2 Runden aus", () => {
    let s = startCombat(getMonster("golem")!, fighter("magier"));
    s = performAction(s, "ability", seq(0.5, 0.5, 0.01)).state; // Feuerball (2 AP) → Brennen
    assert.equal(s.mStatus?.burn, 2);
    s = performAction(s, "end", seq(0.01)).state;
    assert.ok(s.log.some((l) => l.includes("Brennen: Steingolem erleidet 3")));
    assert.equal(s.mStatus?.burn, 1);
  });

  test("Betäubt lässt das Monster aussetzen, Bosse sind immun", () => {
    const f = fighter("magier", ART);
    let s = startCombat(getMonster("golem")!, f);
    s = performAction(s, "ability3", seq(0.5)).state; // Blitzschlag 3 AP
    assert.equal(s.round, 2);
    assert.ok(s.log.some((l) => l.includes("betäubt und setzt aus")));
    assert.equal(s.hp, f.maxHp);
    const boss = performGroupAction(startGroupCombat(getMonster("hydra")!, [{ cardId: "a", name: "a", fighter: f }], 0), "a", "ability3", undefined, 0, seq(0.5));
    assert.ok(boss.state.log.some((l) => l.includes("immun")));
    assert.equal(boss.state.mStatus?.stun, undefined);
  });

  test("Schild-LP fangen Schaden vor den Lebenspunkten auf", () => {
    const mage = fighter("magier", ART);
    let s = startCombat(getMonster("golem")!, mage);
    s = performAction(s, "ability4", seq(0.5)).state; // Manaschild
    assert.equal(s.shield, 8 + mage.level);
    const before = s.shield!;
    s = performAction(s, "end", seq(0.99, 0.5, 0.5)).state; // Krit des Golems
    assert.ok(s.shield! < before);
  });

  test("Barde: Spottlied gibt der Gruppe Treffer-Bonus, Meisterschaft Regeneration", () => {
    const g = startGroupCombat(getMonster("golem")!, [{ cardId: "b", name: "b", fighter: fighter("barde", ART) }, { cardId: "k", name: "k", fighter: fighter("krieger") }], 0);
    const r = performGroupAction(g, "b", "ability", undefined, 0, seq(0.5)).state;
    assert.equal(boonSum(r.heroes[1], "hit"), 2);
    assert.equal(boonSum(r.heroes[1], "regen"), 2);
  });

  test("Kleriker-Massenheilung belebt Gefallene mit halben LP", () => {
    const g = startGroupCombat(getMonster("golem")!, [{ cardId: "c", name: "c", fighter: fighter("kleriker", ART) }, { cardId: "k", name: "k", fighter: fighter("krieger") }], 0);
    g.heroes[1].hp = 0;
    const r = performGroupAction(g, "c", "ability4", undefined, 0, seq(0.5)).state;
    assert.equal(r.heroes[1].hp, Math.ceil(r.heroes[1].fighter.maxHp / 2));
  });

  test("alle Monster haben nur gültige Elemente", () => {
    for (const m of MONSTERS) for (const e of [...(m.weak ?? []), ...(m.resist ?? [])]) assert.ok(e.length > 0, m.id);
  });
});
