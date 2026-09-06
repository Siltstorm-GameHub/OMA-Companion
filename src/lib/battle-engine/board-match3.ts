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
  RAGE_PER_SPECIAL_SWEEP_TILE,
  SPECIAL_GEM_AREA_MATCH_SIZE,
  SPECIAL_GEM_COLOR_BOMB_ROUND_TOTAL,
  SPECIAL_GEM_LINE_MATCH_SIZE,
} from "./constants";

export type TileClassSymbol = UnitClass;
export type BoardGrid = TileClassSymbol[];

/** Sonder-Steine, die aus überlangen Matches entstehen (klassische Match-3-
 *  Konvention, z.B. Candy Crush): "LINE_H"/"LINE_V" aus einem geraden 4er-Match
 *  (räumt beim Auslösen die ganze Reihe bzw. Spalte, in derselben Ausrichtung
 *  wie das erzeugende Match), "AREA" aus einem 5er+-Match (räumt ein 3x3-Feld
 *  um sich herum) und "COLOR_BOMB" aus einer einzelnen Kaskaden-Runde, deren
 *  Matches zusammen SPECIAL_GEM_COLOR_BOMB_ROUND_TOTAL Steine erreichen (räumt
 *  beim Auslösen alle Steine der eigenen Klasse auf dem ganzen Brett). Ein
 *  Sonder-Stein ersetzt genau EINE Zelle des auslösenden Matches (die Zelle
 *  "überlebt" statt zerstört zu werden) und bleibt liegen, bis er selbst Teil
 *  eines späteren Matches wird — siehe activationCellsFor/resolveCascades. */
export type SpecialGemKind = "LINE_H" | "LINE_V" | "AREA" | "COLOR_BOMB";
export type SpecialGrid = (SpecialGemKind | null)[];

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
  /** Sonder-Steine, die in DIESER Kaskaden-Runde neu entstanden sind (Zelle +
   *  Art) — ihre Zelle ist bewusst NICHT Teil von `matchedCells` (sie überlebt
   *  die Runde, siehe SpecialGemKind). */
  specialsCreated: { cell: number; kind: SpecialGemKind }[];
  /** Zellen bereits VORHANDENER Sonder-Steine, die in dieser Runde ausgelöst
   *  wurden (Teil eines Matches geworden) — für einen eigenen visuellen/Sound-
   *  Effekt am Auslöse-Ort, getrennt von den regulär gematchten Zellen. */
  specialsActivated: number[];
  /** Zustand des Sonder-Stein-Grids NACH dieser Runde (Schwerkraft/Nachfüllen
   *  bereits angewendet) — analog zu `gridAfter`, damit die UI Sonder-Icons
   *  auch mitten in einer Kaskade korrekt weiterrendern kann. */
  specialsAfter: SpecialGrid;
}

export interface BoardResolveResult {
  finalGrid: BoardGrid;
  finalSpecials: SpecialGrid;
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

/** Prüft, ob auf dem aktuellen Grid überhaupt noch ein Swap existiert, der ein
 *  Match ergäbe (Deadlock-Erkennung) — probiert dafür jeden benachbarten
 *  Zellen-Tausch probeweise durch und macht ihn sofort wieder rückgängig.
 *  Das Brett wird bei OMA Gems nur EINMALIG zu Kampfbeginn generiert und
 *  danach über die gesamte Zug-Historie fortgeschrieben (siehe boardGrid in
 *  interactive.ts) — nur wenn diese Funktion false liefert, wird ein neues
 *  Brett gezogen. */
export function hasAnyValidMove(grid: BoardGrid): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cell = row * BOARD_COLS + col;
      const neighbors: number[] = [];
      if (col + 1 < BOARD_COLS) neighbors.push(cell + 1);
      if (row + 1 < BOARD_ROWS) neighbors.push(cell + BOARD_COLS);
      for (const neighbor of neighbors) {
        const a = grid[cell];
        const b = grid[neighbor];
        if (a === b) continue;
        grid[cell] = b;
        grid[neighbor] = a;
        const hasMatch = findMatchGroups(grid).length > 0;
        grid[cell] = a;
        grid[neighbor] = b;
        if (hasMatch) return true;
      }
    }
  }
  return false;
}

function randomRegularSymbol(rng: Rng): TileClassSymbol {
  return REGULAR_SYMBOLS[Math.floor(rng() * REGULAR_SYMBOLS.length)];
}

/** Erzeugt ein initiales Grid ohne bereits vorhandene 3er-Matches (klassische
 *  Match-3-Konvention: das Startbrett ist immer "clean"). Gibt zusätzlich den
 *  RNG-Zustand NACH der Generierung zurück — resolveBoardSession() setzt den
 *  RNG exakt dort fort, statt neu zu starten, damit Client (erste Anzeige)
 *  und Server (Zug-Auflösung) bei gleichem Seed dieselbe Zufallsfolge sehen. */
