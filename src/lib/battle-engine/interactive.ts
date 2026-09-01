// ============================================
// Battle-Engine — Interaktiver, pausierbarer Kampf-Stepper
// ============================================
// Ergänzt runBattle() (ein Aufruf = kompletter Kampf) um eine Variante, die
// bei jeder menschlich gesteuerten Einheit anhält und auf eine Spieler-
// Entscheidung (Aktion + ggf. Ziel) wartet, statt automatisch zu entscheiden.
// Der komplette Zustand ist JSON-serialisierbar (siehe InteractiveBattleState)
// — eine Anfrage pro Zug, dazwischen liegt der Zustand in der DB
// (LiveBattle.stateJson, siehe lib/battle-cards/live-battle.ts).
//
// KI-gesteuerte Seiten (NPC in PVE, oder eine per Auto-Kampf freigegebene
// Seite) entscheiden weiterhin automatisch über defaultDecideAction() +
// die eingebauten Zielregeln — exakt wie runBattle() bisher.

import { generateBoard, resolveBoardSession, type BoardGrid, type SwapMove } from "./board-match3";
import {
  BOARD_MOVE_BUDGET_PER_TURN,
  MAX_BOARD_RAGE_PER_TURN,
  RAGE_PER_ACTION,
  RAGE_PER_ROUND_END,
  ROUND_LIMIT,
  SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP,
  TURN_DECISION_TIMEOUT_MS,
  ULTIMATE_SKILL_COST,
} from "./constants";
import { candidateTargetIds, describeAvailableActions, type AvailableAction } from "./decision";
import { tickStatModifierDurations } from "./effects";
import { checkWinner, defaultDecideAction, grantRage, performAction } from "./engine";
import { computeInitiativeOrder } from "./initiative";
import { triggerPassiveForUnit, triggerPassivesForAll } from "./passives";
import { createRng, randomSeed } from "./rng";
import { createTeamState } from "./stats";
import type {
  ActionType,
  BattleLogEntry,
  BattleUnitDefinition,
  BattleUnitState,
  BattleWinner,
  TeamId,
} from "./types";

export type Controller = "human" | "ai";

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
  controllers: { A: Controller; B: Controller };
  /** Seite hat "Auto-Kampf" aktiviert — Entscheidungen laufen wie bei einer KI-Seite automatisch. */
  autoA: boolean;
  autoB: boolean;
  /** Gesetzt, sobald turnStart für diese Einheit bereits geloggt wurde und auf eine
   *  menschliche Entscheidung gewartet wird — verhindert doppeltes turnStart beim Fortsetzen. */
  awaitingUnitId: string | null;
  /** Epoch-ms, ab dem die KI-Logik automatisch für die wartende Einheit entscheidet,
   *  falls bis dahin keine Spieler-Entscheidung eingetroffen ist. Nur relevant,
   *  solange awaitingUnitId gesetzt ist. */
  turnDeadline: number | null;
  /** Anzahl der Züge in Folge, die diese Seite per Timeout (nicht per Auto-Kampf)
   *  verpasst hat — wird bei einer echten Spieler-Entscheidung zurückgesetzt. Ab
   *  TIMEOUT_STREAK_AUTO_THRESHOLD aufeinanderfolgenden Timeouts wird Auto-Kampf
   *  für diese Seite automatisch aktiviert (siehe stepOnce). */
  timeoutStreakA: number;
  timeoutStreakB: number;
  /** Puzzle-PvE-Modus ("Edelstein-Kampf", siehe board-match3.ts): zeigt bei
   *  jedem menschlichen Zug zusätzlich ein Match-3-Brett, dessen Matches Rage
   *  erzeugen, statt dass Rage rein automatisch steigt. Bei false (Standard-
   *  Auto-Kampf-Modi, PvP) bleibt das gesamte Board-Verhalten inaktiv. */
  boardMode: boolean;
  /** Das für den GERADE wartenden menschlichen Zug generierte Brett — wird beim
   *  Pausieren erzeugt und beim Verarbeiten der Entscheidung wieder geleert.
   *  Kein Fortschritt einer laufenden Mini-Session wird darüber hinaus
   *  persistiert (siehe Plan: Reload verliert den Board-Fortschritt des Zugs). */
  pendingBoard: { grid: BoardGrid; rngState: number } | null;
}

