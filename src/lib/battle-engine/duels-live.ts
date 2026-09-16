// ============================================
// Battle-Engine — OMA Duels (Yu-Gi-Oh-artiges Live-PvP)
// ============================================
// Echte Yu-Gi-Oh-Phasenstruktur: Hauptphase 1 -> Kampfphase -> Hauptphase 2 ->
// Zugende (Ziehen/Standby laufen automatisch beim Zugwechsel, siehe
// endTurnInternal — es gibt dafür bewusst keine eigene Phase, da in diesem
// Spiel nichts an eine Standby-Phase gebunden ist). Jede einzelne Aktion
// (Beschwören, Stellung wechseln, Taktik-Karte spielen, ein Angriff, eine
// Phase weiterschalten) ist eine EIGENE Server-Anfrage und wird sofort
// validiert + aufgelöst — anders als die frühere Version, die einen ganzen
// Zug als eine gebündelte Einreichung entgegennahm. Das ist nötig, um
// innerhalb der Kampfphase mehrere Angriffe einzeln (mit dazwischenliegenden
// Fallen-Reaktionen) aufzulösen und Hauptphase-1/2-Sonderregeln (z.B. "nur
// eine Normalbeschwörung pro Zug, aber über beide Hauptphasen hinweg") wie im
// echten Spiel abzubilden.
//
// Reine Funktionen, keine DB-Abhängigkeit — analog zu interactive.ts/engine.ts.
// Der komplette Zustand ist JSON-serialisierbar (LiveDuelState), lebt in
// LiveBattle.stateJson (mode: "PVP_DUELS_LIVE" / "PVE_DUELS_*").
//
// PVE/OMA-Gems (interactive.ts, board-match3.ts) sind NICHT betroffen — dieser
// Modus ersetzt ausschließlich die beiden alten PvP-Duell-Modi.

import { RAGE_PER_ACTION, ULTIMATE_SKILL_COST } from "./constants";
import {
  DUEL_COMEBACK_RAGE_FACTOR,
  DUEL_DRAW_PER_ROUND,
  DUEL_FIELD_SIZE,
  DUEL_HAND_CAP,
  DUEL_START_HAND_SIZE,
  DUEL_START_LP,
  DUEL_TURN_TIMEOUT_MS,
  DUEL_ULTIMATE_DAMAGE_DEALER_MULTIPLIER,
  DUEL_ULTIMATE_DAMAGE_DEALER_OVERKILL_FACTOR,
  DUEL_ULTIMATE_SUPPORT_HEAL_MULTIPLIER,
  DUEL_ULTIMATE_SUPPORT_RAGE_BONUS,
  DUEL_ULTIMATE_TANK_SHIELD_FACTOR,
} from "./duel-constants";
import { applyShieldAbsorption } from "./damage";
import { executeEffect, getLevelValue, tickStatModifierDurations } from "./effects";
import { grantRage } from "./engine";
import { createRng, randomSeed, type Rng } from "./rng";
import { createBattleUnitState } from "./stats";
import type { BattleLogEntry, BattleUnitDefinition, BattleUnitState, TacticCardDefinition, TeamId } from "./types";

export class DuelLiveError extends Error {}

/** Angriffs-/Verteidigungsstellung einer Feld-Einheit — öffentlich sichtbare
 *  Information für beide Seiten (wie in echtem Yu-Gi-Oh). Eine angreifende
 *  Einheit gegen eine Einheit in Verteidigungsstellung löst die echte
 *  ATK-vs-DEF-Kampfmathematik aus (siehe resolveDeclaredAttack), keinen
 *  bloßen Schadens-Multiplikator mehr. */
export type DuelStance = "attack" | "defense";

/** Ziehen/Standby laufen automatisch beim Zugwechsel (siehe endTurnInternal)
 *  und brauchen deshalb keine eigene Phase. */
export type DuelPhase = "main1" | "battle" | "main2";

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

// ---------- Zug-Aktionen ----------
// Eine Aktion = eine Server-Anfrage, sofort aufgelöst. Ersetzt die frühere
// "ein ganzer Zug in einer Einreichung"-Struktur (DuelTurnSubmission).

