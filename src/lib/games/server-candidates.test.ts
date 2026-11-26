import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  autoServerValue, canMemberSetServer, candidateScore, isKnownServerGame, isReadyForServer, missingForReady, mightBeServerGame,
} from "./server-candidates";
import { formatFieldValue, editFieldLabel } from "./edits";
import { gameNameKey } from "./slug";

const game = (name: string, aliases: string[] = []) => ({ nameKey: gameNameKey(name), aliases });

describe("OMA-Server-Kandidaten", () => {
  test("Score ist die offen erklärte Formel", () => {
    assert.equal(candidateScore({ regular: 2, casual: 1, inCount: 3, wishCount: 4 }), 2 * 4 + 3 + 3 * 2 + 4);
    assert.equal(candidateScore({ regular: 0, casual: 0, inCount: 0, wishCount: 0 }), 0);
  });

  test("Schwelle: 6 Zusagen, davon 3 regelmäßig", () => {
    assert.equal(isReadyForServer({ regular: 3, casual: 3 }), true);
    assert.equal(isReadyForServer({ regular: 2, casual: 10 }), false);
    assert.equal(isReadyForServer({ regular: 5, casual: 0 }), false);
    assert.deepEqual(missingForReady({ regular: 1, casual: 2 }), { total: 3, regular: 2 });
    assert.equal(missingForReady({ regular: 6, casual: 0 }), null);
  });

  test("Mitglieder setzen, solange nichts oder nur die Automatik eingetragen ist", () => {
    assert.equal(canMemberSetServer({ serverCapable: null, serverSource: null }, false), true);
    assert.equal(canMemberSetServer({ serverCapable: true, serverSource: "auto" }, false), true);
    assert.equal(canMemberSetServer({ serverCapable: true, serverSource: "user" }, false), false);
    assert.equal(canMemberSetServer({ serverCapable: false, serverSource: "user" }, true), true); // eigene Angabe
    assert.equal(canMemberSetServer({ serverCapable: false, serverSource: "team" }, true), false);
  });

  test("bekannte Server-Spiele über Namen und andere Schreibweisen", () => {
    assert.equal(isKnownServerGame(game("Valheim")), true);
    assert.equal(isKnownServerGame(game("ARK: Survival Ascended")), true);
    assert.equal(isKnownServerGame(game("Counter‑Strike™ 2")), true);
    assert.equal(isKnownServerGame(game("Mein Server-Spiel", ["Palworld"])), true);
    assert.equal(isKnownServerGame(game("It Takes Two")), false);
  });

  test("Automatik setzt nur ja und überschreibt keine Menschen", () => {
    const base = { ...game("Valheim"), serverCapable: null, serverSource: null };
    assert.equal(autoServerValue(base), true);
    assert.equal(autoServerValue({ ...base, serverCapable: false, serverSource: "user" }), null);
    assert.equal(autoServerValue({ ...base, serverSource: "team" }), null);
    assert.equal(autoServerValue({ ...game("It Takes Two"), serverCapable: null, serverSource: null }), null);
  });

  test("schwaches Signal: Koop/PvP und nicht nur zu zweit", () => {
    assert.equal(mightBeServerGame({ modes: ["coop"], maxPlayers: 8 }), true);
    assert.equal(mightBeServerGame({ modes: ["pvp"], maxPlayers: null }), true);
    assert.equal(mightBeServerGame({ modes: ["coop"], maxPlayers: 2 }), false);
    assert.equal(mightBeServerGame({ modes: ["solo"], maxPlayers: null }), false);
  });

  test("Protokoll zeigt die Server-Tauglichkeit lesbar", () => {
    assert.equal(editFieldLabel("serverCapable"), "OMA-Server-tauglich");
    assert.equal(formatFieldValue("serverCapable", { value: true, source: "user" }), "Ja");
    assert.equal(formatFieldValue("serverCapable", { value: null, source: null }), "Unbekannt");
    assert.equal(editFieldLabel("crossplay"), "Crossplay");
  });
});
