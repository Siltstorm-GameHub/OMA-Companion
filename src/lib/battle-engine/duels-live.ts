// ============================================
// Battle-Engine — OMA Duels (Yu-Gi-Oh-artiges Live-PvP)
// ============================================
// Ersetzt den alten sequentiellen Duell-Modus (interactive.ts, Modi
// "PVP_CHALLENGE"/"PVP_MATCHMAKING"): Deck/Hand/Feld/Beschwörung statt
// "eine Einheit ist an der Reihe", simultane zeitlich begrenzte Runden statt
// striktem Zug-Alternieren (das würde das Warte-Problem reproduzieren, das
// dieser Modus eigentlich lösen soll).
//
// Reine Funktionen, keine DB-Abhängigkeit — analog zu interactive.ts/engine.ts.
// Der komplette Zustand ist JSON-serialisierbar (LiveDuelState), lebt in
// LiveBattle.stateJson (mode: "PVP_DUELS_LIVE").
//
// PVE/OMA-Gems (interactive.ts, board-match3.ts) sind NICHT betroffen — dieser
// Modus ersetzt ausschließlich die beiden alten PvP-Duell-Modi.

import { RAGE_PER_ACTION } from "./constants";
import {
  DUEL_BLOCK_DAMAGE_MULTIPLIER,
  DUEL_BLOCK_SUCCESS_RAGE_BONUS,
  DUEL_COMEBACK_RAGE_FACTOR,
  DUEL_DODGE_SUCCESS_RAGE_BONUS,
  DUEL_DRAW_PER_ROUND,
  DUEL_FIELD_SIZE,
  DUEL_HAND_CAP,
  DUEL_ROUND_TIMEOUT_MS,
  DUEL_START_HAND_SIZE,
  DUEL_START_LP,
} from "./duel-constants";
import { executeEffect } from "./effects";
import { grantRage, performAction } from "./engine";
import { createRng, randomSeed, type Rng } from "./rng";
import { createBattleUnitState } from "./stats";
import type { BattleLogEntry, BattleUnitDefinition, BattleUnitState, TacticCardDefinition, TeamId } from "./types";

export class DuelLiveError extends Error {}

export type DuelActionType = "normalAttack" | "block" | "dodge" | "active" | "ultimate";

export interface DuelFieldSlot {
  unit: BattleUnitState | null;
}

export interface DuelTrapInPlay {
  tacticCardId: string;
  slotIndex: number;
}

export interface DuelPlayerState {
  /** Einmalig bei Kampfstart aufgelöst (siehe createDuelState) — Card-ID → Definition. */
  unitDefsByCardId: Record<string, BattleUnitDefinition>;
  tacticDefsById: Record<string, TacticCardDefinition>;
  /** Gemischter Nachziehstapel (Einheiten- + Taktik-Karten-IDs gemischt). */
  deckCardIds: string[];
  handCardIds: string[];
  field: DuelFieldSlot[]; // fixed length DUEL_FIELD_SIZE
  setTraps: DuelTrapInPlay[];
  graveyardCardIds: string[];
  lifePoints: number;
}

export interface DuelRoundFieldAction {
  slotIndex: number;
  action: DuelActionType;
  /** Pflicht bei normalAttack/active/ultimate — gegnerischer Feld-Slot-Index
   *  (auch wenn dieser leer ist: dann Face-Damage). */
  targetSlotIndex?: number;
}

export interface DuelRoundSubmission {
  summon?: { handCardId: string; slotIndex: number };
  playTactic?: { handCardId: string; mode: "instant" | "setFaceDown"; slotIndex?: number };
  fieldActions: DuelRoundFieldAction[];
}

/** Erweitert die bestehenden BattleLogEntry-Varianten (damage/heal/death/
 *  rageChange/...) um Duels-spezifische Ereignisse — bewusst ein eigener Typ
 *  statt einer Erweiterung des gemeinsamen `BattleLogEntry`-Unions in
 *  types.ts, um die bestehenden exhaustiven Switches über Log-Einträge in
 *  LiveBattleView.tsx/battle-log.ts (alter Modus) nicht anzufassen. */