export function generateBoard(seed: number): { grid: BoardGrid; specials: SpecialGrid; rngState: number } {
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

  return { grid, specials: new Array(BOARD_ROWS * BOARD_COLS).fill(null), rngState: rng.getState() };
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

/** true, wenn alle Zellen der Gruppe dieselbe Reihe teilen (findMatchGroups
 *  liefert horizontale Gruppen immer in aufsteigender Spalten-Reihenfolge
 *  derselben Reihe, vertikale entsprechend in derselben Spalte). */
function isHorizontalGroup(group: number[]): boolean {
  return group.length < 2 || cellRow(group[0]) === cellRow(group[1]);
}

/** Alle Zellen, die ein bestimmter Sonder-Stein beim Auslösen zusätzlich
 *  zerstört — LINE räumt die eigene Reihe/Spalte, AREA ein 3x3-Feld um sich
 *  herum, COLOR_BOMB alle Steine der eigenen Klasse auf dem GANZEN Brett
 *  (die Klasse ist das Symbol, auf dem die Bombe gerade liegt, siehe
 *  SpecialGemKind). `cell` selbst ist NICHT enthalten (wird bereits regulär
 *  als Teil des Matches entfernt, das den Sonder-Stein ausgelöst hat). */
function activationCellsFor(kind: SpecialGemKind, cell: number, grid: BoardGrid): number[] {
  const row = cellRow(cell);
  const col = cellCol(cell);
  const extra: number[] = [];
  if (kind === "LINE_H") {
    for (let c = 0; c < BOARD_COLS; c++) if (c !== col) extra.push(row * BOARD_COLS + c);
  } else if (kind === "LINE_V") {
    for (let r = 0; r < BOARD_ROWS; r++) if (r !== row) extra.push(r * BOARD_COLS + col);
  } else if (kind === "AREA") {
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r === row && c === col) continue;
        if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) extra.push(r * BOARD_COLS + c);
      }
    }
  } else if (kind === "COLOR_BOMB") {
    const targetClass = grid[cell];
    for (let c = 0; c < grid.length; c++) if (c !== cell && grid[c] === targetClass) extra.push(c);
  }
  return extra;
}

/** Entfernt die getroffenen Zellen, lässt die restlichen Steine (samt ihrem
 *  ggf. gesetzten Sonder-Stein, siehe `specials`) je Spalte nach unten fallen
 *  ("Schwerkraft") und füllt die freien Plätze oben mit neuen Zufallssymbolen
 *  OHNE Sonder-Stein auf — mutiert `grid`/`specials` direkt. */
function removeAndCascade(grid: BoardGrid, specials: SpecialGrid, matchedCells: Set<number>, rng: Rng): void {
  for (let col = 0; col < BOARD_COLS; col++) {
    const survivingSymbols: TileClassSymbol[] = [];
    const survivingSpecials: (SpecialGemKind | null)[] = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      const cell = row * BOARD_COLS + col;
      if (!matchedCells.has(cell)) {
        survivingSymbols.push(grid[cell]);
        survivingSpecials.push(specials[cell]);
      }
    }
    const missing = BOARD_ROWS - survivingSymbols.length;
    const refilledSymbols: TileClassSymbol[] = [];
    const refilledSpecials: (SpecialGemKind | null)[] = [];
    for (let i = 0; i < missing; i++) {
      refilledSymbols.push(randomRegularSymbol(rng));
      refilledSpecials.push(null);
    }
    const columnSymbols = [...refilledSymbols, ...survivingSymbols];
    const columnSpecials = [...refilledSpecials, ...survivingSpecials];
    for (let row = 0; row < BOARD_ROWS; row++) {
      grid[row * BOARD_COLS + col] = columnSymbols[row];
      specials[row * BOARD_COLS + col] = columnSpecials[row];
    }
  }
}

/** Löst alle Matches im aktuellen Grid auf, inkl. Kaskaden durch nachrutschende
 *  Steine (jede weitere Kaskaden-Stufe gibt RAGE_PER_CASCADE_BONUS obendrauf).
 *  Ein 5er+-Match löst zusätzlich den teamweiten Community-Bonus aus. Eine
 *  gerade 4er-Reihe/Spalte erzeugt einen LINE-, eine 5er+-Reihe/Spalte einen
 *  AREA-Sonder-Stein an ihrer mittleren Zelle (siehe SpecialGemKind); erreicht
 *  die Summe aller Gruppengrößen EINER Kaskaden-Runde
 *  SPECIAL_GEM_COLOR_BOMB_ROUND_TOTAL, entsteht zusätzlich (ggf. anstelle eines
 *  kleineren Sonder-Steins auf derselben Zelle) eine Farbbombe an der Mitte
 *  der größten Gruppe dieser Runde. Bereits vorhandene Sonder-Steine, die
 *  durch diese Runde getroffen werden, lösen rekursiv ihre eigene Zerstörung
 *  aus (siehe activationCellsFor) — die dadurch zusätzlich zerstörten Zellen
 *  zählen NICHT in die 10er-Schwelle dieser Runde hinein (die bezieht sich nur
 *  auf die reguläre Match-Summe). Mutiert `grid`/`specials` direkt, gibt die
 *  dabei entstandenen Rage-Grants UND einen Animations-Schritt pro
 *  Match-Runde zurück (siehe BoardAnimationStep). */
