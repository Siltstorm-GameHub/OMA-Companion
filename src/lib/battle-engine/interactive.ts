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

import {
  RAGE_PER_ACTION,
  RAGE_PER_ROUND_END,
  ROUND_LIMIT,
  SUDDEN_DEATH_DAMAGE_MULTIPLIER_STEP,
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
}

export interface PendingDecision {
  unitId: string;
  teamId: TeamId;
  actions: AvailableAction[];
  candidateTargetsByAction: Partial<Record<ActionType, string[]>>;
}

export interface AdvanceResult {
  state: InteractiveBattleState;
  pendingDecision: PendingDecision | null;
}

export interface PlayerDecision {
  actionType: ActionType;
  targetId?: string;
}

export function createInteractiveState(
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[],
  controllers: { A: Controller; B: Controller },
  options: { seed?: number; roundLimit?: number } = {}
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
  };
}

type StepStatus = "continue" | "paused" | "finished";

function isAutoForTeam(state: InteractiveBattleState, teamId: TeamId): boolean {
  return teamId === "A" ? state.autoA : state.autoB;
}

/** Führt genau eine atomare Schrittigkeit aus (ein Sub-Schritt der Kampfschleife
 *  aus runBattle) und mutiert `state`/die Unit-Objekte in `allUnits` direkt. */
function stepOnce(
  state: InteractiveBattleState,
  rng: ReturnType<typeof createRng>,
  allUnits: BattleUnitState[],
  playerDecision?: PlayerDecision
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
    // Spieler entscheidet sich um, statt selbst zu wählen) — dann übernimmt die
    // KI-Logik genau diese eine noch offene Entscheidung mit.
    let decision = playerDecision;
    if (!decision) {
      if (isAutoForTeam(state, unit.teamId)) {
        decision = { actionType: defaultDecideAction(unit) };
      } else {
        return "paused"; // reines Polling, keine Entscheidung mitgeschickt
      }
    }
    executeUnitAction(unit, decision.actionType, decision.targetId);
    state.awaitingUnitId = null;
    state.orderIndex += 1;
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
    return "paused";
  }

  executeUnitAction(unit, defaultDecideAction(unit), undefined);
  state.orderIndex += 1;
  state.winner = checkWinner(state.unitsA, state.unitsB);
  if (state.winner) {
    log.push({ type: "battleEnd", winner: state.winner, round: state.round });
    return "finished";
  }
  return "continue";
}

/** Führt den Kampf so lange automatisch fort, bis entweder eine menschliche
 *  Einheit an der Reihe ist (pendingDecision gesetzt) oder der Kampf endet.
 *  `playerDecision` wird — falls vorhanden — nur EINMAL auf die zuvor
 *  pausierte Einheit angewendet (siehe awaitingUnitId), niemals auf spätere Einheiten. */
export function advance(state: InteractiveBattleState, playerDecision?: PlayerDecision): AdvanceResult {
  const rng = createRng(state.rngState);
  const allUnits = [...state.unitsA, ...state.unitsB];

  let status: StepStatus = "continue";
  let first = true;
  // Sicherheitsnetz gegen eine Endlosschleife bei einem Engine-Bug — ein realer
  // Kampf braucht bei Weitem nicht so viele Sub-Schritte.
  let guard = 0;
  while (status === "continue" && guard < 5000) {
    status = stepOnce(state, rng, allUnits, first ? playerDecision : undefined);
    first = false;
    guard += 1;
  }

  state.rngState = rng.getState();

  return { state, pendingDecision: describeCurrentDecision(state) };
}

/** Rein lesend: beschreibt die aktuell offene Entscheidung (falls vorhanden), OHNE
 *  den Kampf fortzusetzen — für Snapshot-Lesezugriffe (Polling), die den
 *  persistierten Zustand nicht verändern dürfen. Jeder persistierte Zustand ist
 *  per Konstruktion entweder beendet (winner gesetzt) oder wartet auf genau eine
 *  Einheit (awaitingUnitId gesetzt) — hier wird nur diese Invariante ausgelesen. */
export function describeCurrentDecision(state: InteractiveBattleState): PendingDecision | null {
  if (state.winner || !state.awaitingUnitId) return null;
  const allUnits = [...state.unitsA, ...state.unitsB];
  const unit = allUnits.find((u) => u.instanceId === state.awaitingUnitId);
  if (!unit) return null;

  const actions = describeAvailableActions(unit);
  const candidateTargetsByAction: Partial<Record<ActionType, string[]>> = {};
  for (const a of actions) {
    if (a.targetKind !== "none") {
      candidateTargetsByAction[a.actionType] = candidateTargetIds(unit, a.targetKind, allUnits);
    }
  }
  return { unitId: unit.instanceId, teamId: unit.teamId, actions, candidateTargetsByAction };
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
