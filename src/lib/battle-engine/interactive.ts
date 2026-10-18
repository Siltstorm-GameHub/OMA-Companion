// ============================================
// Battle-Engine — OMA Gems: pausierbarer Kampf-Stepper mit Match-3-Brett
// ============================================
// Ergänzt runBattle() (ein Aufruf = kompletter Kampf) um eine Variante, die bei
// jedem Zug einer Spieler-Einheit (Team A) anhält und auf einen Zug auf dem
// Match-3-Brett wartet. Der komplette Zustand ist JSON-serialisierbar (siehe
// InteractiveBattleState) — eine Anfrage pro Zug, dazwischen liegt der Zustand
// in der DB (LiveBattle.stateJson, siehe lib/gems/live-battle.ts).
//
// Team A wird vom Spieler gesteuert, Team B (Monster) von der KI über
// defaultDecideAction() + die eingebauten Zielregeln — exakt wie runBattle().
// Jeder Spieler-Zug ist ein Zug auf dem Brett: jedes Match lässt die Helden der
// passenden Klasse angreifen (siehe applyBoardRage). Ultimates werden unabhängig
// von der Zugreihenfolge per Klick ausgelöst (siehe applyUltimateInterrupt).

import {
  generateBoard,
  pickEnemyForColumn,
  hasAnyValidMove,
  resolveBoardSession,
  type BoardAnimationStep,
  type BoardGrid,
  type SpecialGrid,
  type SwapMove,
} from "./board-match3";
import {
  BOARD_COLS,
  BOARD_MOVE_BUDGET_PER_TURN,
  MAX_BOARD_RAGE_PER_TURN,
  PLAYER_ULTIMATE_MAX_HP_SHARE,
  RAGE_PER_ACTION,
  RAGE_PER_ROUND_END,
  ROUND_LIMIT,
  SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP,
  ULTIMATE_SKILL_COST,
} from "./constants";
import { tickStatModifierDurations } from "./effects";
import { checkWinner, defaultDecideAction, grantRage, performAction } from "./engine";
import { computeInitiativeOrder } from "./initiative";
import { triggerPassiveForUnit, triggerPassivesForAll } from "./passives";
import { createRng, randomSeed } from "./rng";
import { createBattleUnitState, createTeamState } from "./stats";
import type { ActionType, BattleLogEntry, BattleUnitDefinition, BattleUnitState, BattleWinner, TeamId, UnitClass } from "./types";

/** Vom Spieler gesteuertes Team — Team B sind immer KI-gesteuerte Monster. */
const PLAYER_TEAM: TeamId = "A";

/** Wellenmodus (Last Stand): Sobald alle Gegner besiegt sind, erscheint das nächste Team, bis das Team
 *  des Spielers gefallen ist. Die Gegner einer Welle liefert die Aufrufer-Seite in `queued` (siehe
 *  wave-levels.ts / live-battle.ts) — die Engine kennt keine Level-Inhalte. */
export interface WaveModeState {
  /** Aktuelle Welle, beginnt bei 1. */
  wave: number;
  /** Anteil der Max-Leben, den lebende Helden nach einer besiegten Welle zurückbekommen. */
  healShare: number;
  /** Runden je Welle, bevor der Sudden-Death-Schaden beginnt (der Zähler startet mit jeder Welle neu). */
  roundsPerWave: number;
  /** Gegner der nächsten Welle — muss vor jedem advance() gesetzt sein. */
  queued: BattleUnitDefinition[] | null;
  /** Vom Aufrufer mitgegeben, damit spätere Wellen wie die erste verändert werden (Relikte, Wochen-Regel). */
  context?: { relicIds: string[]; week: number };
}