export type DuelAction =
  | { type: "summon"; handCardId: string; slotIndex: number; stance: DuelStance }
  | { type: "changeStance"; slotIndex: number; stance: DuelStance }
  | {
      type: "playTactic";
      handCardId: string;
      mode: "instant" | "setFaceDown";
      /** Nur nötig, wenn die Karte einen singleEnemy/singleAlly-Effekt hat
       *  (siehe requiresTacticTarget) — Feld-Slot-Index auf der jeweils
       *  passenden Seite (Gegner bei singleEnemy, eigenes Feld bei
       *  singleAlly). Nur für sofort gespielte Items relevant: eine verdeckt
       *  gesetzte Falle wählt ihr Ziel weiterhin automatisch beim Auslösen,
       *  da zu diesem Zeitpunkt noch nicht feststeht, welche Einheiten dann
       *  überhaupt noch leben. */
      targetSlotIndex?: number;
    }
  | { type: "declareAttack"; slotIndex: number; attackType: "normalAttack" | "ultimate"; targetSlotIndex: number }
  /** Schaltet main1 -> battle -> main2 -> Zugende weiter. */
  | { type: "advancePhase" }
  /** Beendet den Zug sofort, aus jeder Phase heraus (wie im echten Spiel: man
   *  kann von Hauptphase 1 direkt in die End-Phase gehen, ohne anzugreifen). */
  | { type: "endTurn" };

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
  /** Angriff auf eine Einheit in Verteidigungsstellung, ATK > DEF: Einheit
   *  zerstört, keine LP-Schaden (wie im echten Yu-Gi-Oh). */
  | { type: "defenseDestroyed"; round: number; attackerUnitId: string; defenderUnitId: string }
  /** ATK < DEF: die verteidigende Einheit übersteht den Angriff unbeschadet,
   *  die ANGREIFENDE Seite nimmt die Differenz als LP-Schaden (Rückprall). */
  | {
      type: "defenseReflect";
      round: number;
      attackerUnitId: string;
      defenderUnitId: string;
      attackerTeam: TeamId;
      amount: number;
      remainingLp: number;
    }
  /** ATK === DEF: nichts passiert. */
  | { type: "defenseBounce"; round: number; attackerUnitId: string; defenderUnitId: string }
  /** Angriffsstellung gegen Angriffsstellung, wie im echten Yu-Gi-Oh: der
   *  höhere ATK-Wert zerstört die andere Einheit, deren Seite die Differenz
   *  als LP-Schaden nimmt ("winner" gewinnt, "loser" wird zerstört); bei
   *  Gleichstand werden BEIDE Einheiten zerstört (siehe separate "death"-
   *  Einträge dafür), kein LP-Schaden. */
  | {
      type: "attackClash";
      round: number;
      winnerUnitId: string;
      loserUnitId: string;
      damagedTeam: TeamId;
      amount: number;
      remainingLp: number;
    }
  | { type: "attackClashDraw"; round: number; attackerUnitId: string; defenderUnitId: string }
  /** Taktikkarten-Effekt mit direktem LP-Ziel (ownLp/enemyLp) — siehe applyTacticEffects. */
  | { type: "lpChange"; round: number; team: TeamId; amount: number; remainingLp: number; reason: "tactic" }
  /** Zusätzlich zum generischen rageChange-Eintrag (siehe grantComebackRage) --
   *  rein fürs UI, um den Comeback-Bonus sichtbar von normalem Rage-Gewinn zu
   *  unterscheiden, ohne den geteilten grantRage()-Reason-Union in engine.ts
   *  anzufassen. */
  | { type: "comebackBonus"; round: number; unitId: string; amount: number };

