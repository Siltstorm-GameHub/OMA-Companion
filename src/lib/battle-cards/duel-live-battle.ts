// ============================================
// OMA Duels (Yu-Gi-Oh-artiges Live-PvP) — DB-Orchestrierung
// ============================================
// Bindeglied zwischen dem reinen Engine-Modul (lib/battle-engine/duels-live.ts)
// und der DB — analog zu live-battle.ts für den alten sequentiellen Modus.
// Ersetzt startLivePvpBattle/getLiveBattleSnapshot/submitLiveBattleAction für
// die beiden alten Duell-Modi (PVP_CHALLENGE/PVP_MATCHMAKING); PVE/OMA-Gems
// bleiben unverändert auf live-battle.ts/interactive.ts.

import { prisma } from "@/lib/prisma";
import type { LiveBattle, Prisma } from "@prisma/client";
import {
  checkDuelTimeout,
  computeAutoSubmission,
  createDuelState,
  submitDuelAction as submitDuelActionPure,
  DuelLiveError,
  type DuelDeckInput,
  type DuelFieldSlot,
  type DuelPlayerState,
  type DuelRoundSubmission,
  type LiveDuelState,
} from "@/lib/battle-engine/duels-live";
import { ULTIMATE_SKILL_COST } from "@/lib/battle-engine/constants";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import type { BattleUnitDefinition, TeamId, UnitClass } from "@/lib/battle-engine/types";
import { assertNpcDailyLimitNotReached, finalizePvpChallengeSideEffects } from "@/lib/battle-cards/live-battle";
import { buildDuelDeckInput } from "@/lib/battle-cards/duel-deck";
import { markTutorialNpcBattleDone } from "@/lib/battle-cards/tutorial";
import {
  DIFFICULTY_LEVEL,
  NPC_BATTLE_WIN_REWARD,
  duelsPveModeFor,
  parseDuelsPveMode,
  type NpcDifficulty,
} from "@/lib/battle-cards/npc-battle-types";

export class LiveDuelBattleError extends Error {}

export const DUEL_MODE = "PVP_DUELS_LIVE";

function toState(live: Pick<LiveBattle, "stateJson">): LiveDuelState {
  return live.stateJson as unknown as LiveDuelState;
}

function toJson(state: LiveDuelState) {
  return JSON.parse(JSON.stringify(state));
}

async function requireAccess(liveBattleId: string, viewerId: string): Promise<LiveBattle> {
  const live = await prisma.liveBattle.findUnique({ where: { id: liveBattleId } });
  if (!live) throw new LiveDuelBattleError("Kampf nicht gefunden.");
  if (live.mode !== DUEL_MODE && !parseDuelsPveMode(live.mode)) {
    throw new LiveDuelBattleError("Das ist kein OMA-Duels-Kampf.");
  }
  if (viewerId !== live.playerAId && viewerId !== live.playerBId) {
    throw new LiveDuelBattleError("Kein Zugriff auf diesen Kampf.");
  }
  return live;
}

function teamOf(live: Pick<LiveBattle, "playerAId" | "playerBId">, viewerId: string): TeamId {
  return viewerId === live.playerAId ? "A" : "B";
}

// ---------- Snapshot (Client-Antwortformat) ----------

export interface LiveDuelUnitSnapshot {
  instanceId: string;
  slotIndex: number;
  name: string;
  class: UnitClass;
  level: number;
  currentHp: number;
  maxHp: number;
  rage: number;
  /** Rage-Kosten des Ultimates — der Client nutzt das, um "bereit"
   *  (rage >= ultimateCost) visuell hervorzuheben. */
  ultimateCost: number;
  isAlive: boolean;
  imageUrl?: string | null;
}

export interface LiveDuelHandCard {
  cardId: string;
  kind: "unit" | "tactic";
  name: string;
  imageUrl?: string | null;
  /** Nur bei kind === "unit". */
  unitClass?: UnitClass;
  /** Nur bei kind === "tactic". */
  tacticKind?: "INSTANT" | "TRAP";
}

