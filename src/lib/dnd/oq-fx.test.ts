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
    assert.deepEqual(fxFromLine(m, ["Anna", "Ben"]), { kind: "hurt", side: "hero", hero: "Anna" });
    assert.equal(fxFromLine("🐺 Grauer Wolf greift an: 4 (=7) gegen RK 12 — daneben.")?.kind, "miss");
    assert.equal(fxFromLine("🐺 Grauer Wolf greift an: 4 (=7) gegen RK 12 — daneben.")?.side, "hero");
  });

  test("Heilung, Schild, Spott", () => {
    assert.equal(fxFromLine("✨ Heilung: du heilst 9 Lebenspunkte.")?.kind, "heal");
    assert.equal(fxFromLine("Ben — ✨ Heilung: Anna wird um 7 geheilt.", ["Anna", "Ben"])?.kind, "heal");
    assert.equal(fxFromLine("🛡️ Heiliger Schild: +3 Rüstung für 2 Runden, 4 Lebenspunkte geheilt.")?.kind, "guard");
    assert.equal(fxFromLine("🎶 Spottlied: Golem verliert die Konzentration (−3 aufs Treffen, 2 Runden).")?.kind, "buff");
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