export interface InteractiveBattleState {
  seed: number;
  rngState: number;
  round: number;
  roundLimit: number;
  unitsA: BattleUnitState[];
  unitsB: BattleUnitState[];
  log: BattleLogEntry[];
  order: string[];
  orderIndex: number;
  winner: BattleWinner | null;
  /** Gesetzt, sobald turnStart für diese Spieler-Einheit bereits geloggt wurde und auf
   *  einen Brett-Zug gewartet wird — verhindert doppeltes turnStart beim Fortsetzen. */
  awaitingUnitId: string | null;
  /** Das PERSISTENTE Match-3-Brett — wird EINMALIG zu Kampfbeginn gezogen (siehe
   *  createInteractiveState) und danach über die gesamte Zug-Historie
   *  fortgeschrieben (jeder Swap verändert es dauerhaft, siehe applyBoardRage),
   *  NIE bei einem neuen Zug neu generiert. Ein komplett neues Brett entsteht nur,
   *  wenn auf dem aktuellen keinerlei Zug mehr ein Match ergäbe (Deadlock, siehe
   *  hasAnyValidMove/regenerateBoardIfNeeded). */
  boardGrid: BoardGrid | null;
  /** Sonder-Steine (siehe SpecialGemKind in board-match3.ts) — parallel zu
   *  `boardGrid`, genauso persistent über den gesamten Kampfverlauf. */
  boardSpecials: SpecialGrid | null;
  boardRngState: number;
  /** Vom Spieler (Team A) im Kampf gematchte Steine je Klasse, inkl. Kaskaden und Sonder-Stein-Räumungen
   *  — Grundlage der Karten-XP (siehe battleXp in lib/gems/card-ranks.ts). Fehlt bei Kämpfen aus der Zeit
   *  davor. */
  matchedGems?: Record<UnitClass, number>;
  /** Auflösungsschritte (Match, Schwerkraft, nachgefüllte Steine, Kaskaden) des zuletzt eingereichten
   *  Spieler-Zugs, wie der Server sie berechnet hat. Der Client spielt GENAU diese Schritte ab, damit das
   *  Brett nach der Animation dem persistenten Server-Brett entspricht (kein lokal erfundenes Nachfüllen,
   *  das beim nächsten Zug durch das Server-Brett ersetzt würde). */
  lastBoardSteps?: BoardAnimationStep[];
  /** Nur im Wellenmodus gesetzt, siehe WaveModeState. */
  waveMode?: WaveModeState;
  /** Das Brett für den GERADE wartenden Spieler-Zug — Grid/RngState werden beim
   *  Pausieren aus boardGrid/boardRngState übernommen (nicht neu erzeugt) und beim
   *  Verarbeiten des Zugs wieder geleert. `appliedSwaps` hält den bisherigen
   *  Fortschritt der laufenden Mini-Session fest (siehe recordBoardProgress), damit
   *  ein Reload mitten im Zug den Board-Fortschritt NICHT verwirft. */
  pendingBoard: { grid: BoardGrid; specials: SpecialGrid; rngState: number; appliedSwaps: SwapMove[] } | null;
}

export interface PendingDecision {
  unitId: string;
  teamId: TeamId;
  /** Brett für die Match-3-Mini-Session dieses Zugs (siehe board-match3.ts) sowie die
   *  bislang bestätigten Swaps (für die Wiederherstellung nach einem Reload). */
  board: { grid: BoardGrid; specials: SpecialGrid; moveBudget: number; appliedSwaps: SwapMove[] } | null;
}

export interface AdvanceResult {
  state: InteractiveBattleState;
  pendingDecision: PendingDecision | null;
}

/** Ein Spieler-Zug: die in der Mini-Session gemachten Swaps — werden serverseitig via
 *  resolveBoardSession() autoritativ neu berechnet (siehe applyBoardRage), niemals
 *  unvalidiert übernommen. */
export interface PlayerMove {
  boardSwaps: SwapMove[];
}

