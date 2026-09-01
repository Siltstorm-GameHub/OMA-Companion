// ============================================
// Interaktive Kämpfe (Zug-für-Zug) — DB-Orchestrierung
// ============================================
// Bindeglied zwischen dem reinen Engine-Stepper (lib/battle-engine/interactive.ts)
// und der DB: erzeugt/lädt/aktualisiert den LiveBattle-Zustand und baut daraus
// das für den Client bestimmte Snapshot-Objekt. Sobald ein Kampf endet, wird er
// wie bisher als normales Battle (+ ggf. resolvte BattleChallenge, Win-Streak)
// persistiert — die restliche App (Replay-Seite, Kampfhistorie, Rangliste,
// Win-Streak) merkt vom neuen interaktiven Ablauf nichts.

import { prisma } from "@/lib/prisma";
import {
  advance,
  applyUltimateInterrupt,
  createInteractiveState,
  describeCurrentDecision,
  previewUpcomingTurns,
  type Controller,
  type InteractiveBattleState,
  type PendingDecision,
} from "@/lib/battle-engine/interactive";
import { candidateTargetIds, describeAvailableActions, type AvailableAction } from "@/lib/battle-engine/decision";
import { buildRosterFromUnits } from "@/lib/battle-engine/stats";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import type { BoardGrid, SwapMove } from "@/lib/battle-engine/board-match3";
import { ULTIMATE_SKILL_COST } from "@/lib/battle-engine/constants";
import type {
  ActionType,
  BattleLogEntry,
  BattleUnitDefinition,
  BattleUnitState,
  BattleWinner,
  TeamId,
} from "@/lib/battle-engine/types";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import { buildBattleTeam } from "@/lib/battle-cards/team-builder";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl, resolveAvatarBadgeUrl } from "@/lib/battle-cards/resolve-image";
import { applyWinStreak } from "@/lib/battle-cards/win-streak";
import {
  DIFFICULTY_LEVEL,
  NPC_BATTLE_DAILY_LIMIT,
  NPC_BATTLE_WIN_REWARD,
  parseNpcMode,
  puzzleModeFor,
  type NpcDifficulty,
} from "@/lib/battle-cards/npc-battle-types";
import type { LiveBattle } from "@prisma/client";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { updateQuestProgress } from "@/lib/quests";

export class LiveBattleError extends Error {}

const TEAM_SIZE = 5;

/** PVP mit beiden Seiten auf Auto-Kampf: pro advance()-Aufruf wird nur EIN Zug
 *  automatisch aufgelöst, statt sofort bis zum Ende durchzulaufen — so bleibt
 *  der Kampf für beide Spieler zuschaubar (Polling deckt den Rest ab). Bei PVE
 *  bleibt es bewusst ungedrosselt (undefined), das entspricht dort weiterhin
 *  einem "Zum Ende springen". */
const PVP_AUTO_PACE_STEPS = 1;

