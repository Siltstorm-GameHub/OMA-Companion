import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fxFromLine, CLASS_ICON, newLines } from "./oq-fx";
import { FX_SHEETS } from "./oq-fx-manifest";
import { existsSync } from "node:fs";

describe("Kampf-Effekte", () => {
  test("Treffer, kritischer Treffer, Fehlschlag", () => {
    assert.equal(fxFromLine("Du greifst an: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.")?.kind, "hit");
    assert.equal(fxFromLine("Du greifst an: 20 (=23) gegen RK 12 — KRITISCHER TREFFER! 14 Schaden.")?.kind, "crit");
    assert.equal(fxFromLine("Du greifst an: 3 (=6) gegen RK 12 — daneben.")?.kind, "miss");
    assert.equal(fxFromLine("Du greifst an: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.")?.side, "monster");
  });

  test("Zauber wählen ihren Effekt", () => {
    assert.equal(fxFromLine("🔥 Feuerball: trifft sicher — 12 Schaden.")?.kind, "fire");
    assert.equal(fxFromLine("Anna — ❄️ Frostblitz: trifft sicher — 14 Schaden.")?.kind, "ice");
    assert.equal(fxFromLine("💥 Kraftschlag: 12 (=15) gegen RK 13 — Treffer! 9 Schaden.")?.kind, "hit");
  });

  test("Monster greift an: Held wird getroffen oder verfehlt (Ziel im Gruppenkampf)", () => {
    const m = "🐺 Grauer Wolf greift Anna an: 14 (=17) gegen RK 12 — Treffer! 5 Schaden.";
    assert.deepEqual(fxFromLine(m, ["Anna", "Ben"]), { kind: "hurt", side: "hero", hero: "Anna", float: { text: "−5", tone: "dmg" } });
    assert.equal(fxFromLine("🐺 Grauer Wolf greift an: 4 (=7) gegen RK 12 — daneben.")?.kind, "miss");
    assert.equal(fxFromLine("🐺 Grauer Wolf greift an: 4 (=7) gegen RK 12 — daneben.")?.side, "hero");
  });

  test("Heilung, Schild, Spott", () => {
    assert.equal(fxFromLine("✨ Heilung: du heilst 9 Lebenspunkte.")?.kind, "heal");
    assert.equal(fxFromLine("Ben — ✨ Heilung: Anna wird um 7 geheilt.", ["Anna", "Ben"])?.kind, "heal");
    assert.equal(fxFromLine("🛡️ Heiliger Schild: +3 Rüstung für 2 Runden, 4 Lebenspunkte geheilt.")?.kind, "barrier");
    assert.equal(fxFromLine("🎶 Spottlied: Golem verliert die Konzentration (−3 aufs Treffen, 2 Runden).")?.kind, "buff");
    assert.equal(fxFromLine("💚 Anna erholt sich um 3 Lebenspunkte.", ["Anna"])?.kind, "rejuvenate");
    assert.equal(fxFromLine("🏆 Grauer Wolf ist besiegt!")?.kind, "death");
    assert.equal(fxFromLine("Du greifst an: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.", [], () => "waldlaeufer")?.kind, "arrow");
    assert.equal(fxFromLine("Du greifst an: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.", [], () => "magier")?.kind, "arcane");
    assert.equal(fxFromLine("Runde 2"), null);
  });

  test("Klassen-Icons und Effekt-Dateien existieren", () => {
    for (const c of ["krieger", "paladin", "magier", "kleriker", "schurke", "waldlaeufer", "barde", "unbekannt"]) assert.ok(existsSync(`public${CLASS_ICON(c)}`), c);
    for (const k of Object.keys(FX_SHEETS)) assert.ok(existsSync(`public/oq/fx/${k}.png`), k);
  });

  test("neue Zeilen auch bei abgeschnittenem Log", () => {
    assert.deepEqual(newLines(["a", "b"], ["a", "b", "c", "d"]), ["c", "d"]);
    assert.deepEqual(newLines(["a", "b", "c"], ["b", "c", "d"]), ["d"]);
    assert.deepEqual(newLines(["a", "b"], ["a", "b"]), []);
    assert.deepEqual(newLines(["x"], ["p", "q"]), ["p", "q"]);
  });
});

describe("Schwebende Zahlen", () => {
  test("Schaden, kritisch, Verfehlt, Heilung", () => {
    assert.deepEqual(fxFromLine("Du greifst an: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.")?.float, { text: "−7", tone: "dmg" });
    assert.deepEqual(fxFromLine("Du greifst an: 20 (=23) gegen RK 12 — KRITISCHER TREFFER! 14 Schaden.")?.float, { text: "−14!", tone: "crit" });
    assert.deepEqual(fxFromLine("Du greifst an: 3 (=6) gegen RK 12 — daneben.")?.float, { text: "Verfehlt", tone: "miss" });
    assert.deepEqual(fxFromLine("🔥 Feuerball: trifft sicher — 12 Schaden.")?.float, { text: "−12", tone: "dmg" });
    assert.deepEqual(fxFromLine("✨ Heilung: du heilst 9 Lebenspunkte.")?.float, { text: "+9", tone: "heal" });
    assert.deepEqual(fxFromLine("💚 Anna erholt sich um 3 Lebenspunkte.", ["Anna"])?.float, { text: "+3", tone: "heal" });
  });
  test("Monster trifft Held: rote Zahl am Helden", () => {
    const e = fxFromLine("🐺 Wolf greift Anna an: 14 (=17) gegen RK 12 — Treffer! 5 Schaden.", ["Anna", "Ben"]);
    assert.deepEqual([e?.hero, e?.float?.text, e?.side], ["Anna", "−5", "hero"]);
  });
  test("Aktion hat einen Ausführenden; Heilung im Gruppenkampf trifft das Ziel", () => {
    assert.equal(fxFromLine("Du greifst an: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.")?.actor, "self");
    assert.equal(fxFromLine("Anna — Angriff: 15 (=18) gegen RK 12 — Treffer! 7 Schaden.", ["Anna", "Ben"])?.actor, "Anna");
    const h = fxFromLine("Ben — ✨ Heilung: Anna wird um 7 geheilt.", ["Anna", "Ben"]);
    assert.deepEqual([h?.hero, h?.actor], ["Anna", "Ben"]);
  });
});