export interface LiveDuelState {
  seed: number;
  rngState: number;
  /** Fortlaufende Zug-Nummer (nicht mehr "beide haben gewählt"-Runde) — UI zeigt "Zug X". */
  round: number;
  activeTeam: TeamId;
  phase: DuelPhase;
  /** Normalbeschwörung: max. 1 pro Zug, über Hauptphase 1 UND 2 hinweg (wie im
   *  echten Yu-Gi-Oh). Wird bei jedem Zugwechsel zurückgesetzt. */
  normalSummonUsed: boolean;
  /** Taktik-Karte: ebenfalls max. 1 pro Zug (Items + Fallen zusammen), über
   *  beide Hauptphasen hinweg — bewusste Balancing-Grenze für dieses (im
   *  Unterschied zum echten Yu-Gi-Oh kleine) Kartenspiel. Wird bei jedem
   *  Zugwechsel zurückgesetzt. */
  tacticPlayedThisTurn: boolean;
  playerA: DuelPlayerState;
  playerB: DuelPlayerState;
  /** Epoch-ms, Schachuhr-Prinzip: nur für die gerade aktive Seite relevant,
   *  läuft über den GESAMTEN Zug (alle Phasen), nicht pro Einzelaktion. */
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

/** Kein Deck-Out: ein leerer Nachziehstapel bedeutet einfach kein Draw, keine
 *  Niederlage (siehe checkDuelWinner — die Niederlagebedingung ist bewusst
 *  ausschließlich LP <= 0 oder "keine Handkarten UND keine Feld-Einheiten
 *  mehr", unabhängig vom Deck-Stand). */
function drawCards(player: DuelPlayerState, count: number): void {
  for (let i = 0; i < count; i++) {
    const next = player.deckCardIds.shift();
    if (!next) break;
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
    activeTeam: "A",
    phase: "main1",
    normalSummonUsed: false,
    tacticPlayedThisTurn: false,
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

function opponentHasLivingUnit(opponent: DuelPlayerState): boolean {
  return opponent.field.some((slot) => slot.unit?.isAlive);
}

/** DuelLogEntry ⊇ BattleLogEntry (reine Erweiterung um zusätzliche Varianten) —
 *  Aufrufe der bestehenden Engine-Funktionen (grantRage/performAction/
 *  executeEffect), die BattleLogEntry[] erwarten, dürfen denselben Log-Array
 *  gefahrlos mitverwenden, da sie ausschließlich gültige BattleLogEntry-Werte
 *  pushen. */
function asBattleLog(log: DuelLogEntry[]): BattleLogEntry[] {
  return log as unknown as BattleLogEntry[];
}

/** Zu Beginn jedes eigenen Zugs zurückgesetzt (siehe endTurnInternal) —
 *  Buchhaltung für die Phasenregeln (kein Angriff/keine zweite Stellungswahl
 *  im Beschwörungszug, kein zweiter Stellungswechsel, keine Stellungsänderung
 *  nach einem Angriff). */
function resetTurnFlags(player: DuelPlayerState): void {
  for (const slot of player.field) {
    if (!slot.unit) continue;
    slot.unit.summonedThisTurn = false;
    slot.unit.attackedThisTurn = false;
    slot.unit.stanceLockedThisTurn = false;
  }
}

/** Zählt befristete statModifier-Effekte (z.B. "für 2 Runden" auf einer
 *  Taktikkarte) beim Beginn des eigenen Zugs herunter — ohne diesen Aufruf
 *  wären solche Effekte in OMA Duels dauerhaft statt befristet, da hier (im
 *  Unterschied zu runBattle()/interactive.ts) sonst nirgends
 *  tickStatModifierDurations() läuft. Zählt eine "Runde" als "eine eigene
 *  Zug-Wiederkehr" — ein "2 Runden"-Effekt hält also über die nächsten 2
 *  eigenen Züge an, unabhängig davon, wie viele gegnerische Züge dazwischen
 *  liegen. */
function tickPlayerStatModifiers(player: DuelPlayerState): void {
  for (const slot of player.field) {
    if (!slot.unit) continue;
    tickStatModifierDurations(slot.unit);
  }
}

// ---------- Taktikkarten: Anker + Ziel-Modell ----------

/** Virtueller Platzhalter-Akteur für Taktikkarten-Effekte, wenn keine eigene
 *  Feld-Einheit lebt — dient NUR der Team-Zuordnung (allEnemies/allAllies
 *  funktionieren rein über teamId, siehe targeting.ts), ist bewusst NICHT
 *  Teil von allUnits (kein gültiges Angriffsziel). Ersetzt die frühere Regel
 *  "ohne eigene Einheit verpufft die ganze Karte wirkungslos" — nur Effekte,
 *  die tatsächlich eine eigene Einheit als Ziel bräuchten (z.B. "self"),
 *  laufen weiterhin ins Leere, alle anderen (allEnemies, ownLp/enemyLp, ...)
 *  wirken jetzt zuverlässig. */
function createVirtualCaster(team: TeamId): BattleUnitState {
  const emptySkill = { name: "", description: "", cost: 0, effects: [] };
  return {
    instanceId: `${team}-virtual-caster`,
    teamId: team,
    def: {
      cardId: "virtual-caster",
      name: "",
      class: "SUPPORT",
      level: 1,
      baseHp: 0,
      baseAttack: 0,
      baseDefense: 0,
      speed: 0,
      passivePositive: { name: "", description: "", trigger: "battleStart", effects: [] },
      passiveNegative: { name: "", description: "", trigger: "battleStart", effects: [] },
      activeSkill: emptySkill,
      ultimateSkill: emptySkill,
    },
    currentHp: 0,
    maxHp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    rage: 0,
    shield: 0,
    statModifiers: [],
    isAlive: false,
  };
}

function resolveTacticCaster(team: TeamId, player: DuelPlayerState): BattleUnitState {
  return player.field.find((slot) => slot.unit?.isAlive)?.unit ?? createVirtualCaster(team);
}

/** Nur ein singleEnemy/singleAlly-Effekt macht ein explizites Ziel-Wahlrecht
 *  nötig — alle anderen Ziele (self/allAllies/allEnemies/ownLp/enemyLp)
 *  treffen automatisch alles Zutreffende, ohne Auswahl. Prüft nur das ERSTE
 *  passende Effekt-Ziel einer Karte (keine der aktuellen Karten mischt
 *  mehrere Einzel-Ziel-Effekte), analog zu forcedTargetId in interactive.ts. */
export function requiresTacticTarget(def: TacticCardDefinition): "enemy" | "ally" | null {
  for (const effect of def.effects) {
    if (effect.target.kind === "singleEnemy") return "enemy";
    if (effect.target.kind === "singleAlly") return "ally";
  }
  return null;
}

/** Wendet die Effekte einer Taktikkarte an (Item sofort, oder Falle bei
 *  Auslösung). `ownLp`/`enemyLp`-Ziele ändern lifePoints direkt (kein Anker
 *  nötig); alle anderen Ziele laufen über die reguläre Effekt-Engine mit
 *  einem Anker (echte Feld-Einheit, sonst ein virtueller Platzhalter, siehe
 *  resolveTacticCaster). `forcedTargetId`: vom Spieler gewähltes Ziel für
 *  einen singleEnemy/singleAlly-Effekt (siehe requiresTacticTarget) — nur bei
 *  sofort gespielten Items möglich, Fallen wählen beim Auslösen weiterhin
 *  automatisch (siehe DuelAction["playTactic"].targetSlotIndex). */
function applyTacticEffects(
  team: TeamId,
  state: LiveDuelState,
  def: TacticCardDefinition,
  rng: Rng,
  log: DuelLogEntry[],
  round: number,
  forcedTargetId?: string
): void {
  const player = playerState(state, team);
  const opponent = playerState(state, opponentTeam(team));
  const caster = resolveTacticCaster(team, player);

  for (const effect of def.effects) {
    if (effect.target.kind === "ownLp" || effect.target.kind === "enemyLp") {
      const isOwn = effect.target.kind === "ownLp";
      const targetPlayer = isOwn ? player : opponent;
      const targetTeam = isOwn ? team : opponentTeam(team);
      const value = Math.max(0, Math.round(getLevelValue(effect.valuePerLevel, 1)));

      if (effect.type === "damage") {
        targetPlayer.lifePoints = Math.max(0, targetPlayer.lifePoints - value);
        log.push({ type: "lpChange", round, team: targetTeam, amount: -value, remainingLp: targetPlayer.lifePoints, reason: "tactic" });
      } else if (effect.type === "heal") {
        targetPlayer.lifePoints += value;
        log.push({ type: "lpChange", round, team: targetTeam, amount: value, remainingLp: targetPlayer.lifePoints, reason: "tactic" });
      }
      // shield/statModifier/rageChange ergeben für einen reinen LP-Pool
      // keinen Sinn und werden mit diesen Zielen nicht autorisiert.
      continue;
    }

    executeEffect(effect, 1, {
      actor: caster,
      allUnits: allFieldUnits(state),
      rng,
      round,
      log: asBattleLog(log),
      skillName: def.name,
      suddenDeathMultiplier: 1,
      forcedTargetId,
    });
  }
}

function matchesTrigger(condition: TacticCardDefinition["triggerCondition"], action: DuelAction): boolean {
  if (!condition) return false;
  switch (condition.type) {
    case "onEnemyAttack":
      return action.type === "declareAttack" && action.attackType === "normalAttack";
    case "onEnemySummon":
      return action.type === "summon";
    case "onEnemyUltimate":
      return action.type === "declareAttack" && action.attackType === "ultimate";
    default:
      return false;
  }
}

function triggerTraps(owner: TeamId, state: LiveDuelState, action: DuelAction, rng: Rng, log: DuelLogEntry[], round: number): void {
  const player = playerState(state, owner);
  const existingTraps = [...player.setTraps];
  for (const trap of existingTraps) {
    const def = player.tacticDefsById[trap.tacticCardId];
    if (!def || !matchesTrigger(def.triggerCondition, action)) continue;

    applyTacticEffects(owner, state, def, rng, log, round);
    player.setTraps = player.setTraps.filter((t) => t !== trap);
    player.graveyardCardIds.push(trap.tacticCardId);
    log.push({ type: "trapTriggered", round, team: owner, tacticCardId: trap.tacticCardId });
  }
}

// ---------- Kampfauflösung ----------

function requireLivingUnit(player: DuelPlayerState, slotIndex: number, message: string): BattleUnitState {
  const unit = player.field[slotIndex]?.unit;
  if (!unit || !unit.isAlive) throw new DuelLiveError(message);
  return unit;
}

/** Zerstört eine Einheit direkt (kein Schaden über die generische Effekt-
 *  Engine, kein Schild-Schutz — wie ein Kampf-Zerstören im echten Yu-Gi-Oh,
 *  das durch keinen "Schild"-Mechanismus abgefangen wird). */
function destroyUnit(unit: BattleUnitState, log: DuelLogEntry[], round: number): void {
  unit.currentHp = 0;
  if (unit.isAlive) {
    unit.isAlive = false;
    log.push({ type: "death", round, unitId: unit.instanceId });
  }
}

/** Wendet rohen Schaden direkt auf eine Einheit an (Schild-Absorption +
 *  Tod), ohne über die generische Skill-Effekt-Engine zu laufen — für die
 *  klassenbasierten Ultimate-Formeln (siehe applyClassUltimate), die feste
 *  eigene Werte statt eines Karten-Effekts nutzen. */
function applyRawDamageToUnit(target: BattleUnitState, rawAmount: number, sourceId: string, log: DuelLogEntry[], round: number): void {
  const { hpDamage, remainingShield } = applyShieldAbsorption(rawAmount, target.shield);
  target.shield = remainingShield;
  target.currentHp = Math.max(0, target.currentHp - hpDamage);
  log.push({ type: "damage", round, sourceId, targetId: target.instanceId, amount: hpDamage, isCrit: false, remainingHp: target.currentHp });
  if (target.currentHp <= 0 && target.isAlive) {
    target.isAlive = false;
    log.push({ type: "death", round, unitId: target.instanceId });
  }
}

/** Ultimate ignoriert die Stellung des Ziels bewusst (wirkt wie ein mächtiger
 *  Spruch statt eines normalen Kampf-Schlagabtauschs) UND wird nicht mehr aus
 *  den frei am Karten-Content hängenden ultimateSkill.effects gespeist,
 *  sondern aus einer festen, klassenabhängigen Formel — damit sich TANK/
 *  DAMAGE_DEALER/SUPPORT im Ultimate spürbar unterschiedlich anfühlen, egal
 *  welche konkrete Karte gespielt wird (Name/Beschreibung/Kosten bleiben
 *  weiterhin pro Karte individuell, siehe ultimateSkillName/-cost).
 *  - TANK: Schaden aus der eigenen DEF statt ATK, danach Team-Schild.
 *  - DAMAGE_DEALER: reiner ATK-Burst mit Durchschlag (Überschuss trifft LP).
 *  - SUPPORT: kein Angriff — heilt und pusht Rage fürs ganze eigene Team. */
function applyClassUltimate(
  team: TeamId,
  state: LiveDuelState,
  attacker: BattleUnitState,
  targetSlotIndex: number,
  log: DuelLogEntry[],
  round: number
): void {
  const opponentTeamId = opponentTeam(team);
  const opponent = playerState(state, opponentTeamId);
  const selfPlayer = playerState(state, team);
  const defenderUnit = opponent.field[targetSlotIndex]?.unit ?? null;

  function dealDamageOrFace(amount: number): void {
    if (defenderUnit && defenderUnit.isAlive) {
      applyRawDamageToUnit(defenderUnit, amount, attacker.instanceId, log, round);
    } else {
      opponent.lifePoints = Math.max(0, opponent.lifePoints - amount);
      log.push({
        type: "faceDamage",
        round,
        attackerUnitId: attacker.instanceId,
        defendingTeam: opponentTeamId,
        amount,
        remainingLp: opponent.lifePoints,
      });
    }
  }

  switch (attacker.def.class) {
    case "TANK": {
      const amount = attacker.defense;
      dealDamageOrFace(amount);
      const shieldAmount = Math.round(amount * DUEL_ULTIMATE_TANK_SHIELD_FACTOR);
      for (const slot of selfPlayer.field) {
        if (!slot.unit?.isAlive) continue;
        slot.unit.shield += shieldAmount;
        log.push({ type: "shieldApplied", round, sourceId: attacker.instanceId, targetId: slot.unit.instanceId, amount: shieldAmount });
      }
      break;
    }

    case "DAMAGE_DEALER": {
      const amount = Math.round(attacker.attack * DUEL_ULTIMATE_DAMAGE_DEALER_MULTIPLIER);
      if (defenderUnit && defenderUnit.isAlive) {
        const overkill = Math.max(0, amount - defenderUnit.currentHp);
        applyRawDamageToUnit(defenderUnit, amount, attacker.instanceId, log, round);
        const spill = Math.round(overkill * DUEL_ULTIMATE_DAMAGE_DEALER_OVERKILL_FACTOR);
        if (spill > 0) {
          opponent.lifePoints = Math.max(0, opponent.lifePoints - spill);
          log.push({
            type: "faceDamage",
            round,
            attackerUnitId: attacker.instanceId,
            defendingTeam: opponentTeamId,
            amount: spill,
            remainingLp: opponent.lifePoints,
          });
        }
      } else {
        dealDamageOrFace(amount);
      }
      break;
    }

    case "SUPPORT": {
      const healAmount = Math.round(attacker.defense * DUEL_ULTIMATE_SUPPORT_HEAL_MULTIPLIER);
      for (const slot of selfPlayer.field) {
        if (!slot.unit?.isAlive) continue;
        slot.unit.currentHp = Math.min(slot.unit.maxHp, slot.unit.currentHp + healAmount);
        log.push({ type: "heal", round, sourceId: attacker.instanceId, targetId: slot.unit.instanceId, amount: healAmount, newHp: slot.unit.currentHp });
        grantRage(slot.unit, DUEL_ULTIMATE_SUPPORT_RAGE_BONUS, round, asBattleLog(log), "action");
      }
      break;
    }
  }
}

/** Löst EINEN deklarierten Angriff auf. Normalangriff gegen eine Einheit in
 *  Verteidigungsstellung folgt der echten Yu-Gi-Oh-Regel: ATK > DEF zerstört
 *  die Einheit (kein LP-Schaden), ATK < DEF lässt sie unbeschadet überstehen
 *  und schickt die Differenz als LP-Schaden an die ANGREIFENDE Seite zurück,
 *  ATK === DEF passiert nichts. Normalangriff gegen eine Einheit in
 *  Angriffsstellung bleibt beim bestehenden HP-basierten Kampfmodell
 *  (Crit-Chance, Schaden über mehrere Angriffe hinweg). Ultimate läuft über
 *  applyClassUltimate — dort auch die Sonderfälle "Ziel-Slot leer"/"kein
 *  Ziel-Slot" (Direktangriff). */
function resolveDeclaredAttack(
  team: TeamId,
  state: LiveDuelState,
  attacker: BattleUnitState,
  attackType: "normalAttack" | "ultimate",
  targetSlotIndex: number,
  rng: Rng,
  log: DuelLogEntry[],
  round: number
): void {
  if (attackType === "ultimate") {
    applyClassUltimate(team, state, attacker, targetSlotIndex, log, round);
    return;
  }

  const opponentTeamId = opponentTeam(team);
  const opponent = playerState(state, opponentTeamId);
  const defenderUnit = opponent.field[targetSlotIndex]?.unit ?? null;

  if (!defenderUnit || !defenderUnit.isAlive) {
    // Direktangriff — Validierung in applyAction stellt bereits sicher, dass
    // die Gegenseite dafür wirklich keine lebende Einheit mehr hat.
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
    return;
  }

  if (defenderUnit.stance === "defense") {
    if (attacker.attack > defenderUnit.defense) {
      destroyUnit(defenderUnit, log, round);
      log.push({ type: "defenseDestroyed", round, attackerUnitId: attacker.instanceId, defenderUnitId: defenderUnit.instanceId });
    } else if (attacker.attack < defenderUnit.defense) {
      const reflect = defenderUnit.defense - attacker.attack;
      const attackerPlayer = playerState(state, team);
      attackerPlayer.lifePoints = Math.max(0, attackerPlayer.lifePoints - reflect);
      log.push({
        type: "defenseReflect",
        round,
        attackerUnitId: attacker.instanceId,
        defenderUnitId: defenderUnit.instanceId,
        attackerTeam: team,
        amount: reflect,
        remainingLp: attackerPlayer.lifePoints,
      });
    } else {
      log.push({ type: "defenseBounce", round, attackerUnitId: attacker.instanceId, defenderUnitId: defenderUnit.instanceId });
    }
    return;
  }

  // Angriffsstellung gegen Angriffsstellung — jetzt ebenfalls die echte
  // Yu-Gi-Oh-Kampfregel statt des früheren HP-basierten Mehrfach-Treffer-
  // Modells (kein Crit-Chance-Zufall mehr, wie im echten Spiel): der höhere
  // ATK-Wert zerstört die andere Einheit, deren Besitzer die Differenz als
  // LP-Schaden nimmt. Bei Gleichstand werden BEIDE Einheiten zerstört, ohne
  // LP-Schaden.
  if (attacker.attack > defenderUnit.attack) {
    const diff = attacker.attack - defenderUnit.attack;
    destroyUnit(defenderUnit, log, round);
    opponent.lifePoints = Math.max(0, opponent.lifePoints - diff);
    log.push({
      type: "attackClash",
      round,
      winnerUnitId: attacker.instanceId,
      loserUnitId: defenderUnit.instanceId,
      damagedTeam: opponentTeamId,
      amount: diff,
      remainingLp: opponent.lifePoints,
    });
  } else if (attacker.attack < defenderUnit.attack) {
    const diff = defenderUnit.attack - attacker.attack;
    const attackerPlayer = playerState(state, team);
    destroyUnit(attacker, log, round);
    attackerPlayer.lifePoints = Math.max(0, attackerPlayer.lifePoints - diff);
    log.push({
      type: "attackClash",
      round,
      winnerUnitId: defenderUnit.instanceId,
      loserUnitId: attacker.instanceId,
      damagedTeam: team,
      amount: diff,
      remainingLp: attackerPlayer.lifePoints,
    });
  } else {
    destroyUnit(attacker, log, round);
    destroyUnit(defenderUnit, log, round);
    log.push({ type: "attackClashDraw", round, attackerUnitId: attacker.instanceId, defenderUnitId: defenderUnit.instanceId });
  }
}

// ---------- Zugende ----------

function clearDeadUnits(player: DuelPlayerState): void {
  for (const slot of player.field) {
    if (slot.unit && !slot.unit.isAlive) {
      player.graveyardCardIds.push(slot.unit.def.cardId);
      slot.unit = null;
    }
  }
}

/** Eine Seite ohne Handkarten UND ohne Feld-Einheiten hat keine Möglichkeit
 *  mehr, das Spiel zu beeinflussen — zweite Niederlage-Bedingung neben LP <= 0
 *  (bewusst unabhängig vom Deck-Stand: kein separates Deck-Out). */
function hasNoResourcesLeft(player: DuelPlayerState): boolean {
  return player.handCardIds.length === 0 && player.field.every((slot) => !slot.unit);
}

export function checkDuelWinner(playerA: DuelPlayerState, playerB: DuelPlayerState): TeamId | "DRAW" | null {
  const aDown = playerA.lifePoints <= 0 || hasNoResourcesLeft(playerA);
  const bDown = playerB.lifePoints <= 0 || hasNoResourcesLeft(playerB);
  if (aDown && bDown) return "DRAW";
  if (aDown) return "B";
  if (bDown) return "A";
  return null;
}

/** Comeback-Bonus: vereinfacht anhand aktuellem HP-Rückstand am Zugende (nicht
 *  nur Schaden dieses Zugs) — reicht fürs Grundgerüst. Einmal pro Zugende für
 *  die gerade beendende Seite (nicht mehr pro einzelnem Angriff, seit Angriffe
 *  jetzt einzeln statt gebündelt eingereicht werden). */
function grantComebackRage(team: TeamId, state: LiveDuelState, round: number): void {
  const player = playerState(state, team);
  for (const slot of player.field) {
    if (!slot.unit?.isAlive) continue;
    const missingPercent = 1 - slot.unit.currentHp / slot.unit.maxHp;
    if (missingPercent > 0) {
      const bonus = Math.round(DUEL_COMEBACK_RAGE_FACTOR * missingPercent * RAGE_PER_ACTION);
      if (bonus > 0) {
        grantRage(slot.unit, bonus, round, asBattleLog(state.log), "action");
        state.log.push({ type: "comebackBonus", round, unitId: slot.unit.instanceId, amount: bonus });
      }
    }
  }
}

/** Ziehen/Standby (automatisch) + Zugwechsel — analog zum "End Phase"-Übergang
 *  im echten Yu-Gi-Oh. Kein Sonderfall für "kein Draw im allerersten Zug"
 *  nötig: Zug 1 (Startspieler) läuft direkt mit der Starthand, der erste
 *  tatsächliche Kartenzug passiert erst HIER beim Wechsel in Zug 2 — genau
 *  wie im echten Spiel, wo nur der Startspieler seine eigene erste
 *  Ziehphase auslässt. */
function endTurnInternal(state: LiveDuelState, finishingTeam: TeamId, round: number): void {
  grantComebackRage(finishingTeam, state, round);

  const nextTeam = opponentTeam(finishingTeam);
  const nextPlayer = playerState(state, nextTeam);
  drawCards(nextPlayer, DUEL_DRAW_PER_ROUND);

  state.log.push({ type: "roundEnd", round });
  state.activeTeam = nextTeam;
  state.round += 1;
  state.phase = "main1";
  state.normalSummonUsed = false;
  state.tacticPlayedThisTurn = false;
  resetTurnFlags(nextPlayer);
  tickPlayerStatModifiers(nextPlayer);
  state.turnDeadline = Date.now() + DUEL_TURN_TIMEOUT_MS;
}

// ---------- Aktions-Anwendung ----------

function applyAction(state: LiveDuelState, team: TeamId, action: DuelAction): LiveDuelState {
  const rng = createRng(state.rngState);
  const round = state.round;
  const log = state.log;
  const player = playerState(state, team);
  const opponentTeamId = opponentTeam(team);
  const opponent = playerState(state, opponentTeamId);

  switch (action.type) {
    case "summon": {
      if (state.phase !== "main1" && state.phase !== "main2") {
        throw new DuelLiveError("Beschwörung ist nur in einer Hauptphase möglich.");
      }
      if (state.normalSummonUsed) {
        throw new DuelLiveError("Du hast in diesem Zug bereits eine Einheit beschworen.");
      }
      const { handCardId, slotIndex, stance } = action;
      if (!player.handCardIds.includes(handCardId)) {
        throw new DuelLiveError("Diese Karte ist nicht auf deiner Hand.");
      }
      const def = player.unitDefsByCardId[handCardId];
      if (!def) throw new DuelLiveError("Diese Handkarte ist keine Einheiten-Karte.");
      const slot = player.field[slotIndex];
      if (!slot || slot.unit) throw new DuelLiveError("Dieser Feld-Slot ist ungültig oder bereits belegt.");

      const instanceId = `${team}-${slotIndex}-${handCardId}-${round}`;
      const unit = createBattleUnitState(def, team, instanceId);
      unit.stance = stance;
      unit.summonedThisTurn = true;
      slot.unit = unit;
      player.handCardIds = player.handCardIds.filter((id) => id !== handCardId);
      state.normalSummonUsed = true;
      log.push({ type: "summon", round, team, slotIndex, unitId: instanceId, cardId: handCardId });

      triggerTraps(opponentTeamId, state, action, rng, log, round);
      break;
    }

    case "changeStance": {
      if (state.phase !== "main1" && state.phase !== "main2") {
        throw new DuelLiveError("Die Stellung kann nur in einer Hauptphase gewechselt werden.");
      }
      const unit = requireLivingUnit(player, action.slotIndex, "Stellungswechsel für eine leere oder ungültige Position.");
      if (unit.summonedThisTurn) {
        throw new DuelLiveError("Eine gerade erst beschworene Einheit kann ihre Stellung diesen Zug nicht mehr ändern.");
      }
      if (unit.stanceLockedThisTurn) {
        throw new DuelLiveError("Diese Einheit hat ihre Stellung in diesem Zug bereits gewechselt.");
      }
      if (unit.attackedThisTurn) {
        throw new DuelLiveError("Eine Einheit, die bereits angegriffen hat, kann ihre Stellung nicht mehr ändern.");
      }
      unit.stance = action.stance;
      unit.stanceLockedThisTurn = true;
      log.push({ type: "stanceChanged", round, team, slotIndex: action.slotIndex, stance: action.stance });
      break;
    }

    case "playTactic": {
      if (state.phase !== "main1" && state.phase !== "main2") {
        throw new DuelLiveError("Taktik-Karten können nur in einer Hauptphase gespielt werden.");
      }
      if (state.tacticPlayedThisTurn) {
        throw new DuelLiveError("Du hast in diesem Zug bereits eine Taktik-Karte gespielt.");
      }
      const { handCardId, mode } = action;
      if (!player.handCardIds.includes(handCardId)) {
        throw new DuelLiveError("Diese Taktik-Karte ist nicht auf deiner Hand.");
      }
      const def = player.tacticDefsById[handCardId];
      if (!def) throw new DuelLiveError("Diese Handkarte ist keine Taktik-Karte.");
      if (mode === "setFaceDown" && def.kind !== "TRAP") {
        throw new DuelLiveError("Nur Fallen können verdeckt gesetzt werden.");
      }
      if (mode === "instant" && def.kind !== "INSTANT") {
        throw new DuelLiveError("Nur Items können sofort gespielt werden.");
      }

      let forcedTargetId: string | undefined;
      if (mode === "instant") {
        const targetKind = requiresTacticTarget(def);
        if (targetKind) {
          if (action.targetSlotIndex === undefined) {
            throw new DuelLiveError("Für diese Taktikkarte muss ein Ziel gewählt werden.");
          }
          const targetPlayer = targetKind === "enemy" ? opponent : player;
          const targetUnit = targetPlayer.field[action.targetSlotIndex]?.unit;
          if (!targetUnit || !targetUnit.isAlive) throw new DuelLiveError("Ungültiges Ziel.");
          forcedTargetId = targetUnit.instanceId;
        }
      }

      player.handCardIds = player.handCardIds.filter((id) => id !== handCardId);
      state.tacticPlayedThisTurn = true;
      log.push({ type: "tacticPlayed", round, team, tacticCardId: handCardId, mode });

      if (mode === "setFaceDown") {
        player.setTraps.push({ tacticCardId: handCardId, slotIndex: player.setTraps.length });
      } else {
        applyTacticEffects(team, state, def, rng, log, round, forcedTargetId);
        player.graveyardCardIds.push(handCardId);
      }
      break;
    }

    case "declareAttack": {
      if (state.phase !== "battle") throw new DuelLiveError("Angriffe sind nur in der Kampfphase möglich.");
      const attacker = requireLivingUnit(player, action.slotIndex, "Angriff von einer leeren oder ungültigen Position.");
      if (attacker.summonedThisTurn) {
        throw new DuelLiveError("Eine gerade erst beschworene Einheit kann diesen Zug noch nicht angreifen.");
      }
      if (attacker.attackedThisTurn) {
        throw new DuelLiveError("Diese Einheit hat in diesem Zug bereits angegriffen.");
      }
      if (attacker.stance === "defense") {
        throw new DuelLiveError("Eine Einheit in Verteidigungsstellung kann nicht angreifen.");
      }

      const { targetSlotIndex } = action;
      if (targetSlotIndex < 0 || targetSlotIndex >= DUEL_FIELD_SIZE) {
        throw new DuelLiveError("Ungültige Zielposition.");
      }
      const defenderUnit = opponent.field[targetSlotIndex]?.unit ?? null;
      const targetIsEmpty = !defenderUnit || !defenderUnit.isAlive;
      if (targetIsEmpty && opponentHasLivingUnit(opponent)) {
        throw new DuelLiveError("Ein Direktangriff ist nur möglich, wenn die Gegenseite keine Einheit mehr auf dem Feld hat.");
      }
      const ultimateCost = attacker.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST;
      if (action.attackType === "ultimate" && attacker.rage < ultimateCost) {
        throw new DuelLiveError("Nicht genug Rage für das Ultimate.");
      }

      triggerTraps(opponentTeamId, state, action, rng, log, round);
      resolveDeclaredAttack(team, state, attacker, action.attackType, targetSlotIndex, rng, log, round);
      attacker.attackedThisTurn = true;

      if (action.attackType === "ultimate") {
        // Rage-Kosten abziehen — applyClassUltimate löst das Ultimate über
        // eine eigene Formel auf (kein performAction() mehr, siehe dort), das
        // Abziehen der Kosten (vorher Teil von performAction) muss deshalb
        // hier separat passieren, sonst bliebe die Rage-Leiste nach dem
        // Einsatz fälschlich voll.
        attacker.rage = Math.max(0, attacker.rage - ultimateCost);
        log.push({ type: "rageChange", round, unitId: attacker.instanceId, amount: -ultimateCost, newRage: attacker.rage, reason: "action" });
      }

      grantRage(attacker, RAGE_PER_ACTION, round, asBattleLog(log), "action");
      break;
    }

    case "advancePhase": {
      if (state.phase === "main1") state.phase = "battle";
      else if (state.phase === "battle") state.phase = "main2";
      else endTurnInternal(state, team, round);
      break;
    }

    case "endTurn": {
      endTurnInternal(state, team, round);
      break;
    }
  }

  clearDeadUnits(state.playerA);
  clearDeadUnits(state.playerB);
  state.winner = state.winner ?? checkDuelWinner(state.playerA, state.playerB);
  state.rngState = rng.getState();

  if (state.winner && log[log.length - 1]?.type !== "battleEnd") {
    log.push({ type: "battleEnd", winner: state.winner, round: state.round });
  }

  return state;
}

export function submitDuelAction(state: LiveDuelState, team: TeamId, action: DuelAction): LiveDuelState {
  if (state.winner) throw new DuelLiveError("Dieses Duell ist bereits beendet.");
  if (team !== state.activeTeam) throw new DuelLiveError("Du bist gerade nicht am Zug.");
  return applyAction(state, team, action);
}

// ---------- Automatik (Timeout-Fallback + NPC-KI) ----------

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
  return found ? bestIndex : 0; // 0 kann ein leerer Slot sein -> Direktangriff, falls Gegner leer ist
}

/** Für einen singleAlly-Taktikkarten-Effekt der KI/Timeout-Automatik: erste
 *  eigene lebende Feld-Einheit, sonst kein gültiges Ziel. */
function pickDefaultAllySlot(player: DuelPlayerState): number | undefined {
  const index = player.field.findIndex((slot) => slot.unit?.isAlive);
  return index >= 0 ? index : undefined;
}

/** Spielt den REST des aktuellen Zugs automatisch zu Ende — phasenweise
 *  (main1 -> battle -> main2 -> Zugende), exakt wie ein Mensch es über
 *  mehrere Einzelaktionen täte, nur ohne Zwischenstopps. Dient zweifach: (1)
 *  Timeout-Fallback für einen säumigen menschlichen Spieler (siehe
 *  checkDuelTimeout), (2) die komplette "KI" für OMA-Duels-NPC-Kämpfe (siehe
 *  duel-live-battle.ts) — bewusst dieselbe simple Logik für beide Fälle.
 *  Einfache Standard-Entscheidung: beschwört bei freiem Slot + ungenutzter
 *  Normalbeschwörung die erste Einheiten-Karte aus der Hand (Angriffsstellung),
 *  greift danach mit jeder noch verfügbaren eigenen Einheit die gegnerische
 *  Einheit mit der niedrigsten Verteidigung an (kein Ultimate — bewusst
 *  einfach gehalten). */
export function runAutoTurn(state: LiveDuelState, team: TeamId): LiveDuelState {
  let current = state;

  if (current.phase === "main1" && !current.winner) {
    const player = playerState(current, team);
    const opponent = playerState(current, opponentTeam(team));

    const emptySlotIndex = player.field.findIndex((slot) => !slot.unit);
    const summonCardId =
      !current.normalSummonUsed && emptySlotIndex >= 0
        ? player.handCardIds.find((id) => player.unitDefsByCardId[id])
        : undefined;
    if (summonCardId) {
      current = applyAction(current, team, { type: "summon", handCardId: summonCardId, slotIndex: emptySlotIndex, stance: "attack" });
    }

    const tacticCardId =
      !current.winner && !current.tacticPlayedThisTurn ? player.handCardIds.find((id) => player.tacticDefsById[id]) : undefined;
    if (tacticCardId) {
      const def = player.tacticDefsById[tacticCardId];
      const mode: "instant" | "setFaceDown" = def.kind === "TRAP" ? "setFaceDown" : "instant";
      const targetKind = mode === "instant" ? requiresTacticTarget(def) : null;
      const targetSlotIndex =
        targetKind === "enemy"
          ? opponentHasLivingUnit(opponent)
            ? pickDefaultTargetSlot(opponent)
            : undefined
          : targetKind === "ally"
            ? pickDefaultAllySlot(player)
            : undefined;
      // Braucht die Karte ein Ziel, findet aber keins -> die KI verzichtet
      // defensiv auf diese Karte, statt eine unerfüllbare Aktion zu senden.
      if (!targetKind || targetSlotIndex !== undefined) {
        current = applyAction(current, team, { type: "playTactic", handCardId: tacticCardId, mode, targetSlotIndex });
      }
    }

    if (!current.winner) current = applyAction(current, team, { type: "advancePhase" });
  }

  if (current.phase === "battle" && !current.winner) {
    const player = playerState(current, team);
    const opponent = playerState(current, opponentTeam(team));
    for (let slotIndex = 0; slotIndex < player.field.length; slotIndex++) {
      if (current.winner) break;
      const unit = player.field[slotIndex]?.unit;
      if (!unit?.isAlive || unit.summonedThisTurn || unit.attackedThisTurn || unit.stance === "defense") continue;
      const targetSlotIndex = opponentHasLivingUnit(opponent) ? pickDefaultTargetSlot(opponent) : 0;
      const ultimateCost = unit.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST;
      const attackType: "normalAttack" | "ultimate" = unit.rage >= ultimateCost ? "ultimate" : "normalAttack";
      current = applyAction(current, team, { type: "declareAttack", slotIndex, attackType, targetSlotIndex });
    }
    if (!current.winner) current = applyAction(current, team, { type: "advancePhase" });
  }

  if (current.phase === "main2" && !current.winner) {
    current = applyAction(current, team, { type: "advancePhase" }); // main2 -> Zugende
  }

  return current;
}

export function checkDuelTimeout(state: LiveDuelState): LiveDuelState {
  if (state.winner) return state;
  if (Date.now() < state.turnDeadline) return state;

  const team = state.activeTeam;
  if (team === "A") state.timeoutStreakA += 1;
  else state.timeoutStreakB += 1;

  return runAutoTurn(state, team);
}