/** Nach so vielen aufeinanderfolgenden verpassten Zügen (Zug-Timeout, siehe
 *  TURN_DECISION_TIMEOUT_MS) wird Auto-Kampf automatisch für die betroffene
 *  Seite aktiviert. */
export const TIMEOUT_STREAK_AUTO_THRESHOLD = 3;

export interface PendingDecision {
  unitId: string;
  teamId: TeamId;
  actions: AvailableAction[];
  candidateTargetsByAction: Partial<Record<ActionType, string[]>>;
  /** Nur gesetzt, wenn boardMode aktiv ist — das initiale Grid für die
   *  Match-3-Mini-Session dieses Zugs (siehe board-match3.ts). */
  board: { grid: BoardGrid; moveBudget: number } | null;
}

export interface AdvanceResult {
  state: InteractiveBattleState;
  pendingDecision: PendingDecision | null;
}

export interface PlayerDecision {
  actionType: ActionType;
  targetId?: string;
  /** Nur bei boardMode: die vom Spieler in der Mini-Session gemachten Swaps —
   *  wird serverseitig via resolveBoardSession() autoritativ neu berechnet
   *  (siehe applyBoardRage), niemals unvalidiert übernommen. */
  boardSwaps?: SwapMove[];
}

export function createInteractiveState(
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[],
  controllers: { A: Controller; B: Controller },
  options: { seed?: number; roundLimit?: number; boardMode?: boolean } = {}
): InteractiveBattleState {
  const seed = options.seed ?? randomSeed();
  const rng = createRng(seed);
  const unitsA = createTeamState(teamA, "A");
  const unitsB = createTeamState(teamB, "B");
  const allUnits = [...unitsA, ...unitsB];
  const log: BattleLogEntry[] = [];

  log.push({ type: "battleStart", teamA: unitsA.map((u) => u.instanceId), teamB: unitsB.map((u) => u.instanceId) });
  triggerPassivesForAll("battleStart", allUnits, rng, 0, log);

  return {
    seed,
    rngState: rng.getState(),
    round: 0,
    roundLimit: options.roundLimit ?? ROUND_LIMIT,
    unitsA,
    unitsB,
    log,
    order: [],
    orderIndex: 0,
    winner: checkWinner(unitsA, unitsB),
    controllers,
    autoA: false,
    autoB: false,
    awaitingUnitId: null,
    turnDeadline: null,
    timeoutStreakA: 0,
    timeoutStreakB: 0,
    boardMode: options.boardMode ?? false,
    pendingBoard: null,
  };
}

type StepStatus = "continue" | "paused" | "finished";

function isAutoForTeam(state: InteractiveBattleState, teamId: TeamId): boolean {
  return teamId === "A" ? state.autoA : state.autoB;
}

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
  swaps: SwapMove[]
): void {
  const pending = state.pendingBoard;
  if (!pending) return;

  const result = resolveBoardSession(pending.grid, pending.rngState, swaps, BOARD_MOVE_BUDGET_PER_TURN);

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
      grantRage(unit, grant.amount, state.round, state.log, "boardMatch");
    }
  }
}

/** Führt genau eine atomare Schrittigkeit aus (ein Sub-Schritt der Kampfschleife
 *  aus runBattle) und mutiert `state`/die Unit-Objekte in `allUnits` direkt.
 *  `autoActionCounter`, falls übergeben, wird bei jeder tatsächlich ausgeführten
 *  Zug-Entscheidung hochgezählt — Grundlage für die Drosselung in advance(). */