export type DuelLogEntry =
  | BattleLogEntry
  | { type: "duelStart"; round: number }
  | { type: "summon"; round: number; team: TeamId; slotIndex: number; unitId: string; cardId: string }
  | { type: "tacticPlayed"; round: number; team: TeamId; tacticCardId: string; mode: "instant" | "setFaceDown" }
  | { type: "trapTriggered"; round: number; team: TeamId; tacticCardId: string }
  | {
      type: "faceDamage";
      round: number;
      attackerUnitId: string;
      defendingTeam: TeamId;
      amount: number;
      remainingLp: number;
    };

export interface LiveDuelState {
  seed: number;
  rngState: number;
  round: number;
  playerA: DuelPlayerState;
  playerB: DuelPlayerState;
  pendingActions: { A: DuelRoundSubmission | null; B: DuelRoundSubmission | null };
  /** Epoch-ms — NUR hier in stateJson, kein eigenes DB-Feld (siehe
   *  getLiveBattleSnapshot/turnDeadline-Vorbild in interactive.ts/live-battle.ts:
   *  Timeout wird lazy beim nächsten Poll geprüft, kein Sweep-Job nötig). */
  roundDeadline: number;
  log: DuelLogEntry[];
  winner: TeamId | "DRAW" | null;
  timeoutStreakA: number;
  timeoutStreakB: number;
}

export interface DuelDeckInput {
  unitDefs: Record<string, BattleUnitDefinition>;
  tacticDefs: Record<string, TacticCardDefinition>;
  /** Alle Karten-IDs des Decks (Einheiten- + Taktik-Karten gemischt), noch ungemischt. */
  cardIds: string[];
}

// ---------- Aufbau ----------

function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createEmptyFieldSlots(): DuelFieldSlot[] {
  return Array.from({ length: DUEL_FIELD_SIZE }, () => ({ unit: null }));
}

function drawCards(player: DuelPlayerState, count: number): void {
  for (let i = 0; i < count; i++) {
    const next = player.deckCardIds.shift();
    if (!next) break; // Deck leer: kein Draw, kein Fatal (siehe Entscheidung im Plan)
    if (player.handCardIds.length >= DUEL_HAND_CAP) {
      player.graveyardCardIds.push(next); // Hand voll: gezogene Karte verfällt
    } else {
      player.handCardIds.push(next);
    }
  }
}

export function createDuelState(playerADeck: DuelDeckInput, playerBDeck: DuelDeckInput, seed: number = randomSeed()): LiveDuelState {
  const rng = createRng(seed);

  const playerA: DuelPlayerState = {
    unitDefsByCardId: playerADeck.unitDefs,
    tacticDefsById: playerADeck.tacticDefs,
    deckCardIds: shuffle(playerADeck.cardIds, rng),
    handCardIds: [],
    field: createEmptyFieldSlots(),
    setTraps: [],
    graveyardCardIds: [],
    lifePoints: DUEL_START_LP,
  };
  const playerB: DuelPlayerState = {
    unitDefsByCardId: playerBDeck.unitDefs,
    tacticDefsById: playerBDeck.tacticDefs,
    deckCardIds: shuffle(playerBDeck.cardIds, rng),
    handCardIds: [],
    field: createEmptyFieldSlots(),
    setTraps: [],
    graveyardCardIds: [],
    lifePoints: DUEL_START_LP,
  };

  drawCards(playerA, DUEL_START_HAND_SIZE);
  drawCards(playerB, DUEL_START_HAND_SIZE);

  return {
    seed,
    rngState: rng.getState(),
    round: 1,
    playerA,
    playerB,
    pendingActions: { A: null, B: null },
    roundDeadline: Date.now() + DUEL_ROUND_TIMEOUT_MS,
    log: [{ type: "duelStart", round: 1 }],
    winner: null,
    timeoutStreakA: 0,
    timeoutStreakB: 0,
  };
}

// ---------- Hilfsfunktionen ----------