function advanceOptionsFor(playerBId: string | null): { maxAutoActions?: number } {
  return playerBId ? { maxAutoActions: PVP_AUTO_PACE_STEPS } : {};
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Zählt heute (UTC) gestartete NPC-Kämpfe dieses Users, über alle Schwierigkeiten —
 *  Grundlage für NPC_BATTLE_DAILY_LIMIT, damit die Münz-Belohnung nicht gefarmt werden kann. */
async function countNpcBattlesStartedToday(userId: string): Promise<number> {
  return prisma.liveBattle.count({
    where: {
      playerAId: userId,
      playerBId: null,
      mode: { startsWith: "PVE_" },
      createdAt: { gte: startOfTodayUTC() },
    },
  });
}

function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function toState(live: Pick<LiveBattle, "stateJson">): InteractiveBattleState {
  return live.stateJson as unknown as InteractiveBattleState;
}

function toJson(state: InteractiveBattleState) {
  return JSON.parse(JSON.stringify(state));
}

// ---------- Snapshot (Client-Antwortformat) ----------

export interface LiveUnitSnapshot {
  instanceId: string;
  teamId: TeamId;
  name: string;
  class: BattleUnitDefinition["class"];
  level: number;
  currentHp: number;
  maxHp: number;
  rage: number;
  /** Rage-Kosten des Ultimates dieser Einheit — der Client braucht das, um zu
   *  wissen, wann eine Heldenkarte "voll" und per Klick sofort auslösbar ist
   *  (siehe applyUltimateInterrupt / /live/[id]/ultimate). */
  ultimateCost: number;
  isAlive: boolean;
  imageUrl?: string | null;
  avatarBadgeUrl?: string | null;
}

export interface LiveBattleAwaiting {
  unitId: string;
  teamId: TeamId;
  controlledByPlayerId: string;
  actions: AvailableAction[];
  candidateTargetsByAction: Partial<Record<ActionType, string[]>>;
  /** Epoch-ms — ab hier entscheidet die KI-Logik automatisch, falls niemand reagiert. */
  deadline: number | null;
  /** Nur im Puzzle-Modus (siehe board-match3.ts) — initiales Grid für die
   *  Match-3-Mini-Session dieses Zugs. */
  board: { grid: BoardGrid; moveBudget: number } | null;
}

export interface LiveBattleSnapshot {
  id: string;
  mode: string;
  status: "active" | "finished";
  round: number;
  units: LiveUnitSnapshot[];
  upcoming: string[];
  recentLog: BattleLogEntry[];
  awaiting: LiveBattleAwaiting | null;
  autoA: boolean;
  autoB: boolean;
  playerAId: string;
  playerBId: string | null;
  resultBattleId: string | null;
  winner: BattleWinner | null;
}

const RECENT_LOG_TAIL = 12;

function toUnitSnapshot(u: BattleUnitState): LiveUnitSnapshot {
  return {
    instanceId: u.instanceId,
    teamId: u.teamId,
    name: u.def.name,
    class: u.def.class,
    level: u.def.level,
    currentHp: u.currentHp,
    maxHp: u.maxHp,
    rage: u.rage,
    ultimateCost: u.def.ultimateSkill.cost ?? ULTIMATE_SKILL_COST,
    isAlive: u.isAlive,
    imageUrl: u.def.imageUrl,
    avatarBadgeUrl: u.def.avatarBadgeUrl,
  };
}

function buildSnapshot(
  live: Pick<LiveBattle, "id" | "mode" | "playerAId" | "playerBId" | "resultBattleId">,
  state: InteractiveBattleState,
  pendingDecision: PendingDecision | null
): LiveBattleSnapshot {
  const allUnits = [...state.unitsA, ...state.unitsB];

  let awaiting: LiveBattleAwaiting | null = null;
  if (pendingDecision) {
    const controlledByPlayerId = pendingDecision.teamId === "A" ? live.playerAId : (live.playerBId as string);
    awaiting = { ...pendingDecision, controlledByPlayerId, deadline: state.turnDeadline };
  }

  return {
    id: live.id,
    mode: live.mode,
    status: state.winner ? "finished" : "active",
    round: state.round,
    units: allUnits.map(toUnitSnapshot),
    upcoming: previewUpcomingTurns(state, 5),
    recentLog: state.log.slice(-RECENT_LOG_TAIL),
    awaiting,
    autoA: state.autoA,
    autoB: state.autoB,
    playerAId: live.playerAId,
    playerBId: live.playerBId,
    resultBattleId: live.resultBattleId,
    winner: state.winner,
  };
}

async function requireAccess(liveBattleId: string, viewerId: string) {
  const live = await prisma.liveBattle.findUnique({ where: { id: liveBattleId } });
  if (!live) throw new LiveBattleError("Kampf nicht gefunden.");
  if (viewerId !== live.playerAId && viewerId !== live.playerBId) {
    throw new LiveBattleError("Kein Zugriff auf diesen Kampf.");
  }
  return live;
}

// ---------- Abschluss: wie bisher als Battle (+ Challenge/Win-Streak) persistieren ----------

async function finalizeLiveBattle(live: LiveBattle, state: InteractiveBattleState) {
  if (live.resultBattleId) return; // bereits abgeschlossen (defensiv, z.B. doppelter Request)

  const allUnits = [...state.unitsA, ...state.unitsB];
  const roster = buildRosterFromUnits(allUnits);
  const dbResult = state.winner === "A" ? "WIN" : state.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId: live.playerAId,
      opponentType: live.mode,
      result: dbResult,
      teamSnapshot: { playerAId: live.playerAId, playerBId: live.playerBId },
      battleLog: serializeBattleLog(state.log, roster),
    },
  });

  await prisma.liveBattle.update({
    where: { id: live.id },
    data: { status: "finished", resultBattleId: battle.id },
  });

  if (live.playerBId) {
    const challenge = await prisma.battleChallenge.findUnique({ where: { liveBattleId: live.id } });
    if (challenge) {
      const winnerId = state.winner === "A" ? live.playerAId : state.winner === "B" ? live.playerBId : null;
      await prisma.battleChallenge.update({
        where: { id: challenge.id },
        data: { status: "resolved", battleId: battle.id, winnerId, respondedAt: new Date() },
      });
      if (winnerId) {
        const loserId = winnerId === live.playerAId ? live.playerBId : live.playerAId;
        await applyWinStreak(winnerId, loserId);
      }
      await notifyPvpBattleResolved(live.playerAId, live.playerBId, winnerId, battle.id);
    }
  } else if (state.winner === "A" && live.mode.startsWith("PVE_")) {
    const parsed = parseNpcMode(live.mode);
    const reward = parsed ? NPC_BATTLE_WIN_REWARD[parsed.difficulty] : undefined;
    if (parsed && reward) {
      await prisma.user.update({ where: { id: live.playerAId }, data: { points: { increment: reward } } });
      await prisma.pointTransaction.create({
        data: {
          userId: live.playerAId,
          amount: reward,
          reason: `${parsed.isPuzzle ? "Edelstein-Kampf" : "NPC-Kampf"} gewonnen (${parsed.difficulty})`,
        },
      });
    }
  }

  return battle;
}

