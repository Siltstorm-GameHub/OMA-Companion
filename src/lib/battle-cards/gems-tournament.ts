// ============================================
// OMA-Gems-Turniere — Boss-Team-Erzeugung + Übersicht für die Battle-Cards-Seite
// ============================================

import { prisma } from "@/lib/prisma";
import { puzzleMonsterRoster } from "@/lib/battle-cards/puzzle-monsters";
import { DIFFICULTY_LEVEL, tournamentModeFor, type NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";
import { GEMS_MONSTER_TEAM_MAX, findGemsMonsterTemplate } from "@/lib/battle-cards/gems-monster-catalog";
import { instantiateMonster } from "@/lib/battle-cards/monster-content";
import { grantPack, type PackKind } from "@/lib/battle-cards/packs";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";

const TEAM_SIZE = GEMS_MONSTER_TEAM_MAX;

function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/** Erzeugt EINMALIG das feste Boss-Team für ein neues OMA-Gems-Turnier — wird
 *  bei Erstellung (und bei einer Difficulty-/Monster-Änderung ohne bestehende
 *  Attempts) im Admin-API-Layer aufgerufen und als bossTeamJson persistiert,
 *  damit wirklich alle Teilnehmer exakt dasselbe Gegner-Team bekommen
 *  (Fairness im Score-Vergleich). `monsterCardIds` (siehe gems-monster-
 *  catalog.ts, Duplikate erlaubt, auf GEMS_MONSTER_TEAM_MAX gekappt) ersetzt
 *  bei Angabe die bisherige rein zufällige Auswahl durch die vom Admin
 *  gewählten Monster — jeweils mit der Stufe der gewählten Schwierigkeit
 *  instanziiert, genau wie bei der Zufallsauswahl. */
export function generateGemsTournamentBossTeam(
  difficulty: NpcDifficulty,
  monsterCardIds?: string[]
): BattleUnitDefinition[] {
  const npcLevel = DIFFICULTY_LEVEL[difficulty];
  if (monsterCardIds && monsterCardIds.length > 0) {
    const capped = monsterCardIds.slice(0, GEMS_MONSTER_TEAM_MAX);
    const team = capped
      .map((cardId) => findGemsMonsterTemplate(cardId))
      .filter((template): template is NonNullable<typeof template> => !!template)
      .map((template) => instantiateMonster(template, npcLevel));
    if (team.length > 0) return team;
  }
  return sampleWithoutReplacement(puzzleMonsterRoster(npcLevel), TEAM_SIZE);
}

export interface GemsTournamentSummary {
  id: string;
  eventId: string;
  title: string;
  startAt: string;
  endAt: string;
  maxAttemptsPerUser: number;
  attemptsUsed: number;
  bestScore: number;
  topRows: { userId: string; name: string; image: string | null; bestScore: number }[];
}

/** Liefert das aktuell relevante OMA-Gems-Turnier für die Battle-Cards-Seite —
 *  das nächste bevorstehende ODER laufende (noch nicht abgeschlossene) Event
 *  mit game === "OMA Gems". Gibt null zurück, wenn keins existiert. */
export async function getCurrentGemsTournament(viewerId: string): Promise<GemsTournamentSummary | null> {
  const event = await prisma.event.findFirst({
    where: {
      game: "OMA Gems",
      status: { notIn: ["finished", "closed"] },
      gemsTournament: { isNot: null },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      gemsTournament: { select: { id: true, endAt: true, maxAttemptsPerUser: true } },
    },
  });
  if (!event?.gemsTournament) return null;
  const tournament = event.gemsTournament;

  const [attemptsUsed, viewerAttempt, topAttempts] = await Promise.all([
    prisma.liveBattle.count({ where: { playerAId: viewerId, mode: tournamentModeFor(tournament.id) } }),
    prisma.gemsTournamentAttempt.findUnique({
      where: { tournamentId_userId: { tournamentId: tournament.id, userId: viewerId } },
    }),
    prisma.gemsTournamentAttempt.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { bestScore: "desc" },
      take: 5,
      include: { user: { select: { id: true, username: true, name: true, image: true } } },
    }),
  ]);

  return {
    id: tournament.id,
    eventId: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
    endAt: tournament.endAt.toISOString(),
    maxAttemptsPerUser: tournament.maxAttemptsPerUser,
    attemptsUsed,
    bestScore: viewerAttempt?.bestScore ?? 0,
    topRows: topAttempts.map((a) => ({
      userId: a.userId,
      name: a.user.username ?? a.user.name ?? "Unbekannt",
      image: a.user.image,
      bestScore: a.bestScore,
    })),
  };
}

