// ============================================
// OMA Gems — interaktive Kämpfe (Zug für Zug) — DB-Orchestrierung
// ============================================
// Bindeglied zwischen dem reinen Engine-Stepper (lib/battle-engine/interactive.ts)
// und der DB: erzeugt/lädt/aktualisiert den LiveBattle-Zustand und baut daraus
// das für den Client bestimmte Snapshot-Objekt. Sobald ein Kampf endet, wird er
// als normales Battle persistiert (Replay-Seite).
//
// Seit der Reduktion auf OMA Gems gibt es nur noch zwei Modi, beide auf dem
// Match-3-Brett gegen KI-gesteuerte Monster:
//  - Kampagne ("CAMPAIGN_<levelId>", siehe campaign.ts)
//  - Event-Turnier ("TOURNAMENT_<id>", siehe gems-tournament.ts)

import type { TeCharacterConfig } from "@/lib/te-character";
import { prisma } from "@/lib/prisma";
import {
  advance,
  applyUltimateInterrupt,
  createInteractiveState,
  describeCurrentDecision,
  previewUpcomingTurns,
  recordBoardProgress,
  type InteractiveBattleState,
  type PendingDecision,
} from "@/lib/battle-engine/interactive";
import { buildRosterFromUnits } from "@/lib/battle-engine/stats";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import type { BoardGrid, SpecialGrid, SwapMove } from "@/lib/battle-engine/board-match3";
import { ULTIMATE_SKILL_COST } from "@/lib/battle-engine/constants";
import type {
  ActiveStatModifier,
  BattleLogEntry,
  BattleUnitDefinition,
  BattleUnitState,
  BattleWinner,
  TeamId,
} from "@/lib/battle-engine/types";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import {
  buildCampaignEnemyTeam,
  CAMPAIGN_COINS_PER_STAR,
  computeStars,
  getCampaignLevel,
  isCampaignLevelUnlocked,
  recordCampaignResult,
} from "@/lib/battle-cards/campaign";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl, resolveAvatarBadgeUrl } from "@/lib/battle-cards/resolve-image";
import { parseTournamentMode, tournamentModeFor } from "@/lib/battle-cards/npc-battle-types";
import type { LiveBattle } from "@prisma/client";
import { updateQuestProgress } from "@/lib/quests";

export class LiveBattleError extends Error {}

const TEAM_SIZE = 5;

const CAMPAIGN_MODE_PREFIX = "CAMPAIGN_";
const TOURNAMENT_MODE_PREFIX = "TOURNAMENT_";

/** Nur Kampagne und Turnier werden noch unterstützt — ältere, noch offene Kämpfe aus
 *  abgeschalteten Modi (Duels, PvP, freies PvE) lassen sich nicht mehr fortsetzen. */
function isSupportedMode(mode: string): boolean {
  return mode.startsWith(CAMPAIGN_MODE_PREFIX) || mode.startsWith(TOURNAMENT_MODE_PREFIX);
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
  teCharacter?: TeCharacterConfig | null;
  /** Aktive Stat-Buffs/-Debuffs (Angriff/Verteidigung/Speed) — für die
   *  Buff/Debuff-Icons auf der Heldenkarte, siehe UnitCard in LiveBattleView.tsx. */
  statModifiers: ActiveStatModifier[];
}

export interface LiveBattleAwaiting {
  unitId: string;
  teamId: TeamId;
  controlledByPlayerId: string;
  /** Initiales Grid für die Match-3-Mini-Session dieses Zugs sowie bislang bestätigte
   *  Swaps (für die Wiederherstellung nach einem Reload, siehe saveBoardProgress). */
  board: { grid: BoardGrid; specials: SpecialGrid; moveBudget: number; appliedSwaps: SwapMove[] } | null;
}

export interface LiveBattleSnapshot {
  id: string;
  mode: string;
  status: "active" | "finished";
  round: number;
  units: LiveUnitSnapshot[];
  upcoming: string[];
  recentLog: BattleLogEntry[];
  /** Gesamtzahl aller Log-Einträge seit Kampfbeginn (nicht nur `recentLog`,
   *  das nur die letzten RECENT_LOG_TAIL zeigt) — der Client nutzt das, um
   *  zwischen zwei Snapshots zuverlässig zu erkennen, welche Einträge NEU
   *  sind (für Kampfeffekte/Animationen, siehe LiveBattleView.tsx). */
  logLength: number;
  awaiting: LiveBattleAwaiting | null;
  playerAId: string;
  resultBattleId: string | null;
  winner: BattleWinner | null;
  /** Nur gesetzt für einen gewonnenen Kampagnen-Kampf — Sterne-Ergebnis (siehe
   *  computeStars/recordCampaignResult in campaign.ts), das der Client im
   *  Kampfende-Screen mit Animation zeigt (neu hinzugekommene Sterne
   *  hervorgehoben). */
  campaignResult: { levelId: string; stars: 1 | 2 | 3; starsGained: number; coinsAwarded: number } | null;
}