function playerState(state: LiveDuelState, team: TeamId): DuelPlayerState {
  return team === "A" ? state.playerA : state.playerB;
}

function opponentTeam(team: TeamId): TeamId {
  return team === "A" ? "B" : "A";
}

function allFieldUnits(state: LiveDuelState): BattleUnitState[] {
  return [...state.playerA.field, ...state.playerB.field]
    .map((slot) => slot.unit)
    .filter((unit): unit is BattleUnitState => unit !== null);
}

/** DuelLogEntry ⊇ BattleLogEntry (reine Erweiterung um zusätzliche Varianten) —
 *  Aufrufe der bestehenden Engine-Funktionen (grantRage/performAction/
 *  executeEffect), die BattleLogEntry[] erwarten, dürfen denselben Log-Array
 *  gefahrlos mitverwenden, da sie ausschließlich gültige BattleLogEntry-Werte
 *  pushen. */
function asBattleLog(log: DuelLogEntry[]): BattleLogEntry[] {
  return log as unknown as BattleLogEntry[];
}

// ---------- Validierung ----------

function validateSubmission(player: DuelPlayerState, submission: DuelRoundSubmission): void {
  if (submission.summon) {
    const { handCardId, slotIndex } = submission.summon;
    if (!player.handCardIds.includes(handCardId)) {
      throw new DuelLiveError("Diese Karte ist nicht auf deiner Hand.");
    }
    if (!player.unitDefsByCardId[handCardId]) {
      throw new DuelLiveError("Diese Handkarte ist keine Einheiten-Karte.");
    }
    const slot = player.field[slotIndex];
    if (!slot || slot.unit) {
      throw new DuelLiveError("Dieser Feld-Slot ist ungültig oder bereits belegt.");
    }
  }

  if (submission.playTactic) {
    const { handCardId } = submission.playTactic;
    if (!player.handCardIds.includes(handCardId)) {
      throw new DuelLiveError("Diese Taktik-Karte ist nicht auf deiner Hand.");
    }
    if (!player.tacticDefsById[handCardId]) {
      throw new DuelLiveError("Diese Handkarte ist keine Taktik-Karte.");
    }
  }

  if (submission.summon && submission.playTactic && submission.summon.handCardId === submission.playTactic.handCardId) {
    throw new DuelLiveError("Dieselbe Karte kann nicht gleichzeitig beschworen und als Taktik-Karte gespielt werden.");
  }

  for (const action of submission.fieldActions) {
    const slot = player.field[action.slotIndex];
    if (!slot?.unit || !slot.unit.isAlive) {
      throw new DuelLiveError("Feld-Aktion für eine leere oder ungültige Position.");
    }
    if (
      (action.action === "normalAttack" || action.action === "active" || action.action === "ultimate") &&
      action.targetSlotIndex === undefined
    ) {
      throw new DuelLiveError("Für diese Aktion fehlt eine Zielposition.");
    }
  }
}

// ---------- Einreichen ----------

export function submitDuelAction(state: LiveDuelState, team: TeamId, submission: DuelRoundSubmission): LiveDuelState {
  if (state.winner) throw new DuelLiveError("Dieses Duell ist bereits beendet.");
  if (state.pendingActions[team]) throw new DuelLiveError("Für diese Runde wurde bereits eine Entscheidung eingereicht.");

  validateSubmission(playerState(state, team), submission);
  state.pendingActions[team] = submission;

  if (state.pendingActions[opponentTeam(team)]) {
    return resolveDuelRound(state);
  }
  return state;
}

// ---------- Timeout (lazy, kein Sweep-Job — siehe getLiveBattleSnapshot-Vorbild) ----------

function pickDefaultTargetSlot(opponent: DuelPlayerState): number {
  let bestIndex = 0;
  let bestDefense = Infinity;
  let found = false;
  opponent.field.forEach((slot, index) => {
    if (slot.unit?.isAlive && slot.unit.defense < bestDefense) {
      bestDefense = slot.unit.defense;
      bestIndex = index;
      found = true;
    }
  });
  return found ? bestIndex : 0; // 0 kann ein leerer Slot sein -> Face-Damage in resolveFieldActions
}