export function createInteractiveState(
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[],
  options: { seed?: number; roundLimit?: number; waves?: { healShare: number; roundsPerWave: number } } = {}
): InteractiveBattleState {
  const seed = options.seed ?? randomSeed();
  const rng = createRng(seed);
  const unitsA = createTeamState(teamA, "A");
  const unitsB = createTeamState(teamB, "B");
  const allUnits = [...unitsA, ...unitsB];
  const log: BattleLogEntry[] = [];

  log.push({ type: "battleStart", teamA: unitsA.map((u) => u.instanceId), teamB: unitsB.map((u) => u.instanceId) });
  triggerPassivesForAll("battleStart", allUnits, rng, 0, log);

  const initialBoard = pickPlayableBoard(rng);

  return {
    seed,
    rngState: rng.getState(),
    round: 0,
    roundLimit: options.waves?.roundsPerWave ?? options.roundLimit ?? ROUND_LIMIT,
    unitsA,
    unitsB,
    log,
    order: [],
    orderIndex: 0,
    winner: checkWinner(unitsA, unitsB),
    awaitingUnitId: null,
    boardGrid: initialBoard.grid,
    boardSpecials: initialBoard.specials,
    boardRngState: initialBoard.rngState,
    pendingBoard: null,
    matchedGems: { TANK: 0, DAMAGE_DEALER: 0, SUPPORT: 0 },
    ...(options.waves ? { waveMode: { wave: 1, healShare: options.waves.healShare, roundsPerWave: options.waves.roundsPerWave, queued: null } } : {}),
  };
}

/** Wellenmodus: Hat der Spieler alle Gegner besiegt, ersetzt das vorbereitete Team die gefallenen, lebende
 *  Helden werden etwas geheilt und der Sudden-Death-Zähler beginnt neu. `allUnits` wird an Ort und Stelle
 *  ersetzt (die Schritt-Funktionen halten dieselbe Liste). false = kein Wellenmodus oder keine nächste Welle
 *  vorbereitet — dann gilt der Sieg als Kampfende. */
function spawnNextWave(
  state: InteractiveBattleState,
  allUnits: BattleUnitState[],
  rng: ReturnType<typeof createRng>
): boolean {
  const wm = state.waveMode;
  if (!wm || !wm.queued || wm.queued.length === 0) return false;

  wm.wave += 1;
  const fresh = wm.queued.map((def, index) => createBattleUnitState(def, "B", `B${wm.wave}-${index}-${def.cardId}`));
  wm.queued = null;

  for (const unit of state.unitsA) {
    if (!unit.isAlive) continue;
    const amount = Math.min(unit.maxHp - unit.currentHp, Math.round(unit.maxHp * wm.healShare));
    if (amount <= 0) continue;
    unit.currentHp += amount;
    state.log.push({ type: "heal", round: state.round, sourceId: unit.instanceId, targetId: unit.instanceId, amount, newHp: unit.currentHp });
  }

  state.unitsB = fresh;
  allUnits.splice(0, allUnits.length, ...state.unitsA, ...state.unitsB);
  state.log.push({ type: "waveStart", round: state.round, wave: wm.wave });
  for (const unit of fresh) triggerPassiveForUnit("battleStart", unit, allUnits, rng, state.round, state.log);

  state.roundLimit = state.round + wm.roundsPerWave;
  // Die laufende Runde endet; die neuen Gegner steigen mit der nächsten Initiative-Reihenfolge ein.
  state.orderIndex = Math.max(state.orderIndex, state.order.length);
  return true;
}

/** Zieht ein neues, garantiert spielbares Brett (mindestens ein Swap ergäbe ein
 *  Match) — `generateBoard` vermeidet nur bereits vorhandene 3er-Reihen im
 *  Ausgangs-Grid, schließt einen (extrem seltenen) Deadlock aber nicht
 *  grundsätzlich aus, daher die Wiederholungsschleife mit Sicherheitsnetz. Ein
 *  frisches Brett hat nie Sonder-Steine (die entstehen erst durch Matches). */
function pickPlayableBoard(rng: ReturnType<typeof createRng>): { grid: BoardGrid; specials: SpecialGrid; rngState: number } {
  let current = generateBoard(Math.floor(rng() * 0xffffffff));
  let guard = 0;
  while (!hasAnyValidMove(current.grid) && guard < 10) {
    current = generateBoard(Math.floor(rng() * 0xffffffff));
    guard++;
  }
  return current;
}

