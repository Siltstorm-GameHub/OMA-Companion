// ============================================
// Battle-Engine — Match-3-Brett ("OMA Gems")
// ============================================
// Reine, deterministische Match-3-Logik: Grid-Generierung aus einem Seed,
// Swap-Validierung, Match-Erkennung (3/4/5 in einer Reihe/Spalte), Kaskaden/
// Nachfüllen und Rage-Berechnung. Wird von Client (Rendering/Vorschau) UND
// Server (autoritative Wiederholung, siehe live-battle.ts) gleichermaßen
// genutzt — beide müssen bei gleichem Grid + gleichem RNG-Zustand + gleicher
// Swap-Sequenz exakt dasselbe Ergebnis berechnen (Anti-Cheat, siehe
// PROJECT-Plan). Die drei regulären Symbol-Typen entsprechen 1:1 den drei
// CardClass-Werten und werden im UI mit den bereits vorhandenen
// Spielgenre-Icons dargestellt (siehe genre-icons.ts: Arcade=SUPPORT,
// Shooter=DAMAGE_DEALER, Racing=TANK).

import { createRng, type Rng } from "./rng";
import type { UnitClass } from "./types";
import {
  BOARD_COLS,
  BOARD_ROWS,
  COMMUNITY_MATCH_TEAM_RAGE_BONUS,
  RAGE_PER_CASCADE_BONUS,
  RAGE_PER_MATCH3,
  RAGE_PER_MATCH4,
  RAGE_PER_MATCH5,
} from "./constants";

export type TileClassSymbol = UnitClass;
export type BoardGrid = TileClassSymbol[];

const REGULAR_SYMBOLS: TileClassSymbol[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];

export interface SwapMove {
  fromCell: number;
  toCell: number;
}

/** "ALL" repräsentiert den teamweiten Community-Bonus aus einem 5er-Match
 *  (siehe COMMUNITY_MATCH_TEAM_RAGE_BONUS) — kein eigenes Brett-Symbol,
 *  sondern ein zusätzlicher Grant obendrauf. */
export interface RageGrant {
  targetClass: TileClassSymbol | "ALL";
  amount: number;
  /** Anzahl der in diesem einzelnen Match-/Kaskaden-Ereignis zerstörten Steine
   *  (Gruppengröße, 3+) — nicht gesetzt beim "ALL"-Community-Bonus. Grundlage
   *  für den Schadens-/Heilungs-Multiplikator ausgelöster Normalangriffe (siehe
   *  applyBoardRage in interactive.ts: je mehr Steine zerstört wurden, desto
   *  stärker der Angriff). */
  tileCount?: number;
}

/** Ein einzelner Auflösungsschritt (ein Match + die dadurch entfernten Zellen,
 *  gefolgt vom Grid-Zustand NACH Schwerkraft/Nachfüllen) — für die UI, um die
 *  Zerstörung/den Fall der Edelsteine Schritt für Schritt zu animieren (siehe
 *  BoardMatch3.tsx), statt nur das Endergebnis zu zeigen. */
export interface BoardAnimationStep {
  matchedCells: number[];
  gridAfter: BoardGrid;
}

export interface BoardResolveResult {
  finalGrid: BoardGrid;
  finalRngState: number;
  rageGrants: RageGrant[];
  /** UNGEMERGTE Grants — ein Eintrag pro einzelnem Match-/Kaskaden-Ereignis (vor
   *  mergeGrants), in der Reihenfolge, in der sie passiert sind. `rageGrants`
   *  fasst diese pro Klasse zusammen (für die tatsächlich gutgeschriebene Rage,
   *  inkl. MAX_BOARD_RAGE_PER_TURN-Deckelung) — für "jedes Match einer Klasse
   *  löst zusätzlich einen echten Normalangriff aus" (siehe applyBoardRage in
   *  interactive.ts) wird dagegen JEDES einzelne Ereignis gebraucht, nicht nur
   *  die Summe. */
  rawGrants: RageGrant[];
  /** Anzahl der eingereichten Swaps, die tatsächlich zu einem Match geführt haben
   *  (ungültige/wirkungslose Swaps werden automatisch zurückgesetzt). */
  matchedSwaps: number;
  totalRageGranted: number;
  /** Ein Eintrag pro Match-Runde (direkter Match + jede weitere Kaskade), über
   *  alle eingereichten Swaps hinweg, in der Reihenfolge, in der sie passiert sind. */
  steps: BoardAnimationStep[];
}

