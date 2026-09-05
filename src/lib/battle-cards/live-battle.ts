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
  recordBoardProgress,
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
  ActiveStatModifier,
  BattleLogEntry,
  BattleUnitDefinition,
  BattleUnitState,
  BattleWinner,
  TeamId,
} from "@/lib/battle-engine/types";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import { buildBattleTeam } from "@/lib/battle-cards/team-builder";
import { puzzleMonsterRoster } from "@/lib/battle-cards/puzzle-monsters";
import {
  buildCampaignEnemyTeam,
  CAMPAIGN_COINS_PER_STAR,
  CAMPAIGN_LEVELS,
  computeStars,
  getCampaignLevel,
  isCampaignLevelUnlocked,
  recordCampaignResult,
} from "@/lib/battle-cards/campaign";
import { markTutorialCampaignLevel1Done, markTutorialNpcBattleDone } from "@/lib/battle-cards/tutorial";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl, resolveAvatarBadgeUrl } from "@/lib/battle-cards/resolve-image";
import { applyWinStreak } from "@/lib/battle-cards/win-streak";
import { applyEloResult, type EloResult } from "@/lib/battle-cards/elo";
import {
  DIFFICULTY_LEVEL,
  GEMS_PVP_DAILY_LIMIT,
  GEMS_PVP_OPPONENT_DAILY_CAP,
  NPC_BATTLE_DAILY_LIMIT,
  NPC_BATTLE_WIN_REWARD,
  parseNpcMode,
  parseTournamentMode,
  PVP_GEMS_MODE,
  puzzleModeFor,
  tournamentModeFor,
  type NpcDifficulty,
} from "@/lib/battle-cards/npc-battle-types";
import { grantGemsPvpVictoryChest } from "@/lib/battle-cards/gems-pvp";
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

/** Zählt heute (UTC) gestartete OMA-Gems-PvP-Angriffe dieses Users — Grundlage
 *  für GEMS_PVP_DAILY_LIMIT, damit die Sieges-Kiste nicht gefarmt werden kann. */
async function countGemsPvpBattlesStartedToday(userId: string): Promise<number> {
  return prisma.liveBattle.count({
    where: { playerAId: userId, mode: PVP_GEMS_MODE, createdAt: { gte: startOfTodayUTC() } },
  });
}

async function assertGemsPvpDailyLimitNotReached(userId: string): Promise<void> {
  const startedToday = await countGemsPvpBattlesStartedToday(userId);
  if (startedToday >= GEMS_PVP_DAILY_LIMIT) {
    throw new LiveBattleError(
      `Heutiges Limit erreicht (max. ${GEMS_PVP_DAILY_LIMIT} OMA-Gems-Angriffe pro Tag). Versuch es morgen wieder.`
    );
  }
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
  /** Aktive Stat-Buffs/-Debuffs (Angriff/Verteidigung/Speed) — für die
   *  Buff/Debuff-Icons auf der Heldenkarte, siehe UnitCard in LiveBattleView.tsx. */
  statModifiers: ActiveStatModifier[];
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
   *  Match-3-Mini-Session dieses Zugs sowie bislang bestätigte Swaps (für die
   *  Wiederherstellung nach einem Reload, siehe saveBoardProgress). */
  board: { grid: BoardGrid; moveBudget: number; appliedSwaps: SwapMove[] } | null;
}

export interface LiveBattleSnapshot {
  id: string;
  mode: string;
  /** true bei allen OMA-Gems-Kämpfen (Puzzle-PvE, Kampagne, Gems-PvP, Turnier) — der Client
   *  blendet dafür den Auto-Kampf-Umschalter aus, das Match-3-Brett soll aktiv gespielt werden. */
  boardMode: boolean;
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
  autoA: boolean;
  autoB: boolean;
  playerAId: string;
  playerBId: string | null;
  resultBattleId: string | null;
  winner: BattleWinner | null;
  /** Nur gesetzt für einen gewonnenen Gems-PvP-Ghost-Angriff — die Sieges-Kiste
   *  (siehe gems-pvp.ts), die der Client als Öffnen-Animation zeigt. */
  chestPrize: { kind: "coins"; amount: number } | { kind: "pack"; packKind: string } | null;
  /** Nur gesetzt für einen gewonnenen Kampagnen-Kampf — Sterne-Ergebnis (siehe
   *  computeStars/recordCampaignResult in campaign.ts), das der Client im
   *  Kampfende-Screen mit Animation zeigt (neu hinzugekommene Sterne
   *  hervorgehoben). */
  campaignResult: { levelId: string; stars: 1 | 2 | 3; starsGained: number; coinsAwarded: number } | null;
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
    statModifiers: u.statModifiers,
  };
}