function resolveCascades(
  grid: BoardGrid,
  specials: SpecialGrid,
  rng: Rng
): { grants: RageGrant[]; steps: BoardAnimationStep[] } {
  const grants: RageGrant[] = [];
  const steps: BoardAnimationStep[] = [];
  const MAX_CASCADES = 20; // Sicherheitsnetz gegen einen theoretischen Endlos-Fall
  let cascadeIndex = 0;

  while (cascadeIndex < MAX_CASCADES) {
    const groups = findMatchGroups(grid);
    if (groups.length === 0) break;

    const matchedCells = new Set<number>();
    const specialsCreatedByCell = new Map<number, SpecialGemKind>();
    let roundRawSum = 0;
    let largestGroup = groups[0];

    for (const group of groups) {
      const symbol = grid[group[0]];
      const amount = rageForGroupSize(group.length) + cascadeIndex * RAGE_PER_CASCADE_BONUS;
      grants.push({ targetClass: symbol, amount, tileCount: group.length });
      roundRawSum += group.length;
      if (group.length > largestGroup.length) largestGroup = group;
      if (group.length >= 5) {
        grants.push({ targetClass: "ALL", amount: COMMUNITY_MATCH_TEAM_RAGE_BONUS });
      }
      group.forEach((cell) => matchedCells.add(cell));

      if (group.length >= SPECIAL_GEM_AREA_MATCH_SIZE) {
        specialsCreatedByCell.set(group[Math.floor(group.length / 2)], "AREA");
      } else if (group.length >= SPECIAL_GEM_LINE_MATCH_SIZE) {
        const kind: SpecialGemKind = isHorizontalGroup(group) ? "LINE_H" : "LINE_V";
        specialsCreatedByCell.set(group[Math.floor(group.length / 2)], kind);
      }
    }

    if (roundRawSum >= SPECIAL_GEM_COLOR_BOMB_ROUND_TOTAL) {
      specialsCreatedByCell.set(largestGroup[Math.floor(largestGroup.length / 2)], "COLOR_BOMB");
    }

    // Die Spawn-Zelle jedes neu entstehenden Sonder-Steins überlebt diese
    // Runde (wird gleich VOR dem Entfernen aus `matchedCells` genommen) —
    // klassische Match-3-Konvention: das Match "verwandelt" sich an dieser
    // einen Stelle in den Sonder-Stein, statt komplett zu verschwinden.
    for (const cell of specialsCreatedByCell.keys()) matchedCells.delete(cell);

    // Bereits vorhandene Sonder-Steine, die durch diese Runde getroffen werden,
    // lösen aus — rekursiv, falls ihre Zerstörungs-Zellen selbst wieder einen
    // Sonder-Stein treffen (Breitensuche über eine Warteschlange).
    const activatedSpecialCells: number[] = [];
    const queue = [...matchedCells];
    const queued = new Set(queue);
    while (queue.length > 0) {
      const cell = queue.shift() as number;
      const kind = specials[cell];
      if (!kind || specialsCreatedByCell.has(cell)) continue;
      activatedSpecialCells.push(cell);
      for (const extra of activationCellsFor(kind, cell, grid)) {
        if (!matchedCells.has(extra)) {
          matchedCells.add(extra);
          grants.push({ targetClass: grid[extra], amount: RAGE_PER_SPECIAL_SWEEP_TILE, tileCount: 1 });
        }
        if (!queued.has(extra)) {
          queued.add(extra);
          queue.push(extra);
        }
      }
    }

    for (const [cell, kind] of specialsCreatedByCell) specials[cell] = kind;
    removeAndCascade(grid, specials, matchedCells, rng);
    steps.push({
      matchedCells: [...matchedCells],
      gridAfter: [...grid],
      specialsCreated: [...specialsCreatedByCell].map(([cell, kind]) => ({ cell, kind })),
      specialsActivated: activatedSpecialCells,
      specialsAfter: [...specials],
    });
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
  initialSpecials: SpecialGrid,
  rngState: number,
  swaps: SwapMove[],
  moveBudget: number
): BoardResolveResult {
  const grid: BoardGrid = [...initialGrid];
  const specials: SpecialGrid = [...initialSpecials];
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
    const specialA = specials[fromCell];
    const specialB = specials[toCell];
    specials[fromCell] = specialB;
    specials[toCell] = specialA;

    const groups = findMatchGroups(grid);
    if (groups.length === 0) {
      grid[fromCell] = a;
      grid[toCell] = b;
      specials[fromCell] = specialA;
      specials[toCell] = specialB;
      continue;
    }

    matchedSwaps++;
    const { grants, steps } = resolveCascades(grid, specials, rng);
    allGrants.push(...grants);
    allSteps.push(...steps);
  }

  const rageGrants = mergeGrants(allGrants);
  const totalRageGranted = rageGrants.reduce((sum, g) => sum + g.amount, 0);

  return {
    finalGrid: grid,
    finalSpecials: specials,
    finalRngState: rng.getState(),
    rageGrants,
    rawGrants: allGrants,
    matchedSwaps,
    totalRageGranted,
    steps: allSteps,
  };
}