/** Ersetzt `state.boardGrid` nur, wenn darauf kein Zug mehr ein Match ergäbe
 *  (Deadlock) — der Normalfall lässt das persistente Brett unverändert, damit
 *  es über den gesamten Kampfverlauf bestehen bleibt. */
function regenerateBoardIfNeeded(state: InteractiveBattleState, rng: ReturnType<typeof createRng>): void {
  if (state.boardGrid && hasAnyValidMove(state.boardGrid)) return;
  const picked = pickPlayableBoard(rng);
  state.boardGrid = picked.grid;
  state.boardSpecials = picked.specials;
  state.boardRngState = picked.rngState;
}

type StepStatus = "continue" | "paused" | "finished";

/** Löst die vom Spieler eingereichten Swaps AUTORITATIV serverseitig gegen das
 *  bei der Pause generierte `state.pendingBoard` auf (siehe resolveBoardSession)
 *  und schreibt die daraus resultierende Rage den betroffenen eigenen Helden
 *  gut — der Client liefert nur die Swap-Sequenz, niemals eine fertige
 *  Rage-Zahl (Anti-Cheat). Ein Hard-Cap (MAX_BOARD_RAGE_PER_TURN) deckelt das
 *  Gesamtergebnis zusätzlich als Verteidigung gegen einen Replay-Bug. */