const RECENT_LOG_TAIL = 12;
/** Großzügiger Vorschau-Puffer: der Client filtert "upcoming" auf reine Gegner-Züge
 *  ("Nächste Gegner-Angriffe"), eigene Slots sind bei OMA Gems bedeutungslos. */
const UPCOMING_PREVIEW = 12;

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
    teCharacter: u.def.teCharacter ?? null,
    statModifiers: u.statModifiers,
  };
}

async function buildSnapshot(
  live: Pick<LiveBattle, "id" | "mode" | "playerAId" | "resultBattleId">,
  state: InteractiveBattleState,
  pendingDecision: PendingDecision | null
): Promise<LiveBattleSnapshot> {
  const awaiting: LiveBattleAwaiting | null = pendingDecision
    ? { ...pendingDecision, controlledByPlayerId: live.playerAId }
    : null;

  // Sterne-Ergebnis der Kampagne wird am Battle-Datensatz gespeichert (siehe finalizeLiveBattle).
  let campaignResult: LiveBattleSnapshot["campaignResult"] = null;
  if (live.mode.startsWith(CAMPAIGN_MODE_PREFIX) && live.resultBattleId) {
    const battle = await prisma.battle.findUnique({
      where: { id: live.resultBattleId },
      select: { teamSnapshot: true },
    });
    const snapshotJson = battle?.teamSnapshot as { campaignResult?: LiveBattleSnapshot["campaignResult"] } | null;
    campaignResult = snapshotJson?.campaignResult ?? null;
  }

  return {
    id: live.id,
    mode: live.mode,
    status: state.winner ? "finished" : "active",
    round: state.round,
    units: [...state.unitsA, ...state.unitsB].map(toUnitSnapshot),
    upcoming: previewUpcomingTurns(state, UPCOMING_PREVIEW),
    recentLog: state.log.slice(-RECENT_LOG_TAIL),
    logLength: state.log.length,
    awaiting,
    playerAId: live.playerAId,
    resultBattleId: live.resultBattleId,
    winner: state.winner,
    campaignResult,
  };
}

async function requireAccess(liveBattleId: string, viewerId: string) {
  const live = await prisma.liveBattle.findUnique({ where: { id: liveBattleId } });
  if (!live) throw new LiveBattleError("Kampf nicht gefunden.");
  if (viewerId !== live.playerAId) throw new LiveBattleError("Kein Zugriff auf diesen Kampf.");
  if (!isSupportedMode(live.mode)) {
    throw new LiveBattleError("Dieser Kampf stammt aus einem abgeschalteten Spielmodus und lässt sich nicht mehr öffnen.");
  }
  return live;
}

// ---------- Abschluss: als Battle persistieren, Belohnungen ----------