export interface LiveDuelPlayerSnapshot {
  lifePoints: number;
  field: (LiveDuelUnitSnapshot | null)[];
  deckCount: number;
  graveyardCount: number;
  trapCount: number;
  /** Nur für den betrachtenden Spieler gesetzt (eigene Hand, mit Anzeige-Infos
   *  aus den bereits im State aufgelösten Definitionen) — die gegnerische Hand
   *  bleibt verdeckt, nur `handCount` verrät die Größe. */
  hand: LiveDuelHandCard[] | null;
  handCount: number;
  hasSubmitted: boolean;
}

export interface LiveDuelSnapshot {
  id: string;
  mode: string;
  status: "active" | "finished";
  round: number;
  roundDeadline: number;
  viewerTeam: TeamId;
  self: LiveDuelPlayerSnapshot;
  opponent: LiveDuelPlayerSnapshot;
  log: LiveDuelState["log"];
  winner: LiveDuelState["winner"];
  playerAId: string;
  playerBId: string | null;
  resultBattleId: string | null;
}

function toUnitSnapshot(slot: DuelFieldSlot, slotIndex: number): LiveDuelUnitSnapshot | null {
  const unit = slot.unit;
  if (!unit) return null;
  return {
    instanceId: unit.instanceId,
    slotIndex,
    name: unit.def.name,
    class: unit.def.class,
    level: unit.def.level,
    currentHp: unit.currentHp,
    maxHp: unit.maxHp,
    rage: unit.rage,
    ultimateCost: unit.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST,
    isAlive: unit.isAlive,
    imageUrl: unit.def.imageUrl,
  };
}

function toHandCard(player: DuelPlayerState, cardId: string): LiveDuelHandCard | null {
  const unitDef = player.unitDefsByCardId[cardId];
  if (unitDef) return { cardId, kind: "unit", name: unitDef.name, unitClass: unitDef.class, imageUrl: unitDef.imageUrl };

  const tacticDef = player.tacticDefsById[cardId];
  if (tacticDef) return { cardId, kind: "tactic", name: tacticDef.name, tacticKind: tacticDef.kind, imageUrl: tacticDef.imageUrl };

  return null; // defensiv, sollte durch createDuelState/resolveDuelRound nicht vorkommen
}

function toPlayerSnapshot(player: DuelPlayerState, hasSubmitted: boolean, revealHand: boolean): LiveDuelPlayerSnapshot {
  return {
    lifePoints: player.lifePoints,
    field: player.field.map(toUnitSnapshot),
    deckCount: player.deckCardIds.length,
    graveyardCount: player.graveyardCardIds.length,
    trapCount: player.setTraps.length,
    hand: revealHand
      ? player.handCardIds.map((id) => toHandCard(player, id)).filter((c): c is LiveDuelHandCard => c !== null)
      : null,
    handCount: player.handCardIds.length,
    hasSubmitted,
  };
}

function buildSnapshot(live: LiveBattle, state: LiveDuelState, viewerId: string): LiveDuelSnapshot {
  const viewerTeam = teamOf(live, viewerId);
  const opponentTeam: TeamId = viewerTeam === "A" ? "B" : "A";
  const selfPlayer = viewerTeam === "A" ? state.playerA : state.playerB;
  const opponentPlayer = viewerTeam === "A" ? state.playerB : state.playerA;

  return {
    id: live.id,
    mode: live.mode,
    status: state.winner ? "finished" : "active",
    round: state.round,
    roundDeadline: state.roundDeadline,
    viewerTeam,
    self: toPlayerSnapshot(selfPlayer, !!state.pendingActions[viewerTeam], true),
    opponent: toPlayerSnapshot(opponentPlayer, !!state.pendingActions[opponentTeam], false),
    log: state.log,
    winner: state.winner,
    playerAId: live.playerAId,
    playerBId: live.playerBId,
    resultBattleId: live.resultBattleId,
  };
}

// ---------- Abschluss ----------