function applyBoardRage(
  state: InteractiveBattleState,
  allUnits: BattleUnitState[],
  teamId: TeamId,
  swaps: SwapMove[],
  rng: ReturnType<typeof createRng>
): void {
  const pending = state.pendingBoard;
  if (!pending) return;

  const result = resolveBoardSession(pending.grid, pending.specials, pending.rngState, swaps, BOARD_MOVE_BUDGET_PER_TURN);
  const log = state.log;

  // Das Brett bleibt über den gesamten Kampf bestehen (kein Neu-Ziehen pro Zug,
  // siehe boardGrid) — das Ergebnis dieser Zug-Session wird daher als neuer
  // persistenter Stand übernommen statt verworfen zu werden.
  state.boardGrid = result.finalGrid;
  state.boardSpecials = result.finalSpecials;
  state.boardRngState = result.finalRngState;
  state.lastBoardSteps = result.steps;

  if (teamId === PLAYER_TEAM) {
    const matched = (state.matchedGems ??= { TANK: 0, DAMAGE_DEALER: 0, SUPPORT: 0 });
    // Gezählt wird, was tatsächlich zerstört wurde (pro Stein), nicht die Gruppengrößen der Grants:
    // überlappende Gruppen (L-/T-Formen) und die stehenbleibende Zelle eines neuen Sonder-Steins würden
    // sonst doppelt bzw. zu viel zählen.
    for (const step of result.steps) {
      for (const symbol of step.matchedClasses) matched[symbol] += 1;
    }
  }

  let grants = result.rageGrants;
  if (result.totalRageGranted > MAX_BOARD_RAGE_PER_TURN && result.totalRageGranted > 0) {
    const scale = MAX_BOARD_RAGE_PER_TURN / result.totalRageGranted;
    grants = grants.map((g) => ({ ...g, amount: Math.floor(g.amount * scale) }));
  }

  const teamUnits = allUnits.filter((u) => u.teamId === teamId && u.isAlive);
  for (const grant of grants) {
    if (grant.amount <= 0) continue;
    const recipients =
      grant.targetClass === "ALL" ? teamUnits : teamUnits.filter((u) => u.def.class === grant.targetClass);
    for (const unit of recipients) {
      grantRage(unit, grant.amount, state.round, log, "boardMatch");
    }
  }

  // Jedes einzelne Match/jede Kaskade einer Klasse löst zusätzlich einen echten
  // Normalangriff der lebenden Helden dieser Klasse aus (Empires&Puzzles-artig,
  // nicht nur Rage) — Grundlage ist die UNGEMERGTE rawGrants-Liste (ein Eintrag
  // pro Match-/Kaskaden-Ereignis), nicht die oben gemergte/gedeckelte Rage-Summe:
  // jedes Ereignis löst seinen eigenen Angriff aus. Schaden/Heilung skalieren
  // über den bestehenden suddenDeathMultiplier-Kanal mit der Gruppengröße
  // (mehr zerstörte Steine in einem Match = stärkerer Angriff). Der "ALL"-
  // Community-Bonus (5er-Match) ist kein klassenspezifisches Match und löst
  // daher selbst keinen Angriff aus.
  // Position zählt (Empires-&-Puzzles-Stil): jede zerstörte Zelle trifft den
  // Gegner, der über ihrer Spalte steht (siehe pickEnemyForColumn — die Slots
  // sind die Team-Positionen inkl. Toter, die UI richtet die Gegnerkarten mit
  // derselben Regel über dem Brett aus). Ein Match über mehrere Gegner-Slots
  // verteilt den Gesamtschaden anteilig nach Steinen je Gegner (Summe = wie
  // bisher max(1, tileCount/3)), pro getroffenem Gegner läuft ein eigener
  // Normalangriff — `forcedTargetId` lenkt Einzelziel-Angriffe auf ihn (AoE-
  // Normalangriffe/Heilungen bleiben unberührt).
  const enemyUnits = allUnits.filter((u) => u.teamId !== teamId);
  for (const grant of result.rawGrants) {
    if (grant.targetClass === "ALL" || !grant.tileCount || !grant.cells) continue;
    const attackers = teamUnits.filter((u) => u.def.class === grant.targetClass && u.isAlive);
    if (attackers.length === 0) continue;

    const tilesPerEnemy = new Map<number, number>();
    const alive = enemyUnits.map((u) => u.isAlive);
    for (const cell of grant.cells) {
      const slot = pickEnemyForColumn(cell % BOARD_COLS, alive);
      if (slot >= 0) tilesPerEnemy.set(slot, (tilesPerEnemy.get(slot) ?? 0) + 1);
    }
    if (tilesPerEnemy.size === 0) continue;

    const totalScale = Math.max(1, grant.tileCount / 3);
    for (const [slot, tiles] of [...tilesPerEnemy].sort((a, b) => a[0] - b[0])) {
      const matchScale = (totalScale * tiles) / grant.tileCount;
      // Nur echte Match-Boni (>3 zerstörte Steine) werden der UI als solche
      // gemeldet — ein exaktes 3er-Match (Skalierung genau 1) ist der Normalfall
      // und bekommt keinen "Bonus"-Hinweis.
      const matchBonusPercent = matchScale > 1 ? Math.round((matchScale - 1) * 100) : undefined;
      const forcedTargetId = enemyUnits[slot].instanceId;
      for (const unit of attackers) {
        if (!unit.isAlive) continue;
        const before = log.length;
        performAction(unit, "normalAttack", allUnits, rng, state.round, log, matchScale, forcedTargetId, matchBonusPercent);

        const dealtDamageTo = new Set<string>();
        for (let i = before; i < log.length; i++) {
          const entry = log[i];
          if (entry.type === "damage" && entry.sourceId === unit.instanceId) dealtDamageTo.add(entry.targetId);
        }
        if (dealtDamageTo.size > 0) {
          triggerPassiveForUnit("onDealDamage", unit, allUnits, rng, state.round, log);
          for (const targetId of dealtDamageTo) {
            const target = allUnits.find((u) => u.instanceId === targetId);
            if (target) triggerPassiveForUnit("onTakeDamage", target, allUnits, rng, state.round, log);
          }
        }
      }
    }
  }
}

/** In der ersten Runde macht immer der Spieler den ersten Zug: sein schnellster Held rückt an
 *  den Anfang, alle anderen behalten ihre Reihenfolge. Sonst könnten schnelle Gegner Helden
 *  ausschalten, bevor der Spieler das Brett überhaupt berührt hat. */
export function playerFirstInOpeningRound<T extends { teamId: TeamId }>(order: T[], round: number): T[] {
  if (round !== 1) return order;
  const index = order.findIndex((u) => u.teamId === PLAYER_TEAM);
  if (index <= 0) return order;
  return [order[index], ...order.slice(0, index), ...order.slice(index + 1)];
}