function defaultDuelSubmission(player: DuelPlayerState, opponent: DuelPlayerState): DuelRoundSubmission {
  const fieldActions: DuelRoundFieldAction[] = [];
  player.field.forEach((slot, slotIndex) => {
    if (!slot.unit?.isAlive) return;
    fieldActions.push({ slotIndex, action: "normalAttack", targetSlotIndex: pickDefaultTargetSlot(opponent) });
  });
  return { fieldActions };
}

export function checkDuelTimeout(state: LiveDuelState): LiveDuelState {
  if (state.winner) return state;
  if (Date.now() < state.roundDeadline) return state;

  (["A", "B"] as const).forEach((team) => {
    if (state.pendingActions[team]) return;
    state.pendingActions[team] = defaultDuelSubmission(playerState(state, team), playerState(state, opponentTeam(team)));
    if (team === "A") state.timeoutStreakA += 1;
    else state.timeoutStreakB += 1;
  });

  return resolveDuelRound(state);
}

// ---------- Rundenauflösung ----------

function applySummon(team: TeamId, player: DuelPlayerState, submission: DuelRoundSubmission, log: DuelLogEntry[], round: number): void {
  if (!submission.summon) return;
  const { handCardId, slotIndex } = submission.summon;
  const def = player.unitDefsByCardId[handCardId];
  const slot = player.field[slotIndex];
  if (!def || !slot || slot.unit) return; // defensiv, bereits in validateSubmission geprüft

  const instanceId = `${team}-${slotIndex}-${handCardId}-${round}`;
  slot.unit = createBattleUnitState(def, team, instanceId);
  player.handCardIds = player.handCardIds.filter((id) => id !== handCardId);
  log.push({ type: "summon", round, team, slotIndex, unitId: instanceId, cardId: handCardId });
}

function applyTacticPlay(
  team: TeamId,
  state: LiveDuelState,
  submission: DuelRoundSubmission,
  rng: Rng,
  log: DuelLogEntry[],
  round: number
): void {
  if (!submission.playTactic) return;
  const player = playerState(state, team);
  const { handCardId, mode, slotIndex } = submission.playTactic;
  const def = player.tacticDefsById[handCardId];
  if (!def) return;

  player.handCardIds = player.handCardIds.filter((id) => id !== handCardId);
  log.push({ type: "tacticPlayed", round, team, tacticCardId: handCardId, mode });

  if (mode === "setFaceDown") {
    player.setTraps.push({ tacticCardId: handCardId, slotIndex: slotIndex ?? player.setTraps.length });
    return;
  }

  // INSTANT: Effekte sofort anwenden. Effect/EffectTarget sind an eine
  // Akteur-Einheit gebunden (siehe effects.ts) — als Anker dient die erste
  // eigene lebende Feld-Einheit. Ohne eigene Feld-Einheit verpufft der Effekt
  // (vereinfachtes Grundgerüst; ein reines "Ziel = LP-Pool"-Effekt-Modell wäre
  // ein Folgeschritt für Karten, die nicht an Einheiten hängen sollen).
  const anchor = player.field.find((slot) => slot.unit?.isAlive)?.unit;
  if (anchor) {
    for (const effect of def.effects) {
      executeEffect(effect, 1, {
        actor: anchor,
        allUnits: allFieldUnits(state),
        rng,
        round,
        log: asBattleLog(log),
        skillName: def.name,
        suddenDeathMultiplier: 1,
      });
    }
  }
  player.graveyardCardIds.push(handCardId);
}

function matchesTrigger(condition: TacticCardDefinition["triggerCondition"], opponentSubmission: DuelRoundSubmission): boolean {
  if (!condition) return false;
  switch (condition.type) {
    case "onEnemyAttack":
      return opponentSubmission.fieldActions.some((a) => a.action === "normalAttack" || a.action === "active");
    case "onEnemySummon":
      return !!opponentSubmission.summon;
    case "onEnemyUltimate":
      return opponentSubmission.fieldActions.some((a) => a.action === "ultimate");
    default:
      return false;
  }
}

