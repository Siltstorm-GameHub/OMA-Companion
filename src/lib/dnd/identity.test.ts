import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CLASS_TRAITS, RACE_TRAITS, addFx, raceIdOf, traitChecks, traitFx } from "./identity";
import { DND_RACES } from "./races";
import { DND_CLASSES } from "./classes";
import { NO_FX } from "./skills";
import { buildFighter, getMonster, performAction, startCombat } from "./combat";

const mods = { str: 3, dex: 2, con: 2, int: 0, wis: 0, cha: 0 };
const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

describe("Volk und Klasse", () => {
  test("jede Rasse und Klasse hat ein Merkmal", () => {
    for (const r of DND_RACES) assert.ok(RACE_TRAITS[r.id], r.id);
    for (const c of DND_CLASSES) assert.ok(CLASS_TRAITS[c.id], c.id);
    assert.equal(raceIdOf("Halbling"), "halbling");
    assert.equal(raceIdOf("gibtsnicht"), null);
  });
  test("Kampfwirkungen addieren sich; Zahlen bleiben klein", () => {
    const f = traitFx("Zwerg", "krieger", 5);
    assert.equal(f.ac, 1);
    assert.equal(f.hp, 6 + 10);
    assert.equal(addFx(NO_FX, { hit: 1 }).hit, 1);
    for (const t of [...Object.values(RACE_TRAITS), ...Object.values(CLASS_TRAITS)]) {
      const fx = t.fx?.(20) ?? {};
      for (const [k, v] of Object.entries(fx)) if (k !== "hp") assert.ok((v as number) <= 3, `${t.id}.${k}`);
    }
  });
  test("Proben und XP: Halbling glücklich, Elf weise, Mensch lernt schneller", () => {
    assert.equal(traitChecks("Halbling", "krieger").luck, true);
    assert.equal(traitChecks("Elf", "krieger").checkBonus("wis"), 1);
    assert.equal(traitChecks("Elf", "krieger").checkBonus("str"), 0);
    assert.equal(traitChecks("Mensch", "krieger").xpBonus, 0.05);
    assert.equal(traitChecks(null, null).luck, false);
  });
  test("im Kampf: Schurke trifft kritisch ab 19, Halbork macht mehr Schaden", () => {
    const schurke = buildFighter({ name: "S", classId: "schurke", level: 3, mods, critMin: 20, rerollFumble: false, fx: traitFx("Mensch", "schurke", 3) });
    assert.equal(schurke.critMin, 19);
    const plain = buildFighter({ name: "H", classId: "krieger", level: 3, mods, critMin: 20, rerollFumble: false });
    const ork = buildFighter({ name: "O", classId: "krieger", level: 3, mods, critMin: 20, rerollFumble: false, fx: traitFx("Halbork", "krieger", 3) });
    const hit = (f: typeof plain) => { const m = getMonster("wegelagerer")!; return m.hp - performAction(startCombat(m, f), "attack", seq(0.99, 0.5)).state.monsterHp; };
    assert.ok(hit(ork) >= hit(plain) + 2);
    assert.ok(ork.maxHp > plain.maxHp);
  });
});