/** Führt genau eine atomare Schrittigkeit aus (ein Sub-Schritt der Kampfschleife
 *  aus runBattle) und mutiert `state`/die Unit-Objekte in `allUnits` direkt. */
function stepOnce(
  state: InteractiveBattleState,
  rng: ReturnType<typeof createRng>,
  allUnits: BattleUnitState[],
  playerMove?: PlayerMove
): StepStatus {
  const log = state.log;
  const findUnit = (id: string) => allUnits.find((u) => u.instanceId === id);

  function suddenDeathMultiplier(): number {
    const suddenDeathRounds = Math.max(0, state.round - state.roundLimit);
    return 1 + suddenDeathRounds * SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP;
  }

  function executeUnitAction(unit: BattleUnitState, actionType: ActionType) {
    const before = log.length;
    performAction(unit, actionType, allUnits, rng, state.round, log, suddenDeathMultiplier());
    grantRage(unit, RAGE_PER_ACTION, state.round, log, "action");

    const dealtDamageTo = new Set<string>();
    for (let i = before; i < log.length; i++) {
      const entry = log[i];
      if (entry.type === "damage" && entry.sourceId === unit.instanceId) dealtDamageTo.add(entry.targetId);
    }
    if (dealtDamageTo.size > 0) {
      triggerPassiveForUnit("onDealDamage", unit, allUnits, rng, state.round, log);
      for (const targetId of dealtDamageTo) {
        const target = findUnit(targetId);
        if (target) triggerPassiveForUnit("onTakeDamage", target, allUnits, rng, state.round, log);
      }
    }
    triggerPassiveForUnit("turnEnd", unit, allUnits, rng, state.round, log);
  }

  function finishIfDecided(): StepStatus {
    state.winner = checkWinner(state.unitsA, state.unitsB);
    if (state.winner === "A" && spawnNextWave(state, allUnits, rng)) {
      state.winner = null;
      return "continue";
    }
    if (state.winner) {
      log.push({ type: "battleEnd", winner: state.winner, round: state.round });
      return "finished";
    }
    return "continue";
  }

  if (state.winner) return "finished";

  // Fortsetzen: Brett-Zug für die zuvor pausierte Spieler-Einheit anwenden. Der Zug
  // selbst "verstreicht" nur noch (Reihenfolge weiterschalten) — die Angriffe sind
  // bereits während der Board-Auswertung gelaufen (siehe applyBoardRage).
  if (state.awaitingUnitId) {
    const unit = findUnit(state.awaitingUnitId);
    if (!unit) {
      state.awaitingUnitId = null;
      return "continue";
    }
    if (!playerMove) return "paused"; // reines Polling, kein Zug mitgeschickt

    applyBoardRage(state, allUnits, unit.teamId, playerMove.boardSwaps, rng);
    state.pendingBoard = null;
    state.awaitingUnitId = null;
    state.orderIndex += 1;
    return finishIfDecided();
  }

  // Runden-Ende / Runden-Start.
  if (state.round === 0 || state.orderIndex >= state.order.length) {
    if (state.round > 0) {
      for (const unit of allUnits) {
        if (!unit.isAlive) continue;
        grantRage(unit, RAGE_PER_ROUND_END, state.round, log, "roundEnd");
        tickStatModifierDurations(unit);
      }
      triggerPassivesForAll("roundEnd", allUnits, rng, state.round, log);
      log.push({ type: "roundEnd", round: state.round });
      if (finishIfDecided() === "finished") return "finished";
    }

    state.round += 1;
    log.push({ type: "roundStart", round: state.round });
    const suddenDeathRounds = Math.max(0, state.round - state.roundLimit);
    if (suddenDeathRounds === 1) log.push({ type: "suddenDeathStart", round: state.round });
    state.order = playerFirstInOpeningRound(computeInitiativeOrder(allUnits), state.round).map((u) => u.instanceId);
    state.orderIndex = 0;
    return "continue";
  }

  // Nächste Einheit in der Zugreihenfolge.
  const unitId = state.order[state.orderIndex];
  const unit = findUnit(unitId);
  if (!unit || !unit.isAlive) {
    state.orderIndex += 1;
    return "continue";
  }

  log.push({ type: "turnStart", round: state.round, unitId: unit.instanceId });
  triggerPassiveForUnit("turnStart", unit, allUnits, rng, state.round, log);
  if (!unit.isAlive) {
    state.orderIndex += 1;
    return "continue";
  }

  if (unit.teamId === PLAYER_TEAM) {
    // Spieler-Zug: auf einen Brett-Zug warten. Kein Zug-Timeout — das Brett braucht
    // echte Zeit zum Lösen. Das persistente Brett wird nur bei einem echten Deadlock
    // ersetzt (siehe regenerateBoardIfNeeded).
    state.awaitingUnitId = unit.instanceId;
    regenerateBoardIfNeeded(state, rng);
    state.pendingBoard = {
      grid: state.boardGrid as BoardGrid,
      specials: state.boardSpecials as SpecialGrid,
      rngState: state.boardRngState,
      appliedSwaps: [],
    };
    return "paused";
  }

  executeUnitAction(unit, defaultDecideAction(unit));
  state.orderIndex += 1;
  return finishIfDecided();
}