function triggerTraps(
  owner: TeamId,
  state: LiveDuelState,
  existingTraps: DuelTrapInPlay[],
  opponentSubmission: DuelRoundSubmission,
  rng: Rng,
  log: DuelLogEntry[],
  round: number
): void {
  const player = playerState(state, owner);
  for (const trap of existingTraps) {
    const def = player.tacticDefsById[trap.tacticCardId];
    if (!def || !matchesTrigger(def.triggerCondition, opponentSubmission)) continue;

    const anchor = player.field.find((slot) => slot.unit?.isAlive)?.unit;
    if (anchor) {
      for (const effect of def.effects) {
        executeEffect(effect, 1, {
          actor: anchor,
          allUnits: allFieldUnits(state),
          rng,
          round,
          log: asBattleLog(log),
          skillName: def.name,
          suddenDeathMultiplier: 1,
        });
      }
    }
    player.setTraps = player.setTraps.filter((t) => t !== trap);
    player.graveyardCardIds.push(trap.tacticCardId);
    log.push({ type: "trapTriggered", round, team: owner, tacticCardId: trap.tacticCardId });
  }
}

function resolveFieldActions(
  team: TeamId,
  state: LiveDuelState,
  ownSubmission: DuelRoundSubmission,
  opponentSubmission: DuelRoundSubmission,
  rng: Rng,
  log: DuelLogEntry[],
  round: number
): void {
  const player = playerState(state, team);
  const opponentTeamId = opponentTeam(team);
  const opponent = playerState(state, opponentTeamId);

  for (const fieldAction of ownSubmission.fieldActions) {
    if (fieldAction.action === "block" || fieldAction.action === "dodge") continue; // rein reaktiv

    const attacker = player.field[fieldAction.slotIndex]?.unit;
    if (!attacker || !attacker.isAlive) continue;
    const targetSlotIndex = fieldAction.targetSlotIndex;
    if (targetSlotIndex === undefined) continue;

    const defenderUnit = opponent.field[targetSlotIndex]?.unit;

    if (!defenderUnit || !defenderUnit.isAlive) {
      // Ziel-Slot leer -> Face-Damage, 1:1 des attack-Werts, kein performAction.
      const amount = attacker.attack;
      opponent.lifePoints = Math.max(0, opponent.lifePoints - amount);
      log.push({
        type: "faceDamage",
        round,
        attackerUnitId: attacker.instanceId,
        defendingTeam: opponentTeamId,
        amount,
        remainingLp: opponent.lifePoints,
      });
      continue;
    }

    const defenderAction = opponentSubmission.fieldActions.find((a) => a.slotIndex === targetSlotIndex)?.action;

    if (defenderAction === "dodge" && fieldAction.action !== "ultimate") {
      continue; // Angriff komplett vermieden (Ultimate ist nicht ausweichbar)
    }

    const damageMultiplier = defenderAction === "block" ? DUEL_BLOCK_DAMAGE_MULTIPLIER : 1;
    performAction(attacker, fieldAction.action, allFieldUnits(state), rng, round, asBattleLog(log), damageMultiplier, defenderUnit.instanceId);
  }
}

