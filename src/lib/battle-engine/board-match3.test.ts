// ============================================
// Unit-Tests — Match-3-Brett-Engine (board-match3.ts)
// ============================================
// Läuft über Node's eingebauten Test-Runner + tsx (kein zusätzliches
// Test-Framework nötig, siehe package.json: "test"-Script). Fokus: die
// Engine ist die Grundlage der Rage-Vergabe UND des Anti-Cheat-Replays
// (Server berechnet dieselbe Funktion autoritativ neu, siehe live-battle.ts)
// — Regressionen hier wären besonders teuer.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateBoard, resolveBoardSession, type BoardGrid, type TileClassSymbol } from "./board-match3";
import { BOARD_COLS, BOARD_ROWS, COMMUNITY_MATCH_TEAM_RAGE_BONUS, RAGE_PER_MATCH3 } from "./constants";

const REGULAR_SYMBOLS: TileClassSymbol[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];

/** Nur für Tests: zählt horizontale/vertikale 3er+-Reihen im Grid — dupliziert
 *  bewusst NICHT die private findMatchGroups()-Logik aus board-match3.ts,
 *  sondern prüft unabhängig davon dieselbe Eigenschaft (Blackbox-Test). */
function countMatchRuns(grid: BoardGrid): number {
  let matches = 0;
  for (let row = 0; row < BOARD_ROWS; row++) {
    let run = 1;
    for (let col = 1; col <= BOARD_COLS; col++) {
      const same = col < BOARD_COLS && grid[row * BOARD_COLS + col] === grid[row * BOARD_COLS + col - 1];
      if (same) run++;
      else {
        if (run >= 3) matches++;
        run = 1;
      }
    }
  }
  for (let col = 0; col < BOARD_COLS; col++) {
    let run = 1;
    for (let row = 1; row <= BOARD_ROWS; row++) {
      const same = row < BOARD_ROWS && grid[row * BOARD_COLS + col] === grid[(row - 1) * BOARD_COLS + col];
      if (same) run++;
      else {
        if (run >= 3) matches++;
        run = 1;
      }
    }
  }
  return matches;
}

describe("generateBoard", () => {
  test("erzeugt ein Grid der richtigen Größe mit gültigen Symbolen", () => {
    const { grid } = generateBoard(12345);
    assert.equal(grid.length, BOARD_ROWS * BOARD_COLS);
    for (const symbol of grid) {
      assert.ok(REGULAR_SYMBOLS.includes(symbol), `unerwartetes Symbol: ${symbol}`);
    }
  });

  test("ist deterministisch für denselben Seed", () => {
    const a = generateBoard(999);
    const b = generateBoard(999);
    assert.deepEqual(a.grid, b.grid);
    assert.equal(a.rngState, b.rngState);
  });

  test("liefert für verschiedene Seeds i.d.R. unterschiedliche Grids", () => {
    const a = generateBoard(1);
    const b = generateBoard(2);
    assert.notDeepEqual(a.grid, b.grid);
  });

  test("enthält keine bereits fertigen 3er-Reihen (mehrere Seeds)", () => {
    for (const seed of [1, 2, 3, 42, 1000, 987654]) {
      const { grid } = generateBoard(seed);
      assert.equal(countMatchRuns(grid), 0, `Seed ${seed} erzeugt bereits ein Match`);
    }
  });
});