/** Führt den Kampf so lange automatisch fort (Monster-Züge, Runden-Wechsel), bis
 *  entweder eine Spieler-Einheit an der Reihe ist (pendingDecision gesetzt) oder der
 *  Kampf endet. `playerMove` wird — falls vorhanden — nur EINMAL auf die zuvor
 *  pausierte Einheit angewendet (siehe awaitingUnitId), niemals auf spätere Einheiten. */
export function advance(state: InteractiveBattleState, playerMove?: PlayerMove): AdvanceResult {
  if (playerMove) state.lastBoardSteps = undefined;
  const rng = createRng(state.rngState);
  const allUnits = [...state.unitsA, ...state.unitsB];

  let status: StepStatus = "continue";
  let first = true;
  // Sicherheitsnetz gegen eine Endlosschleife bei einem Engine-Bug — ein realer
  // Kampf braucht bei Weitem nicht so viele Sub-Schritte.
  let guard = 0;
  while (status === "continue" && guard < 5000) {
    status = stepOnce(state, rng, allUnits, first ? playerMove : undefined);
    first = false;
    guard += 1;
  }

  state.rngState = rng.getState();

  return { state, pendingDecision: describeCurrentDecision(state) };
}

/** Rein lesend: beschreibt den aktuell offenen Spieler-Zug (falls vorhanden), OHNE
 *  den Kampf fortzusetzen — für Snapshot-Lesezugriffe (Polling). */
export function describeCurrentDecision(state: InteractiveBattleState): PendingDecision | null {
  if (state.winner || !state.awaitingUnitId) return null;
  const unit = [...state.unitsA, ...state.unitsB].find((u) => u.instanceId === state.awaitingUnitId);
  if (!unit) return null;

  const board = state.pendingBoard
    ? {
        grid: state.pendingBoard.grid,
        specials: state.pendingBoard.specials,
        moveBudget: BOARD_MOVE_BUDGET_PER_TURN,
        appliedSwaps: state.pendingBoard.appliedSwaps,
      }
    : null;

  return { unitId: unit.instanceId, teamId: unit.teamId, board };
}

/** Aktualisiert den bislang bestätigten Fortschritt der laufenden Match-3-
 *  Mini-Session (siehe pendingBoard.appliedSwaps) — eine leichte Zustands-
 *  Änderung ohne Turn-Order-Auswirkung, NICHT über advance()/stepOnce()
 *  laufend: es wird weder Rage vergeben noch angegriffen, das passiert
 *  ausschließlich beim eigentlichen Zug-Abschluss (siehe applyBoardRage).
 *  Gibt zurück, ob die Aktualisierung angewendet wurde (false z.B., wenn
 *  gerade kein Brett-Zug aussteht oder das Zug-Budget überschritten wäre). */