/** Quest-Fortschritt + Ergebnis-Benachrichtigung für beide Teilnehmer — für
 *  Challenge-Annahme UND Matchmaking gleichermaßen (beide laufen inzwischen
 *  über denselben LiveBattle-Abschluss, statt es je Aufrufer zu duplizieren). */
async function notifyPvpBattleResolved(
  playerAId: string,
  playerBId: string,
  winnerId: string | null,
  battleId: string
) {
  updateQuestProgress(playerAId, "BATTLE_CARD_DUEL", 1).catch(() => {});
  updateQuestProgress(playerBId, "BATTLE_CARD_DUEL", 1).catch(() => {});

  const [playerA, playerB] = await Promise.all([
    prisma.user.findUnique({ where: { id: playerAId }, select: { username: true, name: true } }),
    prisma.user.findUnique({ where: { id: playerBId }, select: { username: true, name: true } }),
  ]);
  const nameA = playerA?.username ?? playerA?.name ?? "Gegner";
  const nameB = playerB?.username ?? playerB?.name ?? "Gegner";
  const url = `/battle-cards/battles/${battleId}`;

  dispatchNotification("battle_result", {
    users: [playerAId],
    urlOverride: url,
    placeholders: {
      "{result}":
        winnerId === playerAId
          ? `Du hast gegen ${nameB} gewonnen!`
          : winnerId === playerBId
            ? `Du hast gegen ${nameB} verloren.`
            : `Unentschieden gegen ${nameB}.`,
    },
  }).catch(() => {});
  dispatchNotification("battle_result", {
    users: [playerBId],
    urlOverride: url,
    placeholders: {
      "{result}":
        winnerId === playerBId
          ? `Du hast gegen ${nameA} gewonnen!`
          : winnerId === playerAId
            ? `Du hast gegen ${nameA} verloren.`
            : `Unentschieden gegen ${nameA}.`,
    },
  }).catch(() => {});
}

async function persistAndMaybeFinalize(live: LiveBattle, state: InteractiveBattleState) {
  await prisma.liveBattle.update({
    where: { id: live.id },
    data: { stateJson: toJson(state), status: state.winner ? "finished" : "active" },
  });
  if (state.winner) {
    await finalizeLiveBattle(live, state);
  }
  return prisma.liveBattle.findUniqueOrThrow({ where: { id: live.id } });
}

// ---------- Erzeugen ----------

async function createLiveBattle(
  mode: string,
  playerAId: string,
  playerBId: string | null,
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[],
  controllers: { A: Controller; B: Controller },
  boardMode = false
): Promise<LiveBattleSnapshot> {
  const created = createInteractiveState(teamA, teamB, controllers, { boardMode });
  const { state, pendingDecision } = advance(created, undefined, advanceOptionsFor(playerBId));

  const live = await prisma.liveBattle.create({
    data: {
      mode,
      playerAId,
      playerBId,
      stateJson: toJson(state),
      status: state.winner ? "finished" : "active",
    },
  });

  if (state.winner) {
    await finalizeLiveBattle(live, state);
  }

  const fresh = await prisma.liveBattle.findUniqueOrThrow({ where: { id: live.id } });
  return buildSnapshot(fresh, state, pendingDecision);
}

/** Baut Spieler- und NPC-Team für einen PVE-Kampf (Auto-Kampf UND Puzzle-Modus
 *  teilen sich dieselbe Aufstellungs-/Gegner-Logik) — zentral hier, damit
 *  startLivePveBattle und startLivePvePuzzleBattle nicht auseinanderlaufen. */
