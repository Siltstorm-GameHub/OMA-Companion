// ============================================
// Battle-Engine — OMA Duels (Yu-Gi-Oh-artiges Live-PvP)
// ============================================
// Ersetzt den alten sequentiellen Duell-Modus (interactive.ts, Modi
// "PVP_CHALLENGE"/"PVP_MATCHMAKING"): Deck/Hand/Feld/Beschwörung, echter
// Zug-Wechsel (wie im echten Yu-Gi-Oh) statt "eine Einheit ist an der Reihe".
//
// Frühere Version dieses Moduls löste Runden SIMULTAN auf (beide Seiten
// wählen blind, dann gemeinsame Auflösung, Block/Ausweichen als reaktive
// Gegenwette). Das wurde bewusst auf echten Zug-Wechsel umgestellt: eine
// Zug-Einreichung wird SOFORT aufgelöst (kein Warten auf eine zweite
// Einreichung), Verteidigung kommt jetzt aus einer öffentlich sichtbaren
// Angriffs-/Verteidigungsstellung (siehe DuelStance) statt einer verdeckten
// Reaktion — der Angreifer sieht das gegnerische Feld ja bereits vollständig,
// bevor er zuschlägt, es gibt nichts zu erraten.
//
// Reine Funktionen, keine DB-Abhängigkeit — analog zu interactive.ts/engine.ts.
// Der komplette Zustand ist JSON-serialisierbar (LiveDuelState), lebt in
// LiveBattle.stateJson (mode: "PVP_DUELS_LIVE" / "PVE_DUELS_*").
//
// PVE/OMA-Gems (interactive.ts, board-match3.ts) sind NICHT betroffen — dieser
// Modus ersetzt ausschließlich die beiden alten PvP-Duell-Modi.

import { RAGE_PER_ACTION } from "./constants";
import {
  DUEL_COMEBACK_RAGE_FACTOR,
  DUEL_DEFENSE_POSITION_DAMAGE_MULTIPLIER,
  DUEL_DRAW_PER_ROUND,
  DUEL_FIELD_SIZE,
  DUEL_HAND_CAP,
  DUEL_START_HAND_SIZE,
  DUEL_START_LP,
  DUEL_TURN_TIMEOUT_MS,
} from "./duel-constants";
import { executeEffect } from "./effects";
import { grantRage, performAction } from "./engine";
import { createRng, randomSeed, type Rng } from "./rng";
import { createBattleUnitState } from "./stats";
import type { BattleLogEntry, BattleUnitDefinition, BattleUnitState, TacticCardDefinition, TeamId } from "./types";

export class DuelLiveError extends Error {}

export type DuelActionType = "normalAttack" | "active" | "ultimate";

/** Angriffs-/Verteidigungsstellung einer Feld-Einheit — öffentlich sichtbare
 *  Information für beide Seiten (wie in echtem Yu-Gi-Oh), beeinflusst den
 *  Schadens-Multiplikator bei eingehenden Angriffen (siehe resolveAttacks). */
export type DuelStance = "attack" | "defense";

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

export interface DuelAttackAction {
  slotIndex: number;
  action: DuelActionType;
  /** Pflicht — gegnerischer Feld-Slot-Index (auch wenn dieser leer ist: dann
   *  Face-Damage). */
  targetSlotIndex?: number;
}