async function buildSnapshot(
  live: Pick<LiveBattle, "id" | "mode" | "playerAId" | "playerBId" | "resultBattleId">,
  state: InteractiveBattleState,
  pendingDecision: PendingDecision | null
): Promise<LiveBattleSnapshot> {
  const allUnits = [...state.unitsA, ...state.unitsB];

  let awaiting: LiveBattleAwaiting | null = null;
  if (pendingDecision) {
    const controlledByPlayerId = pendingDecision.teamId === "A" ? live.playerAId : (live.playerBId as string);
    awaiting = { ...pendingDecision, controlledByPlayerId, deadline: state.turnDeadline };
  }

  // Sieges-Kiste (Gems-PvP) / Sterne-Ergebnis (Kampagne) — beide werden am
  // Battle-Datensatz gespeichert (siehe finalizeLiveBattle), nur nachladen,
  // wenn tatsächlich relevant.
  let chestPrize: LiveBattleSnapshot["chestPrize"] = null;
  let campaignResult: LiveBattleSnapshot["campaignResult"] = null;
  if ((live.mode === PVP_GEMS_MODE || live.mode.startsWith("CAMPAIGN_")) && live.resultBattleId) {
    const battle = await prisma.battle.findUnique({
      where: { id: live.resultBattleId },
      select: { teamSnapshot: true },
    });
    const snapshotJson = battle?.teamSnapshot as {
      gemsChestPrize?: LiveBattleSnapshot["chestPrize"];
      campaignResult?: LiveBattleSnapshot["campaignResult"];
    } | null;
    chestPrize = snapshotJson?.gemsChestPrize ?? null;
    campaignResult = snapshotJson?.campaignResult ?? null;
  }

  return {
    id: live.id,
    mode: live.mode,
    boardMode: state.boardMode,
    status: state.winner ? "finished" : "active",
    round: state.round,
    units: allUnits.map(toUnitSnapshot),
    // Bei OMA Gems filtert der Client "upcoming" auf reine Gegner-Züge (siehe
    // LiveBattleView.tsx: "Nächste Gegner-Angriffe" statt "Als nächstes dran",
    // eigene Zug-Slots sind dort bedeutungslos, da alle eigenen Helden ohnehin
    // gemeinsam per Match angreifen) — großzügigerer Vorschau-Puffer, damit nach
    // dem Herausfiltern der eigenen Slots noch genug Gegner-Einträge übrig bleiben.
    upcoming: previewUpcomingTurns(state, state.boardMode ? 12 : 5),
    recentLog: state.log.slice(-RECENT_LOG_TAIL),
    logLength: state.log.length,
    awaiting,
    autoA: state.autoA,
    autoB: state.autoB,
    playerAId: live.playerAId,
    playerBId: live.playerBId,
    resultBattleId: live.resultBattleId,
    winner: state.winner,
    chestPrize,
    campaignResult,
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

/** Lädt die aktuellen Elo-Ratings beider Spieler für den jeweiligen Modus
 *  (DUELS/GEMS haben getrennte Pools, siehe elo.ts), berechnet das neue Rating
 *  und schreibt beide Seiten in einer Transaktion zurück. Zweigt explizit auf
 *  mode auf statt mit computed property keys zu selecten/updaten — Letzteres
 *  lässt Prisma den Rückgabetyp nicht mehr sinnvoll inferieren. */
async function applyEloForChallenge(mode: string, playerAId: string, playerBId: string, result: EloResult) {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: playerAId },
      select: { eloDuels: true, eloDuelsMatches: true, eloGems: true, eloGemsMatches: true },
    }),
    prisma.user.findUnique({
      where: { id: playerBId },
      select: { eloDuels: true, eloDuelsMatches: true, eloGems: true, eloGemsMatches: true },
    }),
  ]);
  if (!userA || !userB) return;

  const ratingA = mode === "GEMS" ? userA.eloGems : userA.eloDuels;
  const ratingB = mode === "GEMS" ? userB.eloGems : userB.eloDuels;
  const matchesA = mode === "GEMS" ? userA.eloGemsMatches : userA.eloDuelsMatches;
  const matchesB = mode === "GEMS" ? userB.eloGemsMatches : userB.eloDuelsMatches;

  const { newA, newB } = applyEloResult({ ratingA, ratingB, matchesA, matchesB, result });

  const dataA = mode === "GEMS" ? { eloGems: newA, eloGemsMatches: matchesA + 1 } : { eloDuels: newA, eloDuelsMatches: matchesA + 1 };
  const dataB = mode === "GEMS" ? { eloGems: newB, eloGemsMatches: matchesB + 1 } : { eloDuels: newB, eloDuelsMatches: matchesB + 1 };

  await prisma.$transaction([
    prisma.user.update({ where: { id: playerAId }, data: dataA }),
    prisma.user.update({ where: { id: playerBId }, data: dataB }),
  ]);
}

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

      // Fairness-Deckel gegen Farmen: nur die ersten GEMS_PVP_OPPONENT_DAILY_CAP
      // resolvten Kämpfe desselben Angreifer/Gegner-Paars pro Tag zählen für
      // Rangliste + Sieges-Kiste — weitere Angriffe gegen denselben Gegner sind
      // weiterhin möglich, wirken sich aber nicht mehr aus (siehe leaderboard.ts).
      let countsForRanking = true;
      if (challenge.mode === "GEMS") {
        const pairMatchesToday = await prisma.battleChallenge.count({
          where: {
            mode: "GEMS",
            status: "resolved",
            challengerId: challenge.challengerId,
            opponentId: challenge.opponentId,
            respondedAt: { gte: startOfTodayUTC() },
          },
        });
        countsForRanking = pairMatchesToday < GEMS_PVP_OPPONENT_DAILY_CAP;
      }

      await prisma.battleChallenge.update({
        where: { id: challenge.id },
        data: { status: "resolved", battleId: battle.id, winnerId, respondedAt: new Date(), countsForRanking },
      });
      if (winnerId) {
        const loserId = winnerId === live.playerAId ? live.playerBId : live.playerAId;
        await applyWinStreak(winnerId, loserId);
      }
      // Gilt für Sieg/Niederlage UND Unentschieden — derselbe Farm-Fairness-Deckel
      // wie für Rangliste/Sieges-Kiste (countsForRanking), damit Elo nicht durch
      // wiederholte Angriffe auf denselben Gegner am selben Tag aufgepumpt wird.
      if (countsForRanking) {
        const eloResult: EloResult = winnerId === null ? "draw" : winnerId === live.playerAId ? "A" : "B";
        await applyEloForChallenge(challenge.mode, live.playerAId, live.playerBId, eloResult);
      }
      // OMA-Gems-Ghost-Angriff: nur der Angreifer (playerAId) spielt aktiv — bei
      // dessen Sieg öffnet sich die Sieges-Kiste. Der Verteidiger bekommt nichts,
      // er hat den Kampf nicht selbst bestritten. Der Gewinn wird zusätzlich am
      // Battle-Datensatz gespeichert, damit der Client ihn direkt im nächsten
      // Snapshot als Öffnen-Animation zeigen kann (siehe buildSnapshot). Kein
      // Kisten-Gewinn mehr, sobald der Fairness-Deckel gegen dasselbe Paar greift.
      if (challenge.mode === "GEMS" && winnerId === live.playerAId && countsForRanking) {
        const prize = await grantGemsPvpVictoryChest(live.playerAId);
        await prisma.battle.update({
          where: { id: battle.id },
          data: { teamSnapshot: { playerAId: live.playerAId, playerBId: live.playerBId, gemsChestPrize: prize } },
        });
      }
      await notifyPvpBattleResolved(live.playerAId, live.playerBId, winnerId, battle.id);
    }
  } else if (live.mode.startsWith("TOURNAMENT_")) {
    const parsed = parseTournamentMode(live.mode);
    if (parsed) {
      const hpTotal = state.unitsA.reduce((sum, u) => sum + u.maxHp, 0);
      const hpRemaining = state.unitsA.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
      const hpPercent = hpTotal > 0 ? hpRemaining / hpTotal : 0;
      const score = Math.max(
        0,
        (state.winner === "A" ? 1000 : 0) + Math.round(hpPercent * 500) - state.round * 10
      );

      const existing = await prisma.gemsTournamentAttempt.findUnique({
        where: { tournamentId_userId: { tournamentId: parsed.gemsTournamentId, userId: live.playerAId } },
      });
      if (!existing || score > existing.bestScore) {
        await prisma.gemsTournamentAttempt.upsert({
          where: { tournamentId_userId: { tournamentId: parsed.gemsTournamentId, userId: live.playerAId } },
          create: { tournamentId: parsed.gemsTournamentId, userId: live.playerAId, bestScore: score },
          update: { bestScore: score },
        });
      }
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
          reason: `${parsed.isPuzzle ? "OMA Gems" : "OMA Duels"} gewonnen (${parsed.difficulty})`,
        },
      });
    }
    // Tutorial-Schritt 1: klassisches OMA Duels (nicht OMA Gems), Stufe Einfach.
    if (parsed && !parsed.isPuzzle && parsed.difficulty === "EASY") {
      await markTutorialNpcBattleDone(live.playerAId);
    }
  } else if (state.winner === "A" && live.mode.startsWith("CAMPAIGN_")) {
    const levelId = live.mode.slice("CAMPAIGN_".length);
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
    // im nächsten Snapshot als Animation im Kampfende-Screen zeigen kann (siehe
    // buildSnapshot, gleiches Muster wie gemsChestPrize).
    await prisma.battle.update({
      where: { id: battle.id },
      data: {
        teamSnapshot: {
          playerAId: live.playerAId,
          playerBId: live.playerBId,
          campaignResult: { levelId, stars, starsGained, coinsAwarded },
        },
      },
    });
    // Tutorial-Schritt 3: erstes Kampagnen-Level gewonnen — schließt das Tutorial ab.
    if (levelId === CAMPAIGN_LEVELS[0].id) {
      await markTutorialCampaignLevel1Done(live.playerAId);
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

/** Wirft einen Fehler, falls der User sein Tageslimit an NPC-Kämpfen erreicht
 *  hat — zentral hier, damit Auto-Kampf UND Puzzle-Modus (siehe
 *  countNpcBattlesStartedToday: zählt "PVE_"-Präfix-Modi zusammen) dieselbe
 *  Fehlermeldung und dasselbe gemeinsame Tageslimit verwenden. */
async function assertNpcDailyLimitNotReached(userId: string): Promise<void> {
  const startedToday = await countNpcBattlesStartedToday(userId);
  if (startedToday >= NPC_BATTLE_DAILY_LIMIT) {
    throw new LiveBattleError(
      `Heutiges Limit erreicht (max. ${NPC_BATTLE_DAILY_LIMIT} NPC-Kämpfe pro Tag). Versuch es morgen wieder.`
    );
  }
}

/** Lädt die aktuelle Startaufstellung des Users (Lineup, sonst die ersten
 *  TEAM_SIZE eigenen Karten) — für Auto-Kampf UND Puzzle-Modus gleichermaßen. */
async function loadPlayerLineup(userId: string) {
  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });
  if (userCards.length === 0) throw new LiveBattleError("Noch kein Start-Pack gewählt.");

  const lineup = userCards.filter((uc) => uc.inLineup);
  return (lineup.length > 0 ? lineup : userCards).slice(0, TEAM_SIZE);
}