describe("resolveBoardSession", () => {
  test("ist deterministisch bei gleichen Eingaben", () => {
    const { grid, rngState } = generateBoard(555);
    const swaps = [{ fromCell: 0, toCell: 1 }];
    const a = resolveBoardSession(grid, rngState, swaps, 8);
    const b = resolveBoardSession(grid, rngState, swaps, 8);
    assert.deepEqual(a, b);
  });

  test("nicht benachbarte Zellen werden ignoriert (kein Match, Grid unverändert)", () => {
    const { grid, rngState } = generateBoard(1);
    const farSwap = { fromCell: 0, toCell: BOARD_COLS * 2 }; // zwei Reihen entfernt
    const result = resolveBoardSession(grid, rngState, [farSwap], 8);
    assert.equal(result.matchedSwaps, 0);
    assert.equal(result.totalRageGranted, 0);
    assert.deepEqual(result.finalGrid, grid);
  });

  test("außerhalb des Grids liegende Zell-Indizes werfen keinen Fehler", () => {
    const { grid, rngState } = generateBoard(1);
    const result = resolveBoardSession(grid, rngState, [{ fromCell: -1, toCell: 9999 }], 8);
    assert.equal(result.matchedSwaps, 0);
    assert.deepEqual(result.finalGrid, grid);
  });

  test("ein Swap ohne resultierendes Match wird zurückgesetzt", () => {
    // Handgebautes Grid ohne jede Möglichkeit eines 3er-Matches durch einen
    // einzelnen Swap: strikt alternierendes Spaltenmuster T/D/S/T/D/S/T je Reihe,
    // in jeder Reihe um 1 verschoben — kein Swap zweier Nachbarn kann daraus
    // eine 3er-Reihe machen.
    const pattern: TileClassSymbol[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];
    const grid: BoardGrid = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        grid.push(pattern[(col + row) % 3]);
      }
    }
    const result = resolveBoardSession(grid, 42, [{ fromCell: 0, toCell: 1 }], 8);
    assert.equal(result.matchedSwaps, 0);
    assert.deepEqual(result.finalGrid, grid);
  });

  /** Match-freies Grundmuster (siehe "kein Match"-Test oben: jede Zelle
   *  unterscheidet sich garantiert von ihren horizontalen/vertikalen Nachbarn,
   *  da (col+row)%3 sich bei +1 in Spalte ODER Reihe immer ändert) — dient als
   *  Basis, in die gezielt ein einzelnes beabsichtigtes Match hineingesetzt
   *  wird, ohne irgendwo sonst im Grid versehentlich weitere Matches zu erzeugen. */
  function matchFreeBaseGrid(): BoardGrid {
    const pattern: TileClassSymbol[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];
    const grid: BoardGrid = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        grid.push(pattern[(col + row) % 3]);
      }
    }
    return grid;
  }

  test("ein Swap, der ein 3er-Match erzeugt, vergibt Rage für die passende Klasse", () => {
    // Reihe 0 des match-freien Basismusters ist T D S T D S T — cols 0-3 auf
    // D D T D überschrieben, Swap col2<->col3 ergibt D D D T (3er-Match DAMAGE_DEALER).
    const grid = matchFreeBaseGrid();
    grid[0] = "DAMAGE_DEALER";
    grid[1] = "DAMAGE_DEALER";
    grid[2] = "TANK";
    grid[3] = "DAMAGE_DEALER";

    const result = resolveBoardSession(grid, 7, [{ fromCell: 2, toCell: 3 }], 8);

    assert.equal(result.matchedSwaps, 1);
    assert.ok(result.steps.length >= 1);
    // Der erste Schritt ist immer der direkte Match aus dem Swap — unabhängig
    // von eventuellen (rng-abhängigen) Folge-Kaskaden, daher hart prüfbar.
    assert.deepEqual([...result.steps[0].matchedCells].sort((a, b) => a - b), [0, 1, 2]);
    const dealerGrant = result.rageGrants.find((g) => g.targetClass === "DAMAGE_DEALER");
    assert.ok(dealerGrant, "kein Rage-Grant für DAMAGE_DEALER");
    assert.ok(dealerGrant!.amount >= RAGE_PER_MATCH3);
    assert.equal(
      result.totalRageGranted,
      result.rageGrants.reduce((sum, g) => sum + g.amount, 0)
    );
  });

  test("ein 5er-Match löst zusätzlich den teamweiten Community-Bonus aus", () => {
    // Reihe 0 auf T T T T S T überschrieben, Swap col4<->col5 ergibt
    // T T T T T S (5er-Match TANK über cols 0-4).
    const grid = matchFreeBaseGrid();
    grid[0] = "TANK";
    grid[1] = "TANK";
    grid[2] = "TANK";
    grid[3] = "TANK";
    grid[4] = "SUPPORT";
    grid[5] = "TANK";

    const result = resolveBoardSession(grid, 13, [{ fromCell: 4, toCell: 5 }], 8);

    assert.equal(result.matchedSwaps, 1);
    assert.deepEqual([...result.steps[0].matchedCells].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
    const communityGrant = result.rageGrants.find((g) => g.targetClass === "ALL");
    assert.ok(communityGrant, "kein Community-Bonus-Grant (ALL) bei 5er-Match");
    assert.ok(communityGrant!.amount >= COMMUNITY_MATCH_TEAM_RAGE_BONUS);
  });

  test("moveBudget kappt die Anzahl berücksichtigter Swaps", () => {
    const pattern: TileClassSymbol[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];
    const grid: BoardGrid = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        grid.push(pattern[(col + row) % 3]);
      }
    }
    // Zweiter Swap würde (isoliert betrachtet) kein Match ergeben (gleiches
    // Muster wie im No-Op-Test oben) — moveBudget=1 darf ihn ohnehin nicht
    // mehr berücksichtigen, das Ergebnis muss identisch zu einem leeren
    // Swap-Array sein.
    const swaps = [
      { fromCell: 0, toCell: 1 },
      { fromCell: 3, toCell: 4 },
    ];
    const capped = resolveBoardSession(grid, 3, swaps, 1);
    const empty = resolveBoardSession(grid, 3, [], 1);
    assert.deepEqual(capped, empty);
  });
});