async function finalizeDuelBattle(live: LiveBattle, state: LiveDuelState) {
  if (live.resultBattleId) return; // bereits abgeschlossen (defensiv, z.B. doppelter Request)

  const dbResult = state.winner === "A" ? "WIN" : state.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId: live.playerAId,
      opponentType: live.mode,
      result: dbResult,
      teamSnapshot: { playerAId: live.playerAId, playerBId: live.playerBId },
      battleLog: state.log as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.liveBattle.update({
    where: { id: live.id },
    data: { status: "finished", resultBattleId: battle.id },
  });

  if (live.playerBId) {
    // Elo/Win-Streak/BattleChallenge-Abschluss + Benachrichtigung — geteilt mit
    // dem alten sequentiellen Modus (siehe live-battle.ts), da diese Logik nur
    // `winner`/IDs liest, nicht die interne Zustandsform einer Engine.
    await finalizePvpChallengeSideEffects(live, state.winner, battle.id);
  } else if (state.winner === "A") {
    // OMA-Duels-NPC-Kampf: Münz-Belohnung + Tutorial-Fortschritt, analog zum
    // PVE_-Zweig in finalizeLiveBattle (live-battle.ts) für den alten Modus.
    const pve = parseDuelsPveMode(live.mode);
    if (pve) {
      const reward = NPC_BATTLE_WIN_REWARD[pve.difficulty];
      await prisma.user.update({ where: { id: live.playerAId }, data: { points: { increment: reward } } });
      await prisma.pointTransaction.create({
        data: { userId: live.playerAId, amount: reward, reason: `OMA Duels gewonnen (${pve.difficulty})` },
      });
      if (pve.difficulty === "EASY") {
        await markTutorialNpcBattleDone(live.playerAId);
      }
    }
  }

  return battle;
}

/** Sorgt bei OMA-Duels-NPC-Kämpfen dafür, dass Team B (die KI) sofort für die
 *  aktuelle Runde entscheidet, statt erst per Timeout nach 15s — sonst würde
 *  jede Runde spürbar hängen, obwohl kein echter Mensch drüben sitzt. Nutzt
 *  dieselbe computeAutoSubmission-Logik wie der Timeout-Fallback für säumige
 *  Mitspieler (siehe duels-live.ts), daher keine separate KI nötig. */
function maybeAutoSubmitBot(state: LiveDuelState, mode: string): LiveDuelState {
  if (state.winner) return state;
  if (!parseDuelsPveMode(mode)) return state;
  if (state.pendingActions.B) return state;
  return submitDuelActionPure(state, "B", computeAutoSubmission(state.playerB, state.playerA));
}

async function persistAndMaybeFinalizeDuel(live: LiveBattle, state: LiveDuelState): Promise<{ live: LiveBattle; state: LiveDuelState }> {
  const readyState = maybeAutoSubmitBot(state, live.mode);
  await prisma.liveBattle.update({
    where: { id: live.id },
    data: { stateJson: toJson(readyState), status: readyState.winner ? "finished" : "active" },
  });
  if (readyState.winner) {
    await finalizeDuelBattle(live, readyState);
  }
  const fresh = await prisma.liveBattle.findUniqueOrThrow({ where: { id: live.id } });
  return { live: fresh, state: readyState };
}

// ---------- Erzeugen ----------

/** Erzeugt den LiveBattle zu einer bereits angenommenen OMA-Duels-Herausforderung
 *  und verknüpft ihn direkt mit der BattleChallenge (liveBattleId) — analog zu
 *  startLivePvpBattle im alten Modus, aber deck-/handbasiert statt lineup-basiert. */
export async function startLiveDuelBattle(
  challengeId: string,
  challengerId: string,
  opponentId: string
): Promise<LiveDuelSnapshot> {
  const [deckA, deckB] = await Promise.all([buildDuelDeckInput(challengerId), buildDuelDeckInput(opponentId)]);

  const state = createDuelState(deckA, deckB);

  const live = await prisma.liveBattle.create({
    data: {
      mode: DUEL_MODE,
      playerAId: challengerId,
      playerBId: opponentId,
      stateJson: toJson(state),
      status: state.winner ? "finished" : "active",
    },
  });

  if (state.winner) {
    await finalizeDuelBattle(live, state);
  }

  await prisma.battleChallenge.update({
    where: { id: challengeId },
    data: { status: live.status === "finished" ? "resolved" : "live", liveBattleId: live.id },
  });

  const fresh = await prisma.liveBattle.findUniqueOrThrow({ where: { id: live.id } });
  return buildSnapshot(fresh, state, challengerId);
}