export async function startLivePveBattle(userId: string, difficulty: NpcDifficulty): Promise<LiveBattleSnapshot> {
  await assertNpcDailyLimitNotReached(userId);
  const playerTeamCards = await loadPlayerLineup(userId);

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

  return createLiveBattle(`PVE_${difficulty}`, userId, null, teamA, teamB, { A: "human", B: "ai" });
}

/** Wie startLivePveBattle, aber im Match-3-"OMA Gems"-Modus (siehe
 *  board-match3.ts): der Spieler erzeugt Rage über ein Puzzle-Brett statt rein
 *  automatisch, UND die Gegner sind eine eigene Riege humorvoller Monster
 *  (siehe puzzle-monsters.ts) statt der zufälligen Standard-Karten des
 *  Auto-Kampfs — passend zum verspielteren Empires-&-Puzzles-Setting. Teilt
 *  sich Aufstellung/Tageslimit mit dem bestehenden Auto-Kampf-PVE. */
export async function startLivePvePuzzleBattle(userId: string, difficulty: NpcDifficulty): Promise<LiveBattleSnapshot> {
  await assertNpcDailyLimitNotReached(userId);
  const playerTeamCards = await loadPlayerLineup(userId);

  const avatarByDiscordId = await resolveAvatarsForCards(playerTeamCards.map((uc) => uc.card));
  const teamA = playerTeamCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
  const npcLevel = DIFFICULTY_LEVEL[difficulty];
  const teamB = sampleWithoutReplacement(puzzleMonsterRoster(npcLevel), TEAM_SIZE);

  return createLiveBattle(puzzleModeFor(difficulty), userId, null, teamA, teamB, { A: "human", B: "ai" }, true);
}