async function buildPveTeams(
  userId: string,
  difficulty: NpcDifficulty
): Promise<{ teamA: BattleUnitDefinition[]; teamB: BattleUnitDefinition[] }> {
  const startedToday = await countNpcBattlesStartedToday(userId);
  if (startedToday >= NPC_BATTLE_DAILY_LIMIT) {
    throw new LiveBattleError(
      `Heutiges Limit erreicht (max. ${NPC_BATTLE_DAILY_LIMIT} NPC-Kämpfe pro Tag). Versuch es morgen wieder.`
    );
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });
  if (userCards.length === 0) throw new LiveBattleError("Noch kein Start-Pack gewählt.");

  const lineup = userCards.filter((uc) => uc.inLineup);
  const playerTeamCards = (lineup.length > 0 ? lineup : userCards).slice(0, TEAM_SIZE);

  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  const opponentCards = sampleWithoutReplacement(standardCards, TEAM_SIZE);

  const avatarByDiscordId = await resolveAvatarsForCards([
    ...playerTeamCards.map((uc) => uc.card),
    ...opponentCards,
  ]);
  const teamA = playerTeamCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
  const npcLevel = DIFFICULTY_LEVEL[difficulty];
  const teamB = opponentCards.map((card) =>
    cardToBattleUnitDefinition(
      card,
      npcLevel,
      resolveCardImageUrl(card, avatarByDiscordId),
      resolveAvatarBadgeUrl(card, avatarByDiscordId)
    )
  );

  return { teamA, teamB };
}

export async function startLivePveBattle(userId: string, difficulty: NpcDifficulty): Promise<LiveBattleSnapshot> {
  const { teamA, teamB } = await buildPveTeams(userId, difficulty);
  return createLiveBattle(`PVE_${difficulty}`, userId, null, teamA, teamB, { A: "human", B: "ai" });
}

/** Wie startLivePveBattle, aber im Match-3-"Edelstein-Kampf"-Modus (siehe
 *  board-match3.ts): der Spieler erzeugt Rage über ein Puzzle-Brett statt rein
 *  automatisch. Teilt sich Aufstellung/Gegner-Logik und Tageslimit mit dem
 *  bestehenden Auto-Kampf-PVE (siehe countNpcBattlesStartedToday). */
export async function startLivePvePuzzleBattle(userId: string, difficulty: NpcDifficulty): Promise<LiveBattleSnapshot> {
  const { teamA, teamB } = await buildPveTeams(userId, difficulty);
  return createLiveBattle(puzzleModeFor(difficulty), userId, null, teamA, teamB, { A: "human", B: "ai" }, true);
}

/** Erzeugt den LiveBattle zu einer bereits angenommenen/gematchten PVP-Begegnung
 *  und verknüpft ihn direkt mit der BattleChallenge (liveBattleId). */
export async function startLivePvpBattle(
  challengeId: string,
  challengerId: string,
  opponentId: string,
  mode: "PVP_CHALLENGE" | "PVP_MATCHMAKING"
): Promise<LiveBattleSnapshot> {
  const [teamAResult, teamBResult] = await Promise.all([buildBattleTeam(challengerId), buildBattleTeam(opponentId)]);
  if (teamAResult.units.length === 0 || teamBResult.units.length === 0) {
    throw new LiveBattleError("Ein Spieler hat keine gültige Startaufstellung mehr.");
  }

  const snapshot = await createLiveBattle(mode, challengerId, opponentId, teamAResult.units, teamBResult.units, {
    A: "human",
    B: "human",
  });

  await prisma.battleChallenge.update({
    where: { id: challengeId },
    data: { status: snapshot.status === "finished" ? "resolved" : "live", liveBattleId: snapshot.id },
  });

  return snapshot;
}

// ---------- Lesen / Aktion / Auto-Kampf ----------

