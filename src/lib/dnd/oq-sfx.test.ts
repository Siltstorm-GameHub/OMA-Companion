import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { SFX_KEYS, sfxForFeed, sfxForFx } from "./oq-sfx";
import { FX_SHEETS } from "./oq-fx-manifest";

describe("Sound", () => {
  test("alle Klangdateien existieren", () => {
    for (const k of SFX_KEYS) assert.ok(existsSync(`public/oq/sfx/${k}.wav`), k);
  });
  test("jeder Kampf-Effekt hat einen Klang", () => {
    for (const k of Object.keys(FX_SHEETS)) assert.ok(SFX_KEYS.includes(sfxForFx(k as keyof typeof FX_SHEETS)), k);
    assert.notEqual(sfxForFx("hit", 0), sfxForFx("hit", 1));
  });
  test("Meldungen: Belohnung, Stufe und Fehler klingen, Info bleibt still", () => {
    assert.equal(sfxForFeed("info"), null);
    assert.equal(sfxForFeed("level"), "level");
    assert.equal(sfxForFeed("error"), "error");
  });
});