function stepOnce(
  state: InteractiveBattleState,
  rng: ReturnType<typeof createRng>,
  allUnits: BattleUnitState[],
  playerDecision?: PlayerDecision,
  autoActionCounter?: { count: number }
): StepStatus {
  const log = state.log;
  const findUnit = (id: string) => allUnits.find((u) => u.instanceId === id);

  function suddenDeathMultiplier(): number {
    const suddenDeathRounds = Math.max(0, state.round - state.roundLimit);
    return 1 + suddenDeathRounds * SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP;
  }

  function executeUnitAction(unit: BattleUnitState, actionType: ActionType, targetId?: string) {
    const before = log.length;
    performAction(unit, actionType, allUnits, rng, state.round, log, suddenDeathMultiplier(), targetId);
    grantRage(unit, RAGE_PER_ACTION, state.round, log, "action");

    const dealtDamageTo = new Set<string>();
    for (let i = before; i < log.length; i++) {
      const entry = log[i];
      if (entry.type === "damage" && entry.sourceId === unit.instanceId) dealtDamageTo.add(entry.targetId);
    }
    if (dealtDamageTo.size > 0) {
      triggerPassiveForUnit("onDealDamage", unit, allUnits, rng, state.round, log);
      for (const targetId2 of dealtDamageTo) {
        const target = findUnit(targetId2);
        if (target) triggerPassiveForUnit("onTakeDamage", target, allUnits, rng, state.round, log);
      }
    }
    triggerPassiveForUnit("turnEnd", unit, allUnits, rng, state.round, log);
  }

  if (state.winner) return "finished";

  // Fortsetzen: Entscheidung für die zuvor pausierte Einheit anwenden.
  if (state.awaitingUnitId) {
    const unit = findUnit(state.awaitingUnitId);
    if (!unit) {
      state.awaitingUnitId = null;
      return "continue";
    }
    // Auto-Kampf kann zwischen Pause und Fortsetzen aktiviert worden sein (der
    // Spieler entscheidet sich um, statt selbst zu wählen), ODER das Zug-Timeout
    // ist abgelaufen — in beiden Fällen übernimmt die KI-Logik genau diese eine
    // noch offene Entscheidung.
    const wasAlreadyAuto = isAutoForTeam(state, unit.teamId);
    let decision = playerDecision;
    let missedByTimeout = false;
    if (!decision) {
      const timedOut = state.turnDeadline !== null && Date.now() >= state.turnDeadline;
      if (wasAlreadyAuto || timedOut) {
        decision = { actionType: defaultDecideAction(unit) };
        missedByTimeout = timedOut && !wasAlreadyAuto;
      } else {
        return "paused"; // reines Polling, keine Entscheidung mitgeschickt, Timeout noch nicht erreicht
      }
    }

    // Nur bei einer echten Spieler-Entscheidung (nicht bei Auto-Kampf/Timeout)
    // wird das Board ausgewertet — die dabei erzeugte Rage landet VOR der
    // eigentlichen Aktion bei den betroffenen Helden (siehe applyBoardRage).
    if (playerDecision && state.boardMode) {
      applyBoardRage(state, allUnits, unit.teamId, playerDecision.boardSwaps ?? []);
    }
    state.pendingBoard = null;

    executeUnitAction(unit, decision.actionType, decision.targetId);
    autoActionCounter && autoActionCounter.count++;
    state.awaitingUnitId = null;
    state.turnDeadline = null;
    state.orderIndex += 1;

    // Timeout-Serie pflegen: eine echte Spieler-Entscheidung setzt sie zurück, ein
    // verpasster Zug zählt hoch — ab TIMEOUT_STREAK_AUTO_THRESHOLD in Folge wird
    // Auto-Kampf für diese Seite automatisch aktiviert.
    if (playerDecision) {
      if (unit.teamId === "A") state.timeoutStreakA = 0;
      else state.timeoutStreakB = 0;
    } else if (missedByTimeout) {
      if (unit.teamId === "A") {
        state.timeoutStreakA += 1;
        if (state.timeoutStreakA >= TIMEOUT_STREAK_AUTO_THRESHOLD) state.autoA = true;
      } else {
        state.timeoutStreakB += 1;
        if (state.timeoutStreakB >= TIMEOUT_STREAK_AUTO_THRESHOLD) state.autoB = true;
      }
    }
    state.winner = checkWinner(state.unitsA, state.unitsB);
    if (state.winner) {
      log.push({ type: "battleEnd", winner: state.winner, round: state.round });
      return "finished";
    }
    return "continue";
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
      state.winner = checkWinner(state.unitsA, state.unitsB);
      if (state.winner) {
        log.push({ type: "battleEnd", winner: state.winner, round: state.round });
        return "finished";
      }
    }

    state.round += 1;
    log.push({ type: "roundStart", round: state.round });
    const suddenDeathRounds = Math.max(0, state.round - state.roundLimit);
    if (suddenDeathRounds === 1) log.push({ type: "suddenDeathStart", round: state.round });
    state.order = computeInitiativeOrder(allUnits).map((u) => u.instanceId);
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

  const isHuman = state.controllers[unit.teamId] === "human" && !isAutoForTeam(state, unit.teamId);
  if (isHuman) {
    state.awaitingUnitId = unit.instanceId;
    state.turnDeadline = Date.now() + TURN_DECISION_TIMEOUT_MS;
    if (state.boardMode) {
      const boardSeed = Math.floor(rng() * 0xffffffff);
      state.pendingBoard = generateBoard(boardSeed);
    }
    return "paused";
  }

  executeUnitAction(unit, defaultDecideAction(unit), undefined);
  autoActionCounter && autoActionCounter.count++;
  state.orderIndex += 1;
  state.winner = checkWinner(state.unitsA, state.unitsB);
  if (state.winner) {
    log.push({ type: "battleEnd", winner: state.winner, round: state.round });
    return "finished";
  }
  return "continue";
}