export async function getLiveBattleSnapshot(liveBattleId: string, viewerId: string): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  const state = toState(live);

  // Normalerweise rein lesend — advance() NICHT aufrufen: das würde bei aktiviertem
  // Auto-Kampf sofort weiterspielen, aber ein reiner Read-Pfad persistiert nichts,
  // der Fortschritt ginge beim nächsten Poll wieder verloren (siehe
  // describeCurrentDecision-Doku). Zwei Ausnahmen, die beide fortsetzen + persistieren:
  //  - Zug-Timeout abgelaufen: es gibt keinen Hintergrund-Job, der das sonst
  //    durchsetzen würde, also übernimmt genau dieser Poll-Request die KI-Entscheidung.
  //  - Mitten in einem gedrosselten Auto-Kampf-Durchlauf (beide PVP-Seiten auf Auto,
  //    siehe PVP_AUTO_PACE_STEPS): weder Timeout noch awaitingUnitId, aber auch noch
  //    nicht beendet — genau dieser Poll-Request löst den nächsten Zug aus, dadurch
  //    entfaltet sich der Kampf für Zuschauer schrittweise statt in einem Sprung.
  const timedOut = !!state.awaitingUnitId && state.turnDeadline !== null && Date.now() >= state.turnDeadline;
  const midAutoRun = !state.winner && !state.awaitingUnitId;
  if (timedOut || midAutoRun) {
    const { state: newState, pendingDecision } = advance(state, undefined, advanceOptionsFor(live.playerBId));
    const updated = await persistAndMaybeFinalize(live, newState);
    return buildSnapshot(updated, newState, pendingDecision);
  }

  return buildSnapshot(live, state, describeCurrentDecision(state));
}

export async function submitLiveBattleAction(
  liveBattleId: string,
  viewerId: string,
  actionType: ActionType,
  targetId: string | undefined,
  boardSwaps?: SwapMove[]
): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  if (live.status === "finished") throw new LiveBattleError("Dieser Kampf ist bereits beendet.");

  const state = toState(live);
  if (!state.awaitingUnitId) throw new LiveBattleError("Gerade wartet niemand auf eine Entscheidung.");

  const allUnits = [...state.unitsA, ...state.unitsB];
  const unit = allUnits.find((u) => u.instanceId === state.awaitingUnitId);
  if (!unit) throw new LiveBattleError("Aktive Einheit nicht gefunden.");

  const controllingPlayerId = unit.teamId === "A" ? live.playerAId : live.playerBId;
  if (controllingPlayerId !== viewerId) throw new LiveBattleError("Du bist gerade nicht am Zug.");

  const available = describeAvailableActions(unit, allUnits);
  const chosen = available.find((a) => a.actionType === actionType);
  if (!chosen) throw new LiveBattleError("Diese Aktion ist gerade nicht verfügbar.");

  let resolvedTargetId: string | undefined;
  if (chosen.targetKind !== "none") {
    const candidates = candidateTargetIds(unit, chosen.targetKind, allUnits);
    if (!targetId || !candidates.includes(targetId)) throw new LiveBattleError("Ungültiges Ziel.");
    resolvedTargetId = targetId;
  }

  const { state: newState, pendingDecision } = advance(
    state,
    { actionType, targetId: resolvedTargetId, boardSwaps: state.boardMode ? boardSwaps : undefined },
    advanceOptionsFor(live.playerBId)
  );
  const updated = await persistAndMaybeFinalize(live, newState);
  return buildSnapshot(updated, newState, pendingDecision);
}

/** Löst ein Ultimate SOFORT aus, unabhängig von der Zugreihenfolge (siehe
 *  applyUltimateInterrupt) — z.B. per Klick auf eine Heldenkarte mit vollem
 *  Rage-Balken, auch während gerade eine ANDERE eigene Einheit am Zug ist. */
export async function submitUltimateInterrupt(
  liveBattleId: string,
  viewerId: string,
  casterId: string,
  targetId: string | undefined
): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  if (live.status === "finished") throw new LiveBattleError("Dieser Kampf ist bereits beendet.");

  const state = toState(live);
  const caster = [...state.unitsA, ...state.unitsB].find((u) => u.instanceId === casterId);
  if (!caster) throw new LiveBattleError("Einheit nicht gefunden.");

  const controllingPlayerId = caster.teamId === "A" ? live.playerAId : live.playerBId;
  if (controllingPlayerId !== viewerId) throw new LiveBattleError("Das ist nicht deine Einheit.");

  const { state: newState, pendingDecision, applied } = applyUltimateInterrupt(state, casterId, targetId);
  if (!applied) throw new LiveBattleError("Ultimate ist gerade nicht verfügbar (Rage zu niedrig?).");

  const updated = await persistAndMaybeFinalize(live, newState);
  return buildSnapshot(updated, newState, pendingDecision);
}

export async function setLiveBattleAuto(liveBattleId: string, viewerId: string, on: boolean): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  if (live.status === "finished") throw new LiveBattleError("Dieser Kampf ist bereits beendet.");

  const state = toState(live);
  if (viewerId === live.playerAId) state.autoA = on;
  else state.autoB = on;

  const { state: newState, pendingDecision } = advance(state, undefined, advanceOptionsFor(live.playerBId));
  const updated = await persistAndMaybeFinalize(live, newState);
  return buildSnapshot(updated, newState, pendingDecision);
}