// ---------- Finalisierung (Cron) ----------

/** `packKind`/`participationPackKind` sind optionale, admin-gesetzte Zusatzfelder
 *  speziell für OMA-Gems-Turniere (siehe EventSetupWizard.tsx/EventEditClient.tsx)
 *  — bei regulären Events bleiben sie einfach unbelegt und werden von deren
 *  Abschluss-Logik ignoriert, da diese das JSON nicht auf diese Felder hin liest. */
type PlacementReward = { place: number; coins: number; rankPoints: number; packKind?: PackKind | "" };
type RewardsConfig = { participationCoins: number; participationPackKind?: PackKind | ""; placements: PlacementReward[] };

function parseRewardsConfig(json: string | null): RewardsConfig {
  const fallback: RewardsConfig = { participationCoins: 10, placements: [] };
  if (!json) return fallback;
  try {
    return { ...fallback, ...JSON.parse(json) };
  } catch {
    return fallback;
  }
}

/** Vom Cron (siehe /api/cron/battle-cards-gems-tournament) aufgerufen: schließt
 *  jedes OMA-Gems-Turnier ab, dessen endAt erreicht ist und das noch nicht
 *  finalisiert wurde — vergibt Event.placementRewardsJson-Belohnungen nach
 *  Score-Rang, setzt Event.finalRankingJson + status "finished". Idempotent
 *  über GemsTournament.finalizedAt (einmal gesetzt, nie wieder verarbeitet). */
export async function finalizeDueGemsTournaments(): Promise<{ finalized: string[] }> {
  const due = await prisma.gemsTournament.findMany({
    where: { finalizedAt: null, endAt: { lte: new Date() } },
    include: { event: { select: { id: true, placementRewardsJson: true } } },
  });

  const finalized: string[] = [];
  for (const tournament of due) {
    const attempts = await prisma.gemsTournamentAttempt.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { bestScore: "desc" },
    });
    const rewards = parseRewardsConfig(tournament.event.placementRewardsJson);

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const placement = rewards.placements.find((p) => p.place === i + 1);
      const coins = rewards.participationCoins + (placement?.coins ?? 0);
      if (coins > 0) {
        await prisma.user.update({ where: { id: attempt.userId }, data: { points: { increment: coins } } });
        await prisma.pointTransaction.create({
          data: {
            userId: attempt.userId,
            amount: coins,
            reason: placement ? `OMA Gems Turnier: Platz ${i + 1}` : "OMA Gems Turnier: Teilnahme",
          },
        });
      }
      if (placement?.rankPoints) {
        await prisma.user.update({ where: { id: attempt.userId }, data: { rankPoints: { increment: placement.rankPoints } } });
      }
      // Optionale Karten-Pack-Belohnung (Teilnahme + zusätzlich je nach Platzierung) —
      // beide sind unabhängig voneinander optional, ein Teilnehmer kann also z.B. ein
      // Teilnahme-Pack UND ein Platzierungs-Pack bekommen (zwei separate Packs).
      if (rewards.participationPackKind) {
        await grantPack(attempt.userId, "GEMS_TOURNAMENT_REWARD", rewards.participationPackKind as PackKind);
      }
      if (placement?.packKind) {
        await grantPack(attempt.userId, "GEMS_TOURNAMENT_REWARD", placement.packKind as PackKind);
      }
    }

    await prisma.event.update({
      where: { id: tournament.event.id },
      data: { finalRankingJson: JSON.stringify(attempts.map((a) => a.userId)), status: "finished" },
    });
    await prisma.gemsTournament.update({ where: { id: tournament.id }, data: { finalizedAt: new Date() } });
    finalized.push(tournament.id);
  }

  return { finalized };
}