function cellRow(cell: number): number {
  return Math.floor(cell / BOARD_COLS);
}

function cellCol(cell: number): number {
  return cell % BOARD_COLS;
}

function isInBounds(cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < BOARD_ROWS * BOARD_COLS;
}

function areAdjacent(a: number, b: number): boolean {
  const ra = cellRow(a);
  const ca = cellCol(a);
  const rb = cellRow(b);
  const cb = cellCol(b);
  return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
}

function randomRegularSymbol(rng: Rng): TileClassSymbol {
  return REGULAR_SYMBOLS[Math.floor(rng() * REGULAR_SYMBOLS.length)];
}

/** Erzeugt ein initiales Grid ohne bereits vorhandene 3er-Matches (klassische
 *  Match-3-Konvention: das Startbrett ist immer "clean"). Gibt zusätzlich den
 *  RNG-Zustand NACH der Generierung zurück — resolveBoardSession() setzt den
 *  RNG exakt dort fort, statt neu zu starten, damit Client (erste Anzeige)
 *  und Server (Zug-Auflösung) bei gleichem Seed dieselbe Zufallsfolge sehen. */
export function generateBoard(seed: number): { grid: BoardGrid; rngState: number } {
  const rng = createRng(seed);
  const grid: BoardGrid = new Array(BOARD_ROWS * BOARD_COLS);

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cell = row * BOARD_COLS + col;
      let symbol: TileClassSymbol;
      let attempts = 0;
      do {
        symbol = randomRegularSymbol(rng);
        attempts++;
      } while (
        attempts < 20 &&
        ((col >= 2 && grid[cell - 1] === symbol && grid[cell - 2] === symbol) ||
          (row >= 2 && grid[cell - BOARD_COLS] === symbol && grid[cell - 2 * BOARD_COLS] === symbol))
      );
      grid[cell] = symbol;
    }
  }

  return { grid, rngState: rng.getState() };
}

/** Findet alle zusammenhängenden Match-Gruppen (Länge >= 3), horizontal und vertikal. */
function findMatchGroups(grid: BoardGrid): number[][] {
  const groups: number[][] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    let runStart = 0;
    for (let col = 1; col <= BOARD_COLS; col++) {
      const prevCell = row * BOARD_COLS + (col - 1);
      const sameAsPrev = col < BOARD_COLS && grid[row * BOARD_COLS + col] === grid[prevCell];
      if (!sameAsPrev) {
        const runLength = col - runStart;
        if (runLength >= 3) {
          const cells: number[] = [];
          for (let c = runStart; c < col; c++) cells.push(row * BOARD_COLS + c);
          groups.push(cells);
        }
        runStart = col;
      }
    }
  }

  for (let col = 0; col < BOARD_COLS; col++) {
    let runStart = 0;
    for (let row = 1; row <= BOARD_ROWS; row++) {
      const prevCell = (row - 1) * BOARD_COLS + col;
      const sameAsPrev = row < BOARD_ROWS && grid[row * BOARD_COLS + col] === grid[prevCell];
      if (!sameAsPrev) {
        const runLength = row - runStart;
        if (runLength >= 3) {
          const cells: number[] = [];
          for (let r = runStart; r < row; r++) cells.push(r * BOARD_COLS + col);
          groups.push(cells);
        }
        runStart = row;
      }
    }
  }

  return groups;
}

function rageForGroupSize(size: number): number {
  if (size >= 5) return RAGE_PER_MATCH5;
  if (size === 4) return RAGE_PER_MATCH4;
  return RAGE_PER_MATCH3;
}

/** Entfernt die getroffenen Zellen, lässt die restlichen Steine je Spalte nach
 *  unten fallen ("Schwerkraft") und füllt die freien Plätze oben mit neuen
 *  Zufallssymbolen auf — mutiert `grid` direkt. */
function removeAndCascade(grid: BoardGrid, matchedCells: Set<number>, rng: Rng): void {
  for (let col = 0; col < BOARD_COLS; col++) {
    const surviving: TileClassSymbol[] = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      const cell = row * BOARD_COLS + col;
      if (!matchedCells.has(cell)) surviving.push(grid[cell]);
    }
    const missing = BOARD_ROWS - surviving.length;
    const refilled: TileClassSymbol[] = [];
    for (let i = 0; i < missing; i++) refilled.push(randomRegularSymbol(rng));
    const column = [...refilled, ...surviving];
    for (let row = 0; row < BOARD_ROWS; row++) {
      grid[row * BOARD_COLS + col] = column[row];
    }
  }
}