/** Startet ein Kampagnen-Level (siehe campaign-levels.ts/campaign.ts) — läuft
 *  wie OMA Gems über das Match-3-Brett (boardMode: true), aber mit
 *  fest kuratiertem Gegner-Team statt zufälliger Monster und OHNE das
 *  tägliche NPC-Limit (Kampagnen-Level lassen sich beliebig oft wiederholen,
 *  um mehr Sterne zu holen — die Münz-Belohnung gibt es aber nur einmal pro
 *  Level, siehe finalizeLiveBattle). */
export async function startLiveCampaignBattle(userId: string, levelId: string): Promise<LiveBattleSnapshot> {
  const levelDef = getCampaignLevel(levelId);
  if (!levelDef) throw new LiveBattleError("Unbekanntes Kampagnen-Level.");

  const unlocked = await isCampaignLevelUnlocked(userId, levelId);
  if (!unlocked) throw new LiveBattleError("Dieses Level ist noch nicht freigeschaltet.");

  const playerTeamCards = await loadPlayerLineup(userId);
  const avatarByDiscordId = await resolveAvatarsForCards(playerTeamCards.map((uc) => uc.card));
  const teamA = playerTeamCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
  const teamB = buildCampaignEnemyTeam(levelDef);

  return createLiveBattle(`CAMPAIGN_${levelId}`, userId, null, teamA, teamB, { A: "human", B: "ai" }, true);
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

/** OMA-Gems-Ghost-Angriff: sofortiger, asynchroner Kampf gegen einen KI-
 *  gesteuerten Nachbau der AKTUELLEN Aufstellung eines anderen Users — der
 *  Angegriffene muss weder online sein noch reagieren (kein Annahme-Schritt,
 *  im Gegensatz zu startLivePvpBattle). Legt trotzdem eine BattleChallenge an
 *  (mode: "GEMS"), damit der Kampf über denselben Resolve-Pfad läuft wie
 *  klassisches PvP und in dieselbe Saison-Rangliste einfließt. */
export async function startLiveGemsPvpBattle(challengerId: string, opponentId: string): Promise<LiveBattleSnapshot> {
  if (challengerId === opponentId) {
    throw new LiveBattleError("Du kannst dich nicht selbst herausfordern.");
  }
  await assertGemsPvpDailyLimitNotReached(challengerId);

  const [teamAResult, teamBResult] = await Promise.all([buildBattleTeam(challengerId), buildBattleTeam(opponentId)]);
  if (teamAResult.units.length === 0) {
    throw new LiveBattleError("Noch kein Start-Pack gewählt.");
  }
  if (teamBResult.units.length === 0) {
    throw new LiveBattleError("Dieser Nutzer hat noch keine gültige Startaufstellung.");
  }

  const snapshot = await createLiveBattle(
    PVP_GEMS_MODE,
    challengerId,
    opponentId,
    teamAResult.units,
    teamBResult.units,
    { A: "human", B: "ai" },
    true
  );

  await prisma.battleChallenge.create({
    data: {
      challengerId,
      opponentId,
      mode: "GEMS",
      status: snapshot.status === "finished" ? "resolved" : "live",
      liveBattleId: snapshot.id,
    },
  });

  return snapshot;
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
  if (now > tournament.endAt) throw new LiveBattleError("Dieses Turnier ist bereits vorbei.");

  const attemptsUsed = await prisma.liveBattle.count({
    where: { playerAId: userId, mode: tournamentModeFor(tournament.id) },
  });
  if (attemptsUsed >= tournament.maxAttemptsPerUser) {
    throw new LiveBattleError(`Maximale Anzahl Versuche erreicht (${tournament.maxAttemptsPerUser}).`);
  }

  const playerTeamCards = await loadPlayerLineup(userId);
  const avatarByDiscordId = await resolveAvatarsForCards(playerTeamCards.map((uc) => uc.card));
  const teamA = playerTeamCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
  const teamB = JSON.parse(tournament.bossTeamJson) as BattleUnitDefinition[];

  return createLiveBattle(
    tournamentModeFor(tournament.id),
    userId,
    null,
    teamA,
    teamB,
    { A: "human", B: "ai" },
    true
  );
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

  // Im Match-3-Brett-Modus (OMA Gems) wählt der Spieler nie manuell eine Aktion/
  // ein Ziel — der Client schickt hier nur die Swap-Sequenz, `actionType`/
  // `targetId` (aktuell hartkodiert "normalAttack" ohne Ziel, siehe
  // BoardMatch3.tsx onConfirm) werden serverseitig ohnehin ignoriert (die
  // eigentlichen Ziele entstehen automatisch pro Match, siehe applyBoardRage in
  // interactive.ts). Die normale Aktions-/Ziel-Validierung unten passt dafür
  // nicht (sie würde "normalAttack" ohne Ziel fälschlich als "Ungültiges Ziel"
  // ablehnen) und wird daher für boardMode-Züge übersprungen.
  let resolvedTargetId: string | undefined;
  if (!state.boardMode) {
    const available = describeAvailableActions(unit, allUnits);
    const chosen = available.find((a) => a.actionType === actionType);
    if (!chosen) throw new LiveBattleError("Diese Aktion ist gerade nicht verfügbar.");

    if (chosen.targetKind !== "none") {
      const candidates = candidateTargetIds(unit, chosen.targetKind, allUnits);
      if (!targetId || !candidates.includes(targetId)) throw new LiveBattleError("Ungültiges Ziel.");
      resolvedTargetId = targetId;
    }
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

/** Speichert den bisherigen Fortschritt der laufenden Match-3-Mini-Session
 *  (siehe BoardMatch3.tsx: nach jedem bestätigten Swap aufgerufen, fire-and-
 *  forget) — reine Zustands-Aktualisierung ohne Turn-Order-Auswirkung, KEINE
 *  Rage-Vergabe (die passiert weiterhin ausschließlich beim eigentlichen
 *  Zug-Abschluss über /action). Ermöglicht, dass ein Reload mitten in der
 *  Mini-Session den Fortschritt nicht verwirft. */
export async function saveBoardProgress(
  liveBattleId: string,
  viewerId: string,
  swaps: SwapMove[]
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

  if (!recordBoardProgress(state, swaps)) {
    throw new LiveBattleError("Board-Fortschritt konnte nicht gespeichert werden.");
  }

  const updated = await persistAndMaybeFinalize(live, state);
  return buildSnapshot(updated, state, describeCurrentDecision(state));
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