function grantRoundRage(
  team: TeamId,
  state: LiveDuelState,
  ownSubmission: DuelRoundSubmission,
  opponentSubmission: DuelRoundSubmission,
  log: DuelLogEntry[],
  round: number
): void {
  const player = playerState(state, team);

  for (const fieldAction of ownSubmission.fieldActions) {
    const unit = player.field[fieldAction.slotIndex]?.unit;
    if (!unit || !unit.isAlive) continue;

    // Basis-Rage für JEDE Aktion, inkl. Block/Ausweichen — sonst wäre Block
    // strikt schlechter als Angreifen (siehe DUEL_BLOCK_SUCCESS_RAGE_BONUS-Doku).
    grantRage(unit, RAGE_PER_ACTION, round, asBattleLog(log), "action");

    if (fieldAction.action === "block" || fieldAction.action === "dodge") {
      const wasTargeted = opponentSubmission.fieldActions.some(
        (a) => a.targetSlotIndex === fieldAction.slotIndex && a.action !== "block" && a.action !== "dodge"
      );
      if (wasTargeted) {
        const bonus = fieldAction.action === "block" ? DUEL_BLOCK_SUCCESS_RAGE_BONUS : DUEL_DODGE_SUCCESS_RAGE_BONUS;
        grantRage(unit, bonus, round, asBattleLog(log), "action");
      }
    }
  }

  // Comeback-Bonus: vereinfacht anhand aktuellem HP-Rückstand (nicht nur
  // Schaden dieser Runde) — reicht fürs Grundgerüst, siehe Plan.
  for (const slot of player.field) {
    if (!slot.unit?.isAlive) continue;
    const missingPercent = 1 - slot.unit.currentHp / slot.unit.maxHp;
    if (missingPercent > 0) {
      const bonus = Math.round(DUEL_COMEBACK_RAGE_FACTOR * missingPercent * RAGE_PER_ACTION);
      grantRage(slot.unit, bonus, round, asBattleLog(log), "action");
    }
  }
}

export function checkDuelWinner(playerA: DuelPlayerState, playerB: DuelPlayerState): TeamId | "DRAW" | null {
  const aDown = playerA.lifePoints <= 0;
  const bDown = playerB.lifePoints <= 0;
  if (aDown && bDown) return "DRAW";
  if (aDown) return "B";
  if (bDown) return "A";
  return null;
}

function resolveDuelRound(state: LiveDuelState): LiveDuelState {
  const submissionA = state.pendingActions.A;
  const submissionB = state.pendingActions.B;
  if (!submissionA || !submissionB) {
    throw new DuelLiveError("Runde kann erst aufgelöst werden, wenn beide Seiten eingereicht haben.");
  }

  const rng = createRng(state.rngState);
  const round = state.round;
  const log = state.log;

  // Fallen-Snapshot VOR dem Setzen neuer Fallen dieser Runde — eine gerade
  // erst verdeckt gesetzte Falle kann in derselben Runde noch nicht auslösen.
  const existingTrapsA = [...state.playerA.setTraps];
  const existingTrapsB = [...state.playerB.setTraps];

  // 1. Beschwörungen
  applySummon("A", state.playerA, submissionA, log, round);
  applySummon("B", state.playerB, submissionB, log, round);

  // 2+3. Taktik-Karten: Sofort-Wirkung oder verdecktes Setzen
  applyTacticPlay("A", state, submissionA, rng, log, round);
  applyTacticPlay("B", state, submissionB, rng, log, round);

  // 4. Ausgelöste Fallen — gegen die jeweils gegnerische, gerade eingereichte Aktion
  triggerTraps("A", state, existingTrapsA, submissionB, rng, log, round);
  triggerTraps("B", state, existingTrapsB, submissionA, rng, log, round);

  // 5. Kampf-Auflösung
  resolveFieldActions("A", state, submissionA, submissionB, rng, log, round);
  resolveFieldActions("B", state, submissionB, submissionA, rng, log, round);

  // 6. Rage-Vergabe (inkl. korrigierter Block-Basis-Rage + Comeback-Bonus)
  grantRoundRage("A", state, submissionA, submissionB, log, round);
  grantRoundRage("B", state, submissionB, submissionA, log, round);

  // 7. Sieg-Check
  state.winner = checkDuelWinner(state.playerA, state.playerB);
  state.pendingActions = { A: null, B: null };
  state.rngState = rng.getState();

  if (state.winner) {
    log.push({ type: "battleEnd", winner: state.winner, round });
    return state;
  }

  // 8. Draw-Phase für die nächste Runde
  drawCards(state.playerA, DUEL_DRAW_PER_ROUND);
  drawCards(state.playerB, DUEL_DRAW_PER_ROUND);
  log.push({ type: "roundEnd", round });
  state.round += 1;
  state.roundDeadline = Date.now() + DUEL_ROUND_TIMEOUT_MS;

  return state;
}