export function recordBoardProgress(state: InteractiveBattleState, swaps: SwapMove[]): boolean {
  if (!state.pendingBoard) return false;
  if (swaps.length > BOARD_MOVE_BUDGET_PER_TURN) return false;
  state.pendingBoard.appliedSwaps = swaps;
  return true;
}

/** Nächste bis zu `count` Einheiten in der Zugreihenfolge — für die "Als nächstes
 *  dran"-Anzeige. Reicht der Rest der laufenden Runde nicht aus, wird die
 *  Reihenfolge der Folgerunde anhand der AKTUELLEN Speed-Werte projiziert
 *  (kann sich noch ändern, falls bis dahin Speed-Buffs/-Debuffs greifen). Die
 *  gerade aktiv entscheidende Einheit (awaitingUnitId) wird übersprungen. */
export function previewUpcomingTurns(state: InteractiveBattleState, count = 5): string[] {
  const allUnits = [...state.unitsA, ...state.unitsB];
  const findUnit = (id: string) => allUnits.find((u) => u.instanceId === id);
  const result: string[] = [];

  const startIndex = state.orderIndex + (state.awaitingUnitId ? 1 : 0);
  for (let i = startIndex; i < state.order.length && result.length < count; i++) {
    const unit = findUnit(state.order[i]);
    if (unit?.isAlive) result.push(unit.instanceId);
  }

  if (result.length < count && !state.winner) {
    const projected = computeInitiativeOrder(allUnits).map((u) => u.instanceId);
    for (const id of projected) {
      if (result.length >= count) break;
      result.push(id);
    }
  }

  return result;
}

export interface UltimateInterruptResult {
  state: InteractiveBattleState;
  pendingDecision: PendingDecision | null;
  /** false, wenn das Ultimate NICHT ausgelöst wurde (Einheit tot/unbekannt,
   *  keine Spieler-Einheit, oder Rage unter den Kosten) — der Aufrufer soll das
   *  dem Spieler dann als Fehler melden, statt es still zu ignorieren. */
  applied: boolean;
}

/** Löst ein Ultimate SOFORT aus, unabhängig von der Zugreihenfolge (Empires-&-
 *  Puzzles-Stil: voller Rage-Balken → per Kartenklick jederzeit auslösbar). Die
 *  Zugreihenfolge (orderIndex/awaitingUnitId) und ein offenes Brett bleiben
 *  unangetastet — auch wenn genau diese Einheit gerade am Zug ist, bleibt ihr
 *  Brett-Zug danach weiter offen. */
export function applyUltimateInterrupt(
  state: InteractiveBattleState,
  casterId: string,
  targetId?: string
): UltimateInterruptResult {
  const allUnits = [...state.unitsA, ...state.unitsB];
  const caster = allUnits.find((u) => u.instanceId === casterId);

  if (state.winner || !caster || !caster.isAlive || caster.teamId !== PLAYER_TEAM) {
    return { state, pendingDecision: describeCurrentDecision(state), applied: false };
  }

  const ultimateCost = caster.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST;
  if (caster.rage < ultimateCost) {
    return { state, pendingDecision: describeCurrentDecision(state), applied: false };
  }

  const rng = createRng(state.rngState);
  const suddenDeathRounds = Math.max(0, state.round - state.roundLimit);
  const suddenDeathMultiplier = 1 + suddenDeathRounds * SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP;

  performAction(
    caster,
    "ultimate",
    allUnits,
    rng,
    state.round,
    state.log,
    suddenDeathMultiplier,
    targetId,
    undefined,
    PLAYER_ULTIMATE_MAX_HP_SHARE
  );
  state.winner = checkWinner(state.unitsA, state.unitsB);
  if (state.winner === "A" && spawnNextWave(state, allUnits, rng)) state.winner = null;
  state.rngState = rng.getState();
  if (state.winner) {
    state.log.push({ type: "battleEnd", winner: state.winner, round: state.round });
  }

  return { state, pendingDecision: describeCurrentDecision(state), applied: true };
}