async function finalizeLiveBattle(live: LiveBattle, state: InteractiveBattleState) {
  if (live.resultBattleId) return; // bereits abgeschlossen (defensiv, z.B. doppelter Request)

  const roster = buildRosterFromUnits([...state.unitsA, ...state.unitsB]);
  const dbResult = state.winner === "A" ? "WIN" : state.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId: live.playerAId,
      opponentType: live.mode,
      result: dbResult,
      teamSnapshot: { playerAId: live.playerAId },
      battleLog: serializeBattleLog(state.log, roster),
    },
  });

  await prisma.liveBattle.update({
    where: { id: live.id },
    data: { status: "finished", resultBattleId: battle.id },
  });

  // Monats-Quest "BATTLE_CARD_DUEL" zählt jeden beendeten Kampf (Sieg oder Niederlage).
  updateQuestProgress(live.playerAId, "BATTLE_CARD_DUEL", 1).catch(() => {});

  const tournament = parseTournamentMode(live.mode);
  if (tournament) {
    const hpTotal = state.unitsA.reduce((sum, u) => sum + u.maxHp, 0);
    const hpRemaining = state.unitsA.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
    const hpPercent = hpTotal > 0 ? hpRemaining / hpTotal : 0;
    const score = Math.max(0, (state.winner === "A" ? 1000 : 0) + Math.round(hpPercent * 500) - state.round * 10);

    const key = { tournamentId_userId: { tournamentId: tournament.gemsTournamentId, userId: live.playerAId } };
    const existing = await prisma.gemsTournamentAttempt.findUnique({ where: key });
    if (!existing || score > existing.bestScore) {
      await prisma.gemsTournamentAttempt.upsert({
        where: key,
        create: { tournamentId: tournament.gemsTournamentId, userId: live.playerAId, bestScore: score },
        update: { bestScore: score },
      });
    }
  } else if (state.winner === "A" && live.mode.startsWith(CAMPAIGN_MODE_PREFIX)) {
    const levelId = live.mode.slice(CAMPAIGN_MODE_PREFIX.length);
    const stars = computeStars(state);
    const { starsGained } = await recordCampaignResult(live.playerAId, levelId, stars);
    // Münz-Belohnung nur für NEU erreichte Sterne (CAMPAIGN_COINS_PER_STAR je
    // Stern) — schon erreichte Sterne zahlen bei erneutem Sieg nicht nochmal
    // aus, sonst ließe sich durch wiederholtes Replayen unbegrenzt farmen.
    let coinsAwarded = 0;
    if (starsGained > 0) {
      const levelDef = getCampaignLevel(levelId);
      coinsAwarded = starsGained * CAMPAIGN_COINS_PER_STAR;
      await prisma.user.update({ where: { id: live.playerAId }, data: { points: { increment: coinsAwarded } } });
      await prisma.pointTransaction.create({
        data: {
          userId: live.playerAId,
          amount: coinsAwarded,
          reason: `Kampagnen-Level: ${starsGained} neue${starsGained === 1 ? "r" : ""} Stern${starsGained === 1 ? "" : "e"} (${levelDef?.name ?? levelId})`,
        },
      });
    }
    // Sterne-Ergebnis am Battle-Datensatz speichern, damit der Client es direkt
    // im nächsten Snapshot als Animation im Kampfende-Screen zeigen kann.
    await prisma.battle.update({
      where: { id: battle.id },
      data: { teamSnapshot: { playerAId: live.playerAId, campaignResult: { levelId, stars, starsGained, coinsAwarded } } },
    });
  }

  return battle;
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
  teamA: BattleUnitDefinition[],
  teamB: BattleUnitDefinition[]
): Promise<LiveBattleSnapshot> {
  const created = createInteractiveState(teamA, teamB);
  const { state, pendingDecision } = advance(created, undefined);

  const live = await prisma.liveBattle.create({
    data: {
      mode,
      playerAId,
      playerBId: null,
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

/** Baut das Spieler-Team aus der Startaufstellung (sonst die ersten TEAM_SIZE eigenen Karten).
 *  Spielerkarten kämpfen immer mit ihren Basiswerten (Stufe 1) — Stufen gibt es nur noch für Monster. */
async function loadPlayerTeam(userId: string): Promise<BattleUnitDefinition[]> {
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });
  if (userCards.length === 0) throw new LiveBattleError("Du hast noch keine Karten. Öffne zuerst OMA Gems.");

  const lineup = userCards.filter((uc) => uc.inLineup);
  const teamCards = (lineup.length > 0 ? lineup : userCards).slice(0, TEAM_SIZE);
  const avatarByDiscordId = await resolveAvatarsForCards(teamCards.map((uc) => uc.card));
  return teamCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      1,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
}

/** Startet ein Kampagnen-Level (siehe campaign-levels.ts/campaign.ts) — fest kuratiertes
 *  Gegner-Team, beliebig oft wiederholbar (Münzen gibt es nur für neu erreichte Sterne). */
export async function startLiveCampaignBattle(userId: string, levelId: string): Promise<LiveBattleSnapshot> {
  const levelDef = getCampaignLevel(levelId);
  if (!levelDef) throw new LiveBattleError("Unbekanntes Kampagnen-Level.");

  const unlocked = await isCampaignLevelUnlocked(userId, levelId);
  if (!unlocked) throw new LiveBattleError("Dieses Level ist noch nicht freigeschaltet.");

  const teamA = await loadPlayerTeam(userId);
  return createLiveBattle(`${CAMPAIGN_MODE_PREFIX}${levelId}`, userId, teamA, buildCampaignEnemyTeam(levelDef));
}

/** Startet einen Versuch in einem laufenden OMA-Gems-Turnier (Score-Attack
 *  gegen das für alle Teilnehmer identische Boss-Team, siehe GemsTournament).
 *  Belohnungen gibt es nicht pro Versuch, sondern erst bei Turnier-Ende nach
 *  Platzierung (siehe cron/battle-cards-gems-tournament). */
export async function startLiveGemsTournamentBattle(
  userId: string,
  gemsTournamentId: string
): Promise<LiveBattleSnapshot> {
  const tournament = await prisma.gemsTournament.findUnique({
    where: { id: gemsTournamentId },
    include: { event: true },
  });
  if (!tournament) throw new LiveBattleError("Unbekanntes Turnier.");
  if (tournament.finalizedAt) throw new LiveBattleError("Dieses Turnier ist bereits beendet.");

  const now = new Date();
  if (now < tournament.event.startAt) throw new LiveBattleError("Dieses Turnier hat noch nicht begonnen.");
  // event.endAt ist der maßgebliche Endzeitpunkt (GemsTournament.endAt ist deprecated, siehe
  // Schema-Kommentar) — kein endAt gesetzt bedeutet: das Turnier läuft zeitlich unbegrenzt.
  if (tournament.event.endAt && now > tournament.event.endAt) throw new LiveBattleError("Dieses Turnier ist bereits vorbei.");

  const attemptsUsed = await prisma.liveBattle.count({
    where: { playerAId: userId, mode: tournamentModeFor(tournament.id) },
  });
  if (attemptsUsed >= tournament.maxAttemptsPerUser) {
    throw new LiveBattleError(`Maximale Anzahl Versuche erreicht (${tournament.maxAttemptsPerUser}).`);
  }

  const teamA = await loadPlayerTeam(userId);
  const teamB = JSON.parse(tournament.bossTeamJson) as BattleUnitDefinition[];
  return createLiveBattle(tournamentModeFor(tournament.id), userId, teamA, teamB);
}

// ---------- Lesen / Aktion ----------

export async function getLiveBattleSnapshot(liveBattleId: string, viewerId: string): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  const state = toState(live);

  // Normalerweise rein lesend. Ausnahme: ein Zustand ohne Sieger und ohne wartende
  // Einheit (sollte nach advance() nicht vorkommen) wird hier weitergeführt.
  const stalled = !state.winner && !state.awaitingUnitId;
  if (live.status === "active" && stalled) {
    const { state: newState, pendingDecision } = advance(state, undefined);
    const updated = await persistAndMaybeFinalize(live, newState);
    return buildSnapshot(updated, newState, pendingDecision);
  }

  return buildSnapshot(live, state, describeCurrentDecision(state));
}

/** Bestätigt einen Zug auf dem Brett. Die Ziele entstehen automatisch pro Match
 *  (siehe applyBoardRage in interactive.ts). */
export async function submitBoardMove(
  liveBattleId: string,
  viewerId: string,
  boardSwaps: SwapMove[]
): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  if (live.status === "finished") throw new LiveBattleError("Dieser Kampf ist bereits beendet.");

  const state = toState(live);
  if (!state.awaitingUnitId) throw new LiveBattleError("Gerade wartet niemand auf eine Entscheidung.");

  const unit = [...state.unitsA, ...state.unitsB].find((u) => u.instanceId === state.awaitingUnitId);
  if (!unit) throw new LiveBattleError("Aktive Einheit nicht gefunden.");
  if (unit.teamId !== "A") throw new LiveBattleError("Du bist gerade nicht am Zug.");

  const { state: newState, pendingDecision } = advance(state, { boardSwaps });
  const updated = await persistAndMaybeFinalize(live, newState);
  return buildSnapshot(updated, newState, pendingDecision);
}

