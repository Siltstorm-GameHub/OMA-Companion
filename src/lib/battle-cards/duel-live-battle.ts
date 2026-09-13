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
  createDuelState,
  submitDuelAction as submitDuelActionPure,
  DuelLiveError,
  type DuelFieldSlot,
  type DuelPlayerState,
  type DuelRoundSubmission,
  type LiveDuelState,
} from "@/lib/battle-engine/duels-live";
import type { TeamId, UnitClass } from "@/lib/battle-engine/types";
import { finalizePvpChallengeSideEffects } from "@/lib/battle-cards/live-battle";
import { buildDuelDeckInput } from "@/lib/battle-cards/duel-deck";

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
  if (live.mode !== DUEL_MODE) throw new LiveDuelBattleError("Das ist kein OMA-Duels-Kampf.");
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
  isAlive: boolean;
  imageUrl?: string | null;
}

export interface LiveDuelPlayerSnapshot {
  lifePoints: number;
  field: (LiveDuelUnitSnapshot | null)[];
  deckCount: number;
  graveyardCount: number;
  trapCount: number;
  /** Nur für den betrachtenden Spieler gesetzt (eigene Hand) — die gegnerische
   *  Hand bleibt verdeckt, nur `handCount` verrät die Größe. */
  handCardIds: string[] | null;
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
    isAlive: unit.isAlive,
    imageUrl: unit.def.imageUrl,
  };
}

function toPlayerSnapshot(player: DuelPlayerState, hasSubmitted: boolean, revealHand: boolean): LiveDuelPlayerSnapshot {
  return {
    lifePoints: player.lifePoints,
    field: player.field.map(toUnitSnapshot),
    deckCount: player.deckCardIds.length,
    graveyardCount: player.graveyardCardIds.length,
    trapCount: player.setTraps.length,
    handCardIds: revealHand ? player.handCardIds : null,
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

  // Elo/Win-Streak/BattleChallenge-Abschluss + Benachrichtigung — geteilt mit
  // dem alten sequentiellen Modus (siehe live-battle.ts), da diese Logik nur
  // `winner`/IDs liest, nicht die interne Zustandsform einer Engine.
  await finalizePvpChallengeSideEffects(live, state.winner, battle.id);

  return battle;
}

async function persistAndMaybeFinalizeDuel(live: LiveBattle, state: LiveDuelState) {
  await prisma.liveBattle.update({
    where: { id: live.id },
    data: { stateJson: toJson(state), status: state.winner ? "finished" : "active" },
  });
  if (state.winner) {
    await finalizeDuelBattle(live, state);
  }
  return prisma.liveBattle.findUniqueOrThrow({ where: { id: live.id } });
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
    const updated = await persistAndMaybeFinalizeDuel(live, newState);
    return buildSnapshot(updated, newState, viewerId);
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

  const updated = await persistAndMaybeFinalizeDuel(live, newState);
  return buildSnapshot(updated, newState, viewerId);
}