/** Löst alle Matches im aktuellen Grid auf, inkl. Kaskaden durch nachrutschende
 *  Steine (jede weitere Kaskaden-Stufe gibt RAGE_PER_CASCADE_BONUS obendrauf).
 *  Ein 5er+-Match löst zusätzlich den teamweiten Community-Bonus aus. Mutiert
 *  `grid` direkt, gibt die dabei entstandenen Rage-Grants UND einen
 *  Animations-Schritt pro Match-Runde zurück (siehe BoardAnimationStep). */
function resolveCascades(grid: BoardGrid, rng: Rng): { grants: RageGrant[]; steps: BoardAnimationStep[] } {
  const grants: RageGrant[] = [];
  const steps: BoardAnimationStep[] = [];
  const MAX_CASCADES = 20; // Sicherheitsnetz gegen einen theoretischen Endlos-Fall
  let cascadeIndex = 0;

  while (cascadeIndex < MAX_CASCADES) {
    const groups = findMatchGroups(grid);
    if (groups.length === 0) break;

    const matchedCells = new Set<number>();
    for (const group of groups) {
      const symbol = grid[group[0]];
      const amount = rageForGroupSize(group.length) + cascadeIndex * RAGE_PER_CASCADE_BONUS;
      grants.push({ targetClass: symbol, amount, tileCount: group.length });
      if (group.length >= 5) {
        grants.push({ targetClass: "ALL", amount: COMMUNITY_MATCH_TEAM_RAGE_BONUS });
      }
      group.forEach((cell) => matchedCells.add(cell));
    }

    removeAndCascade(grid, matchedCells, rng);
    steps.push({ matchedCells: [...matchedCells], gridAfter: [...grid] });
    cascadeIndex++;
  }

  return { grants, steps };
}

function mergeGrants(grants: RageGrant[]): RageGrant[] {
  const byTarget = new Map<RageGrant["targetClass"], number>();
  for (const grant of grants) {
    byTarget.set(grant.targetClass, (byTarget.get(grant.targetClass) ?? 0) + grant.amount);
  }
  return [...byTarget.entries()].map(([targetClass, amount]) => ({ targetClass, amount }));
}

/** Autoritative Auflösung einer Zug-Session: wendet die eingereichten Swaps
 *  (gedeckelt auf `moveBudget`) der Reihe nach auf `initialGrid` an, ausgehend
 *  vom RNG-Zustand `rngState` (siehe generateBoard). Ein Swap, der keinen
 *  Match erzeugt, wird automatisch zurückgesetzt (kein Rage-Effekt, klassische
 *  Match-3-Konvention) — nicht als Fehler behandelt. Sowohl Client (Vorschau/
 *  Animation) als auch Server (autoritative Berechnung der tatsächlich
 *  gutgeschriebenen Rage, siehe live-battle.ts) rufen exakt diese Funktion auf. */
export function resolveBoardSession(
  initialGrid: BoardGrid,
  rngState: number,
  swaps: SwapMove[],
  moveBudget: number
): BoardResolveResult {
  const grid: BoardGrid = [...initialGrid];
  const rng = createRng(rngState);
  const allGrants: RageGrant[] = [];
  const allSteps: BoardAnimationStep[] = [];
  let matchedSwaps = 0;

  const cappedSwaps = swaps.slice(0, Math.max(0, moveBudget));
  for (const swap of cappedSwaps) {
    const { fromCell, toCell } = swap;
    if (!isInBounds(fromCell) || !isInBounds(toCell) || !areAdjacent(fromCell, toCell)) continue;

    const a = grid[fromCell];
    const b = grid[toCell];
    grid[fromCell] = b;
    grid[toCell] = a;

    const groups = findMatchGroups(grid);
    if (groups.length === 0) {
      grid[fromCell] = a;
      grid[toCell] = b;
      continue;
    }

    matchedSwaps++;
    const { grants, steps } = resolveCascades(grid, rng);
    allGrants.push(...grants);
    allSteps.push(...steps);
  }

  const rageGrants = mergeGrants(allGrants);
  const totalRageGranted = rageGrants.reduce((sum, g) => sum + g.amount, 0);

  return { finalGrid: grid, finalRngState: rng.getState(), rageGrants, rawGrants: allGrants, matchedSwaps, totalRageGranted, steps: allSteps };
}