/** Löst ein Ultimate SOFORT aus, unabhängig von der Zugreihenfolge (siehe
 *  applyUltimateInterrupt) — per Klick auf eine Heldenkarte mit vollem Rage-Balken. */
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
  if (caster.teamId !== "A") throw new LiveBattleError("Das ist nicht deine Einheit.");

  const { state: newState, pendingDecision, applied } = applyUltimateInterrupt(state, casterId, targetId);
  if (!applied) throw new LiveBattleError("Ultimate ist gerade nicht verfügbar (Rage zu niedrig?).");

  const updated = await persistAndMaybeFinalize(live, newState);
  return buildSnapshot(updated, newState, pendingDecision);
}

/** Speichert den bisherigen Fortschritt der laufenden Match-3-Mini-Session
 *  (siehe BoardMatch3.tsx: nach jedem bestätigten Swap aufgerufen, fire-and-
 *  forget) — reine Zustands-Aktualisierung ohne Turn-Order-Auswirkung, KEINE
 *  Rage-Vergabe (die passiert ausschließlich beim eigentlichen Zug-Abschluss
 *  über /action). Ermöglicht, dass ein Reload mitten in der Mini-Session den
 *  Fortschritt nicht verwirft. */
export async function saveBoardProgress(
  liveBattleId: string,
  viewerId: string,
  swaps: SwapMove[]
): Promise<LiveBattleSnapshot> {
  const live = await requireAccess(liveBattleId, viewerId);
  if (live.status === "finished") throw new LiveBattleError("Dieser Kampf ist bereits beendet.");

  const state = toState(live);
  if (!state.awaitingUnitId) throw new LiveBattleError("Gerade wartet niemand auf eine Entscheidung.");

  if (!recordBoardProgress(state, swaps)) {
    throw new LiveBattleError("Board-Fortschritt konnte nicht gespeichert werden.");
  }

  const updated = await persistAndMaybeFinalize(live, state);
  return buildSnapshot(updated, state, describeCurrentDecision(state));
}
