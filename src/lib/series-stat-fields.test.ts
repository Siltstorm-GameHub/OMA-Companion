import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { deriveEventStatFields } from "./series-stat-fields";

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