/** Führt den Kampf so lange automatisch fort, bis entweder eine menschliche
 *  Einheit an der Reihe ist (pendingDecision gesetzt), der Kampf endet, oder —
 *  falls `maxAutoActions` gesetzt ist — so viele automatische Zug-Entscheidungen
 *  ausgeführt wurden. Letzteres drosselt den Fall, dass BEIDE Seiten Auto-Kampf
 *  aktiviert haben: ohne Drosselung würde die Engine sonst ohne jede Pause bis
 *  zum Kampfende durchlaufen (siehe live-battle.ts — dort nur für PVP gesetzt,
 *  damit die interessierten Spieler dem Kampf weiter zusehen können, statt dass
 *  er einfach fertig ist; bei PVE bleibt das bewusst ungedrosselt als
 *  Sofort-Auflösung). `playerDecision` wird — falls vorhanden — nur EINMAL auf
 *  die zuvor pausierte Einheit angewendet (siehe awaitingUnitId), niemals auf
 *  spätere Einheiten. */
export function advance(
  state: InteractiveBattleState,
  playerDecision?: PlayerDecision,
  options: { maxAutoActions?: number } = {}
): AdvanceResult {
  const rng = createRng(state.rngState);
  const allUnits = [...state.unitsA, ...state.unitsB];
  const autoActionCounter = { count: 0 };

  let status: StepStatus = "continue";
  let first = true;
  // Sicherheitsnetz gegen eine Endlosschleife bei einem Engine-Bug — ein realer
  // Kampf braucht bei Weitem nicht so viele Sub-Schritte.
  let guard = 0;
  while (status === "continue" && guard < 5000) {
    if (options.maxAutoActions !== undefined && autoActionCounter.count >= options.maxAutoActions) break;
    status = stepOnce(state, rng, allUnits, first ? playerDecision : undefined, autoActionCounter);
    first = false;
    guard += 1;
  }

  state.rngState = rng.getState();

  return { state, pendingDecision: describeCurrentDecision(state) };
}

