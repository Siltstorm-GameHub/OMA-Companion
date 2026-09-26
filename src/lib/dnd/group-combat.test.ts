import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildFighter, getMonster, RAID_BOSSES, MONSTERS, encountersFor } from "./combat";
import { boonSum, alive, applyTimeouts, groupRewards, performGroupAction, scaleMonster, startGroupCombat, TURN_MS } from "./group-combat";
import { skillEffects } from "./skills";
import { MAX_PARTY, MAX_RAID, maxPartySize } from "./party";

const mods = { str: 3, dex: 2, con: 2, int: 2, wis: 3, cha: 2 };
const fighter = (classId: string, skills: string[] = []) => buildFighter({ name: classId, classId, level: 3, mods, critMin: 20, rerollFumble: false, fx: skillEffects(classId, skills) });
const member = (id: string, classId: string, skills: string[] = []) => ({ cardId: id, name: id, fighter: fighter(classId, skills) });
const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll20 = (n: number) => (n - 0.5) / 20;
const T0 = 1_000_000;

const start = (monster = "golem", ms = [member("a", "krieger"), member("b", "kleriker"), member("c", "paladin")]) => startGroupCombat(getMonster(monster)!, ms, T0);

describe("Gruppenkampf", () => {
  test("Monster skaliert mit der Gruppengröße", () => {
    const m = getMonster("golem")!;
    assert.equal(scaleMonster(m, 1).hp, m.hp);
    assert.ok(scaleMonster(m, 4).hp > scaleMonster(m, 2).hp);
    assert.equal(scaleMonster(m, 1).attacks, 1);
    assert.equal(scaleMonster(m, 3).attacks, 2);
    assert.equal(scaleMonster(m, 5).attacks, 3);
  });

  test("nur wer dran ist darf handeln; Zug endet nach 3 AP und geht weiter", () => {
    let s = start();
    assert.ok(performGroupAction(s, "b", "attack", undefined, T0).error);
    for (let i = 0; i < 3; i++) s = performGroupAction(s, "a", "attack", undefined, T0, seq(roll20(1))).state;
    assert.equal(s.heroes[s.turn].cardId, "b");
    assert.equal(s.round, 1);
  });

  test("nach dem letzten Helden greift das Monster an, neue Runde", () => {
    let s = start();
    for (const id of ["a", "b", "c"]) s = performGroupAction(s, id, "end", undefined, T0, seq(roll20(1))).state;
    assert.equal(s.round, 2);
    assert.equal(s.heroes[s.turn].cardId, "a");
    assert.ok(s.log.some((l) => l.includes("greift")));
  });

  test("Zeitüberschreitung überspringt den Zug", () => {
    const s = start();
    assert.equal(applyTimeouts(s, T0 + TURN_MS - 1), s);
    const t = applyTimeouts(s, T0 + TURN_MS + 1, seq(roll20(1)));
    assert.equal(t.heroes[t.turn].cardId, "b");
    assert.ok(t.log.some((l) => l.includes("zögert")));
  });

  test("Kleriker heilt und belebt Mitstreiter", () => {
    let s = start("ratte", [member("a", "krieger"), member("b", "kleriker")]);
    s.heroes[0].hp = 0;
    s = performGroupAction(s, "a", "end", undefined, T0, seq(roll20(1))).state; // a am Boden: eigentlich übersprungen, hier Zug von b
    assert.equal(s.heroes[s.turn].cardId, "b");
    s = performGroupAction(s, "b", "ability", "a", T0, seq(0.9, 0.9)).state;
    assert.ok(s.heroes[0].hp > 0);
    assert.ok(alive(s.heroes[0]));
  });

  test("Paladin zieht die Angriffe auf sich (Provokation)", () => {
    let s = start("golem", [member("a", "krieger"), member("p", "paladin")]);
    s = performGroupAction(s, "a", "end", undefined, T0, seq(roll20(1))).state;
    s = performGroupAction(s, "p", "ability", undefined, T0, seq(0.5)).state; // Heiliger Schild: 1 AP
    assert.equal(s.provoke?.cardId, "p");
    s = performGroupAction(s, "p", "end", undefined, T0, seq(roll20(20), 0.5, 0.5)).state;
    // Alle Angriffe des Monsters gingen an den Paladin
    assert.ok(s.log.filter((l) => l.includes("greift")).every((l) => l.includes("greift p an")));
  });

  test("Barde: Verstärkung und Aura-Talente erhöhen den Trefferbonus aller", () => {
    let s = start("golem", [member("bard", "barde"), member("k", "krieger", ["group1"])]);
    s = performGroupAction(s, "bard", "ability", undefined, T0, seq(0.5)).state; // Spottlied
    assert.equal(s.taunt, 2);
    assert.equal(boonSum(s.heroes[0], "hit"), 2);
    s = performGroupAction(s, "bard", "end", undefined, T0).state;
    // Krieger: würfelt 9 + 3 (STR) + 1 (Aura) + 2 (Verstärkung) = 15 → Treffer gegen RK 17? nein; mit 12 → 18 trifft
    const before = s.monsterHp;
    s = performGroupAction(s, "k", "attack", undefined, T0, seq(roll20(12), 0.9)).state;
    assert.ok(s.monsterHp < before);
  });

  test("Flucht: Held verlässt den Kampf; sind alle weg, ist der Kampf vorbei", () => {
    let s = start("ratte", [member("a", "schurke")]);
    s = performGroupAction(s, "a", "flee", undefined, T0, seq(roll20(20))).state;
    assert.equal(s.status, "fled");
  });

  test("Niederlage, wenn alle am Boden sind; Sieg beim Monstertod", () => {
    let s = start("drache", [member("a", "krieger")]);
    s.heroes[0].hp = 1;
    s = performGroupAction(s, "a", "end", undefined, T0, seq(roll20(20), 0.9, 0.9)).state;
    assert.equal(s.status, "lost");
    const w = { ...start("ratte", [member("a", "krieger"), member("b", "magier")]), monsterHp: 1 };
    assert.equal(performGroupAction(w, "a", "attack", undefined, T0, seq(roll20(20), 0.5)).state.status, "won");
  });

  test("Belohnung: volle XP für alle, Bonus ab 3 Helden, Gold geteilt, Beute verlost", () => {
    const m = getMonster("goblin")!;
    const st = start("goblin");
    const r = groupRewards({ ...st, status: "won" }, seq(0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1));
    assert.equal(r.length, 3);
    assert.equal(r[0].xp, Math.round(m.xp * 1.1));
    assert.ok(r.every((x) => x.gold === r[0].gold));
    const loot = r.flatMap((x) => x.items);
    assert.ok(loot.length >= 1);
    // Wer geflohen ist, bekommt nichts
    const fled = { ...st, status: "won" as const, heroes: st.heroes.map((h, i) => (i === 2 ? { ...h, left: true } : h)) };
    assert.equal(groupRewards(fled).length, 2);
  });

  test("Raid-Bosse: nur für Raids, nie in normalen Begegnungen", () => {
    assert.ok(RAID_BOSSES.every((b) => b.raid && b.raid.min >= 5));
    assert.ok(MONSTERS.filter((m) => m.raid).length >= 2);
    for (let lvl = 1; lvl <= 20; lvl++) assert.ok(!encountersFor(lvl, "temperate").some((m) => m.raid));
    // 8 Helden gegen einen Raid-Boss: ordentlich Lebenspunkte und mehrere Angriffe
    const b = getMonster("hydra")!;
    assert.ok(scaleMonster(b, 8).hp > b.hp * 4);
    assert.equal(scaleMonster(b, 8).attacks, b.attacks + 3);
  });

  test("Gruppengrößen: 4 normal, 8 im Raid-Modus", () => {
    assert.equal(maxPartySize(false), MAX_PARTY);
    assert.equal(maxPartySize(true), MAX_RAID);
    assert.equal(MAX_PARTY, 4);
    assert.equal(MAX_RAID, 8);
  });
});
