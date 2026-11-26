import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseTermTemplate, sanitizeTermTemplate, templateFromEvent, templateTermFields } from "./series-term-template";

describe("Termin-Vorlage", () => {
  test("normalisiert Eingaben", () => {
    assert.deepEqual(sanitizeTermTemplate({ maxPlayers: "1", spectatorMode: true, spectatorReward: { coins: -3, rankPoints: 2.7 } }),
      { maxPlayers: null, spectatorMode: true, spectatorReward: { coins: 0, rankPoints: 2 } });
    assert.equal(sanitizeTermTemplate({ maxPlayers: 16 })!.maxPlayers, 16);
    assert.equal(parseTermTemplate("{kaputt"), null);
  });
  test("Felder für neue Termine — Zuschauer-Belohnung nur mit Zuschauer-Modus", () => {
    assert.deepEqual(templateTermFields({ maxPlayers: 8, spectatorMode: false, spectatorReward: { coins: 5, rankPoints: 0 } }),
      { maxPlayers: 8, spectatorMode: false, spectatorRewardJson: null });
    assert.equal(templateTermFields({ maxPlayers: null, spectatorMode: true, spectatorReward: { coins: 5, rankPoints: 1 } }).spectatorRewardJson, '{"coins":5,"rankPoints":1}');
  });
  test("Vorbelegung aus dem letzten Termin", () => {
    assert.deepEqual(templateFromEvent({ maxPlayers: 12, spectatorMode: true, spectatorRewardJson: '{"coins":10,"rankPoints":1}' }),
      { maxPlayers: 12, spectatorMode: true, spectatorReward: { coins: 10, rankPoints: 1 } });
  });
});