/** Rein lesend: beschreibt die aktuell offene Entscheidung (falls vorhanden), OHNE
 *  den Kampf fortzusetzen — für Snapshot-Lesezugriffe (Polling), die den
 *  persistierten Zustand nicht verändern dürfen. Ein persistierter Zustand ist
 *  entweder beendet (winner gesetzt), wartet auf genau eine Einheit
 *  (awaitingUnitId gesetzt) — oder (nur bei per maxAutoActions gedrosseltem
 *  Auto-Kampf, siehe advance()) mitten in einem noch laufenden automatischen
 *  Durchlauf ohne aktuell wartende Einheit; für diesen dritten Fall liefert
 *  diese Funktion korrekt null zurück (Aufrufer muss dann per advance()
 *  weiter fortsetzen, siehe live-battle.ts). */
export function describeCurrentDecision(state: InteractiveBattleState): PendingDecision | null {
  if (state.winner || !state.awaitingUnitId) return null;
  const allUnits = [...state.unitsA, ...state.unitsB];
  const unit = allUnits.find((u) => u.instanceId === state.awaitingUnitId);
  if (!unit) return null;

  const actions = describeAvailableActions(unit, allUnits);
  const candidateTargetsByAction: Partial<Record<ActionType, string[]>> = {};
  for (const a of actions) {
    if (a.targetKind !== "none") {
      candidateTargetsByAction[a.actionType] = candidateTargetIds(unit, a.targetKind, allUnits);
    }
  }
  const board =
    state.boardMode && state.pendingBoard
      ? { grid: state.pendingBoard.grid, moveBudget: BOARD_MOVE_BUDGET_PER_TURN }
      : null;

  return { unitId: unit.instanceId, teamId: unit.teamId, actions, candidateTargetsByAction, board };
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
   *  nicht menschlich gesteuert, oder Rage unter den Kosten) — der Aufrufer
   *  soll das dem Spieler dann als Fehler melden, statt es still zu ignorieren. */
  applied: boolean;
}

/** Löst ein Ultimate SOFORT aus, unabhängig davon, ob `casterId` laut
 *  Zugreihenfolge gerade selbst am Zug ist (Empires-&-Puzzles-Stil: voller
 *  Rage-Balken → per Kartenklick jederzeit auslösbar). Zwei Fälle:
 *  - `casterId` ist die gerade wartende Einheit: läuft 1:1 wie eine normale
 *    Spieler-Entscheidung durch advance()/stepOnce() — orderIndex rückt vor.
 *  - `casterId` ist eine ANDERE eigene, lebende Einheit: echter Interrupt —
 *    die Zugreihenfolge (orderIndex/awaitingUnitId) bleibt unangetastet, die
 *    Einheit handelt "zwischendurch" und ist später an ihrem regulären Zug
 *    ganz normal wieder dran (dann ggf. mit niedrigerer Rage). */
export function applyUltimateInterrupt(
  state: InteractiveBattleState,
  casterId: string,
  targetId?: string
): UltimateInterruptResult {
  const allUnits = [...state.unitsA, ...state.unitsB];
  const caster = allUnits.find((u) => u.instanceId === casterId);

  if (state.winner || !caster || !caster.isAlive || state.controllers[caster.teamId] !== "human") {
    return { state, pendingDecision: describeCurrentDecision(state), applied: false };
  }

  const ultimateCost = caster.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST;
  if (caster.rage < ultimateCost) {
    return { state, pendingDecision: describeCurrentDecision(state), applied: false };
  }

  if (state.awaitingUnitId === casterId) {
    const result = advance(state, { actionType: "ultimate", targetId });
    return { ...result, applied: true };
  }

  const rng = createRng(state.rngState);
  const suddenDeathRounds = Math.max(0, state.round - state.roundLimit);
  const suddenDeathMultiplier = 1 + suddenDeathRounds * SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP;

  performAction(caster, "ultimate", allUnits, rng, state.round, state.log, suddenDeathMultiplier, targetId);
  state.rngState = rng.getState();

  state.winner = checkWinner(state.unitsA, state.unitsB);
  if (state.winner) {
    state.log.push({ type: "battleEnd", winner: state.winner, round: state.round });
  }

  return { state, pendingDecision: describeCurrentDecision(state), applied: true };
}
