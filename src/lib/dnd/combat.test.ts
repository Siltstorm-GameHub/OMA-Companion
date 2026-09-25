import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AP_PER_ROUND, MONSTERS, buildFighter, encountersFor, getMonster, performAction, rewardFor, startCombat, type CombatState } from "./combat";

const mods = { str: 3, dex: 2, con: 2, int: 0, wis: 0, cha: 0 };
const hero = (classId = "krieger", extra: Partial<Parameters<typeof buildFighter>[0]> = {}) => buildFighter({ name: "T", classId, level: 3, mods, critMin: 20, rerollFumble: false, ...extra });
/** Zufall, der die Zahlen der Reihe nach liefert (Werte 0..1) */
const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll20 = (n: number) => (n - 0.5) / 20;

describe("combat", () => {
  test("Startwerte", () => {
    const s = startCombat(getMonster("ratte")!, hero());
    assert.equal(s.hp, s.fighter.maxHp);
    assert.equal(s.ap, AP_PER_ROUND);
    assert.equal(s.status, "active");
  });

  test("Treffer verursacht Schaden und kostet 1 AP", () => {
    const s = startCombat(getMonster("ratte")!, hero());
    const r = performAction(s, "attack", seq(roll20(15), 0.5)).state;
    assert.equal(r.ap, 2);
    assert.ok(r.monsterHp < s.monsterHp);
  });

  test("natürliche 1 verfehlt immer, Adlerauge trifft bei 19", () => {
    const m = getMonster("golem")!;
    const s = startCombat(m, hero());
    assert.equal(performAction(s, "attack", seq(roll20(1))).state.monsterHp, m.hp);
    const eagle = startCombat(m, hero("krieger", { critMin: 19 }));
    assert.ok(performAction(eagle, "attack", seq(roll20(19), 0.9, 0.9)).state.monsterHp < m.hp);
  });

  test("Glücksrabe würfelt eine 1 neu", () => {
    const m = getMonster("ratte")!;
    const s = startCombat(m, hero("krieger", { rerollFumble: true }));
    assert.ok(performAction(s, "attack", seq(roll20(1), roll20(18), 0.5)).state.monsterHp < m.hp);
  });

  test("nach 3 AP greift das Monster an, neue Runde", () => {
    let s = startCombat(getMonster("ratte")!, hero());
    for (let i = 0; i < 3; i++) s = performAction(s, "attack", seq(roll20(1), roll20(1))).state;
    assert.equal(s.round, 2);
    assert.equal(s.ap, AP_PER_ROUND);
    assert.ok(s.log.some((l) => l.includes("greift an")));
  });

  test("Runde beenden gibt Rest-AP ab", () => {
    const s = performAction(startCombat(getMonster("ratte")!, hero()), "end", seq(roll20(1))).state;
    assert.equal(s.round, 2);
  });

  test("Fähigkeit: Abklingzeit und Fehler ohne AP", () => {
    let s = startCombat(getMonster("golem")!, hero("magier"));
    s = performAction(s, "ability", seq(0.5, 0.5)).state;
    assert.equal(s.ap, 1);
    assert.equal(s.cooldowns.feuerball, 2);
    assert.ok(performAction(s, "ability").error);
  });

  test("Kleriker heilt, aber nicht über das Maximum", () => {
    let s: CombatState = startCombat(getMonster("ratte")!, hero("kleriker"));
    s = { ...s, hp: s.fighter.maxHp - 3 };
    s = performAction(s, "ability", seq(0.9, 0.9)).state;
    assert.equal(s.hp, s.fighter.maxHp);
  });

  test("Sieg, Niederlage, Flucht beenden den Kampf", () => {
    const m = getMonster("ratte")!;
    let s = { ...startCombat(m, hero()), monsterHp: 1 };
    assert.equal(performAction(s, "attack", seq(roll20(20), 0.5)).state.status, "won");
    s = { ...startCombat(getMonster("drache")!, hero()), hp: 1 };
    assert.equal(performAction(s, "end", seq(roll20(20), 0.9, 0.9)).state.status, "lost");
    s = startCombat(m, hero());
    assert.equal(performAction(s, "flee", seq(roll20(19))).state.status, "fled");
    assert.ok(performAction({ ...s, status: "won" }, "attack").error);
  });

  test("Begegnungen passen zu Stufe und Gelände", () => {
    assert.ok(encountersFor(1, "temperate").every((e) => e.level <= 4));
    assert.ok(encountersFor(5, "cold").some((e) => e.id === "frostwolf"));
    assert.ok(!encountersFor(5, "temperate").some((e) => e.id === "frostwolf"));
    assert.equal(new Set(MONSTERS.map((m) => m.id)).size, MONSTERS.length);
  });

  test("Belohnung sinkt bei zu schwachen Gegnern, mindestens 25 %", () => {
    const m = getMonster("goblin")!;
    assert.equal(rewardFor(m, 3, () => 0.99).xp, m.xp);
    assert.equal(rewardFor(m, 20, () => 0.99).xp, Math.round(m.xp * 0.25));
  });
});