/** Baut ein einfaches KI-Deck aus allen vorhandenen Standard-Karten, hochskaliert
 *  je nach Schwierigkeit (siehe DIFFICULTY_LEVEL) — analog zu startLivePveBattle
 *  im alten Modus, aber ohne feste Teamgröße und bewusst ohne Taktik-Karten
 *  (eine "KI spielt Items/Fallen"-Logik wäre deutlich mehr KI-Aufwand für
 *  wenig Mehrwert in dieser ersten Version). */
async function buildNpcDuelDeckInput(difficulty: NpcDifficulty): Promise<DuelDeckInput> {
  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  if (standardCards.length === 0) {
    throw new LiveDuelBattleError("Keine Standard-Karten für den NPC-Gegner vorhanden.");
  }

  const level = DIFFICULTY_LEVEL[difficulty];
  const unitDefs: Record<string, BattleUnitDefinition> = {};
  for (const card of standardCards) {
    unitDefs[card.id] = cardToBattleUnitDefinition(card, level);
  }

  return { unitDefs, tacticDefs: {}, cardIds: standardCards.map((c) => c.id) };
}

/** Startet einen OMA-Duels-NPC-Kampf im neuen Deck/Feld-Modus — ersetzt
 *  startLivePveBattle (alter sequentieller Modus) für NpcBattleLauncher.tsx.
 *  Braucht ein bereits zusammengestelltes Duell-Deck (siehe duel-deck.ts) —
 *  wie bei PvP gibt es kein Ausweichen auf die alte 5er-PVE-Lineup mehr. */
export async function startDuelPveBattle(userId: string, difficulty: NpcDifficulty): Promise<LiveDuelSnapshot> {
  await assertNpcDailyLimitNotReached(userId);

  const [playerDeck, npcDeck] = await Promise.all([buildDuelDeckInput(userId), buildNpcDuelDeckInput(difficulty)]);

  const mode = duelsPveModeFor(difficulty);
  let state = createDuelState(playerDeck, npcDeck);
  state = maybeAutoSubmitBot(state, mode);

  const live = await prisma.liveBattle.create({
    data: { mode, playerAId: userId, playerBId: null, stateJson: toJson(state), status: state.winner ? "finished" : "active" },
  });

  if (state.winner) {
    await finalizeDuelBattle(live, state);
  }

  const fresh = await prisma.liveBattle.findUniqueOrThrow({ where: { id: live.id } });
  return buildSnapshot(fresh, state, userId);
}

// ---------- Lesen / Aktion ----------

/** Rein lesend im Normalfall. Nur wenn die Runden-Frist bereits abgelaufen
 *  ist, wird lazy weitergespielt + persistiert (kein Sweep-Job, analog zum
 *  Timeout-Zweig in getLiveBattleSnapshot/live-battle.ts) — genau dieser
 *  Poll-Request übernimmt dann die Default-Entscheidung für die säumige Seite. */
export async function getLiveDuelSnapshot(liveBattleId: string, viewerId: string): Promise<LiveDuelSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  const state = toState(live);

  if (live.status === "active" && Date.now() >= state.roundDeadline) {
    const newState = checkDuelTimeout(state);
    const { live: updated, state: finalState } = await persistAndMaybeFinalizeDuel(live, newState);
    return buildSnapshot(updated, finalState, viewerId);
  }

  return buildSnapshot(live, state, viewerId);
}

export async function submitLiveDuelAction(
  liveBattleId: string,
  viewerId: string,
  submission: DuelRoundSubmission
): Promise<LiveDuelSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  if (live.status === "finished") throw new LiveDuelBattleError("Dieses Duell ist bereits beendet.");

  const state = toState(live);
  const team = teamOf(live, viewerId);

  let newState: LiveDuelState;
  try {
    newState = submitDuelActionPure(state, team, submission);
  } catch (err) {
    if (err instanceof DuelLiveError) throw new LiveDuelBattleError(err.message);
    throw err;
  }

  const { live: updated, state: finalState } = await persistAndMaybeFinalizeDuel(live, newState);
  return buildSnapshot(updated, finalState, viewerId);
}