export interface DuelTurnSubmission {
  summon?: { handCardId: string; slotIndex: number; stance: DuelStance };
  /** Stellungswechsel für bereits VOR diesem Zug vorhandene Feld-Einheiten,
   *  die diesen Zug noch nicht angegriffen haben (siehe validateSubmission). */
  stanceChanges?: { slotIndex: number; stance: DuelStance }[];
  playTactic?: { handCardId: string; mode: "instant" | "setFaceDown"; slotIndex?: number };
  attacks: DuelAttackAction[];
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
  | { type: "stanceChanged"; round: number; team: TeamId; slotIndex: number; stance: DuelStance }
  | { type: "tacticPlayed"; round: number; team: TeamId; tacticCardId: string; mode: "instant" | "setFaceDown" }
  | { type: "trapTriggered"; round: number; team: TeamId; tacticCardId: string }
  | {
      type: "faceDamage";
      round: number;
      attackerUnitId: string;
      defendingTeam: TeamId;
      amount: number;
      remainingLp: number;
    }
  /** Deck-Out (wie im echten Yu-Gi-Oh): `team` musste ziehen, konnte aber
   *  nicht (Nachziehstapel leer) — sofortige Niederlage, siehe applyTurn. */
  | { type: "deckOut"; round: number; team: TeamId };

export interface LiveDuelState {
  seed: number;
  rngState: number;
  /** Fortlaufende Zug-Nummer (nicht mehr "beide haben gewählt"-Runde) — UI zeigt "Zug X". */
  round: number;
  activeTeam: TeamId;
  playerA: DuelPlayerState;
  playerB: DuelPlayerState;
  /** Epoch-ms, Schachuhr-Prinzip: nur für die gerade aktive Seite relevant.
   *  NUR hier in stateJson, kein eigenes DB-Feld (siehe getLiveBattleSnapshot/
   *  turnDeadline-Vorbild in interactive.ts/live-battle.ts: Timeout wird lazy
   *  beim nächsten Poll geprüft, kein Sweep-Job nötig). */
  turnDeadline: number;
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

/** @returns true, falls ein Zug-Versuch am leeren Nachziehstapel gescheitert
 *  ist ("Decking Out") — der Aufrufer muss diesen Fall dann als sofortige
 *  Niederlage für `player` werten (siehe applyTurn). Beim Start-Handaufbau
 *  (createDuelState) ist das praktisch ausgeschlossen, da ein Duell-Deck
 *  immer DUEL_DECK_TOTAL_SIZE (> DUEL_START_HAND_SIZE) Karten hat. */
function drawCards(player: DuelPlayerState, count: number): boolean {
  for (let i = 0; i < count; i++) {
    const next = player.deckCardIds.shift();
    if (!next) return true; // Deck leer, obwohl noch gezogen werden musste -> Deck-Out
    if (player.handCardIds.length >= DUEL_HAND_CAP) {
      player.graveyardCardIds.push(next); // Hand voll: gezogene Karte verfällt
    } else {
      player.handCardIds.push(next);
    }
  }
  return false;
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
    activeTeam: "A",
    playerA,
    playerB,
    turnDeadline: Date.now() + DUEL_TURN_TIMEOUT_MS,
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

function validateSubmission(player: DuelPlayerState, submission: DuelTurnSubmission): void {
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

  // Stellungswechsel nur für Einheiten, die bereits VOR diesem Zug auf dem
  // Feld standen (ein gerade erst beschworener Slot ist zu diesem Zeitpunkt
  // noch leer, kann also gar nicht referenziert werden) und lebendig sind.
  const stanceChangeSlots = new Set<number>();
  for (const change of submission.stanceChanges ?? []) {
    const slot = player.field[change.slotIndex];
    if (!slot?.unit || !slot.unit.isAlive) {
      throw new DuelLiveError("Stellungswechsel für eine leere oder ungültige Position.");
    }
    stanceChangeSlots.add(change.slotIndex);
  }

  for (const attack of submission.attacks) {
    const slot = player.field[attack.slotIndex];
    if (!slot?.unit || !slot.unit.isAlive) {
      throw new DuelLiveError("Angriff für eine leere oder ungültige Position.");
    }
    if (attack.targetSlotIndex === undefined) {
      throw new DuelLiveError("Für diese Aktion fehlt eine Zielposition.");
    }
    if (stanceChangeSlots.has(attack.slotIndex)) {
      throw new DuelLiveError("Eine Einheit kann nicht im selben Zug Stellung wechseln und angreifen.");
    }
  }
}

// ---------- Einreichen ----------

export function submitDuelAction(state: LiveDuelState, team: TeamId, submission: DuelTurnSubmission): LiveDuelState {
  if (state.winner) throw new DuelLiveError("Dieses Duell ist bereits beendet.");
  if (team !== state.activeTeam) throw new DuelLiveError("Du bist gerade nicht am Zug.");

  validateSubmission(playerState(state, team), submission);
  return applyTurn(state, team, submission);
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
  return found ? bestIndex : 0; // 0 kann ein leerer Slot sein -> Face-Damage in resolveAttacks
}

/** Einfache Standard-Entscheidung: greift mit jeder eigenen lebenden Feld-
 *  Einheit die gegnerische Einheit mit der niedrigsten Verteidigung an, und
 *  beschwört bei freiem Slot die erste Einheiten-Karte aus der Hand (immer in
 *  Angriffsstellung). Dient zweifach: (1) Timeout-Fallback für einen
 *  säumigen menschlichen Spieler (siehe checkDuelTimeout), (2) die komplette
 *  "KI" für OMA-Duels-NPC-Kämpfe (siehe duel-live-battle.ts) — bewusst
 *  dieselbe simple Logik für beide Fälle, statt eine eigene NPC-KI zu
 *  duplizieren. */
export function computeAutoSubmission(player: DuelPlayerState, opponent: DuelPlayerState): DuelTurnSubmission {
  const attacks: DuelAttackAction[] = [];
  player.field.forEach((slot, slotIndex) => {
    if (!slot.unit?.isAlive) return;
    attacks.push({ slotIndex, action: "normalAttack", targetSlotIndex: pickDefaultTargetSlot(opponent) });
  });

  const emptySlotIndex = player.field.findIndex((slot) => !slot.unit);
  const summonCardId = emptySlotIndex >= 0 ? player.handCardIds.find((id) => player.unitDefsByCardId[id]) : undefined;

  return {
    summon: summonCardId ? { handCardId: summonCardId, slotIndex: emptySlotIndex, stance: "attack" } : undefined,
    attacks,
  };
}

export function checkDuelTimeout(state: LiveDuelState): LiveDuelState {
  if (state.winner) return state;
  if (Date.now() < state.turnDeadline) return state;

  const team = state.activeTeam;
  const submission = computeAutoSubmission(playerState(state, team), playerState(state, opponentTeam(team)));
  if (team === "A") state.timeoutStreakA += 1;
  else state.timeoutStreakB += 1;

  return applyTurn(state, team, submission);
}

// ---------- Zug-Auflösung ----------

function applySummon(team: TeamId, player: DuelPlayerState, submission: DuelTurnSubmission, log: DuelLogEntry[], round: number): void {
  if (!submission.summon) return;
  const { handCardId, slotIndex, stance } = submission.summon;
  const def = player.unitDefsByCardId[handCardId];
  const slot = player.field[slotIndex];
  if (!def || !slot || slot.unit) return; // defensiv, bereits in validateSubmission geprüft

  const instanceId = `${team}-${slotIndex}-${handCardId}-${round}`;
  const unit = createBattleUnitState(def, team, instanceId);
  unit.stance = stance;
  slot.unit = unit;
  player.handCardIds = player.handCardIds.filter((id) => id !== handCardId);
  log.push({ type: "summon", round, team, slotIndex, unitId: instanceId, cardId: handCardId });
}

function applyStanceChanges(team: TeamId, player: DuelPlayerState, submission: DuelTurnSubmission, log: DuelLogEntry[], round: number): void {
  for (const change of submission.stanceChanges ?? []) {
    const unit = player.field[change.slotIndex]?.unit;
    if (!unit) continue; // defensiv, bereits in validateSubmission geprüft
    unit.stance = change.stance;
    log.push({ type: "stanceChanged", round, team, slotIndex: change.slotIndex, stance: change.stance });
  }
}

function applyTacticPlay(
  team: TeamId,
  state: LiveDuelState,
  submission: DuelTurnSubmission,
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

function matchesTrigger(condition: TacticCardDefinition["triggerCondition"], attackerSubmission: DuelTurnSubmission): boolean {
  if (!condition) return false;
  switch (condition.type) {
    case "onEnemyAttack":
      return attackerSubmission.attacks.some((a) => a.action === "normalAttack" || a.action === "active");
    case "onEnemySummon":
      return !!attackerSubmission.summon;
    case "onEnemyUltimate":
      return attackerSubmission.attacks.some((a) => a.action === "ultimate");
    default:
      return false;
  }
}

function triggerTraps(
  owner: TeamId,
  state: LiveDuelState,
  existingTraps: DuelTrapInPlay[],
  attackerSubmission: DuelTurnSubmission,
  rng: Rng,
  log: DuelLogEntry[],
  round: number
): void {
  const player = playerState(state, owner);
  for (const trap of existingTraps) {
    const def = player.tacticDefsById[trap.tacticCardId];
    if (!def || !matchesTrigger(def.triggerCondition, attackerSubmission)) continue;

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

/** Löst die deklarierten Angriffe EINER Seite auf — die Gegenseite hat in
 *  diesem Zug nichts eingereicht, ihr Feld-Zustand (inkl. `stance`) ist
 *  bereits bekannt/sichtbar, kein "Gegenreaktion erraten" mehr nötig. */
function resolveAttacks(
  team: TeamId,
  state: LiveDuelState,
  submission: DuelTurnSubmission,
  rng: Rng,
  log: DuelLogEntry[],
  round: number
): void {
  const player = playerState(state, team);
  const opponentTeamId = opponentTeam(team);
  const opponent = playerState(state, opponentTeamId);

  for (const attack of submission.attacks) {
    const attacker = player.field[attack.slotIndex]?.unit;
    if (!attacker || !attacker.isAlive) continue;
    const targetSlotIndex = attack.targetSlotIndex;
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

    const multiplier = defenderUnit.stance === "defense" ? DUEL_DEFENSE_POSITION_DAMAGE_MULTIPLIER : 1;
    performAction(attacker, attack.action, allFieldUnits(state), rng, round, asBattleLog(log), multiplier, defenderUnit.instanceId);
  }
}

function grantTurnRage(team: TeamId, state: LiveDuelState, submission: DuelTurnSubmission, log: DuelLogEntry[], round: number): void {
  const player = playerState(state, team);

  for (const attack of submission.attacks) {
    const unit = player.field[attack.slotIndex]?.unit;
    if (!unit || !unit.isAlive) continue;
    grantRage(unit, RAGE_PER_ACTION, round, asBattleLog(log), "action");
  }

  // Comeback-Bonus: vereinfacht anhand aktuellem HP-Rückstand (nicht nur
  // Schaden dieses Zugs) — reicht fürs Grundgerüst, siehe Plan. Nur für die
  // aktive Seite (wer gerade dran ist, bekommt ggf. etwas Aufholhilfe).
  for (const slot of player.field) {
    if (!slot.unit?.isAlive) continue;
    const missingPercent = 1 - slot.unit.currentHp / slot.unit.maxHp;
    if (missingPercent > 0) {
      const bonus = Math.round(DUEL_COMEBACK_RAGE_FACTOR * missingPercent * RAGE_PER_ACTION);
      grantRage(slot.unit, bonus, round, asBattleLog(log), "action");
    }
  }
}

function clearDeadUnits(player: DuelPlayerState): void {
  for (const slot of player.field) {
    if (slot.unit && !slot.unit.isAlive) {
      player.graveyardCardIds.push(slot.unit.def.cardId);
      slot.unit = null;
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

/** Wertet EINEN kompletten Spielerzug sofort aus (kein Warten auf eine
 *  zweite Einreichung — nur eine Seite ist pro Zug aktiv). */
function applyTurn(state: LiveDuelState, team: TeamId, submission: DuelTurnSubmission): LiveDuelState {
  const rng = createRng(state.rngState);
  const round = state.round;
  const log = state.log;
  const opponentTeamId = opponentTeam(team);
  const opponent = playerState(state, opponentTeamId);

  // Fallen-Snapshot VOR dieser Auflösung — eine gerade erst verdeckt
  // gesetzte eigene Falle kann in DIESEM Zug (logisch: erst im nächsten
  // gegnerischen Zug) noch nicht auslösen; hier geht es um die bereits
  // VORHER liegenden Fallen der Gegenseite.
  const existingOpponentTraps = [...opponent.setTraps];

  applySummon(team, playerState(state, team), submission, log, round);
  applyStanceChanges(team, playerState(state, team), submission, log, round);
  applyTacticPlay(team, state, submission, rng, log, round);
  triggerTraps(opponentTeamId, state, existingOpponentTraps, submission, rng, log, round);
  resolveAttacks(team, state, submission, rng, log, round);
  grantTurnRage(team, state, submission, log, round);

  // Tote Feld-Einheiten auf BEIDEN Seiten räumen — sonst bleibt der Slot für
  // immer blockiert (ein "death"-Log-Eintrag wurde bereits beim tödlichen
  // Treffer geschrieben, hier nur der stille Feld-Zustandswechsel).
  clearDeadUnits(state.playerA);
  clearDeadUnits(state.playerB);

  state.winner = checkDuelWinner(state.playerA, state.playerB);
  state.rngState = rng.getState();

  if (state.winner) {
    log.push({ type: "battleEnd", winner: state.winner, round });
    return state;
  }

  // Zug wechselt — die neue aktive Seite zieht 1 Karte. Kein Sonderfall für
  // "kein Draw im allerersten Zug" nötig: Zug 1 (Startspieler) läuft direkt
  // mit der Starthand ohne einen vorherigen Übergang, der erste tatsächliche
  // Kartenzug passiert erst HIER beim Wechsel in Zug 2 — genau wie in echtem
  // Yu-Gi-Oh, wo nur der Startspieler seine eigene erste Ziehphase auslässt.
  const deckedOut = drawCards(opponent, DUEL_DRAW_PER_ROUND);
  log.push({ type: "roundEnd", round });
  state.activeTeam = opponentTeamId;
  state.round += 1;
  state.turnDeadline = Date.now() + DUEL_TURN_TIMEOUT_MS;

  // Deck-Out: die neue aktive Seite konnte ihre Pflichtkarte nicht ziehen ->
  // sofortige Niederlage (wie im echten Yu-Gi-Oh), unabhängig vom LP-Stand.
  if (deckedOut) {
    state.winner = team;
    log.push({ type: "deckOut", round: state.round, team: opponentTeamId });
    log.push({ type: "battleEnd", winner: team, round: state.round });
  }

  return state;
}
