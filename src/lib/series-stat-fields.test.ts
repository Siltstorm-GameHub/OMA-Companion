import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { deriveEventStatFields, mergeTermStatFields, seriesTermStatFields } from "./series-stat-fields";

describe("deriveEventStatFields", () => {
  test("erfasst alle Stats außer 🏆/⚔️, ohne Leerzeilen und Duplikate", () => {
    assert.deepEqual(
      deriveEventStatFields([
        { field: "Kills" },
        { field: " Assists " },
        { field: "" },
        { field: "Siege", isWinnerStat: true },
        { field: "Runden", isMatchWinStat: true },
        { field: "Kills" },
      ]),
      ["Kills", "Assists"],
    );
  });
});

describe("Stat-Felder der Termine beim Speichern der Reihe", () => {
  test("Reihen-Felder: gepflegte eventStatFields, sonst Stats ohne Sieger/Match-Win", () => {
    assert.deepEqual(seriesTermStatFields(JSON.stringify({ stats: [{ field: "Kills" }, { field: "Sieg", isWinnerStat: true }] })), ["Kills"]);
    assert.deepEqual(seriesTermStatFields(JSON.stringify({ stats: [{ field: "Kills" }], eventStatFields: ["Tore"] })), ["Tore"]);
    assert.deepEqual(seriesTermStatFields(null), []);
  });
  test("Zusatz-Stats eines Termins bleiben erhalten", () => {
    // Termin hatte Kills (Reihe) + Assists (nur dieser Termin); Reihe stellt auf Kills + Tore um
    assert.deepEqual(mergeTermStatFields(["Kills", "Assists"], ["Kills"], ["Kills", "Tore"]), ["Kills", "Tore", "Assists"]);
    // Ein entferntes Reihen-Feld verschwindet auch beim Termin
    assert.deepEqual(mergeTermStatFields(["Kills", "Tore"], ["Kills", "Tore"], ["Kills"]), ["Kills"]);
    assert.deepEqual(mergeTermStatFields(null, [], ["Kills"]), ["Kills"]);
  });
});
