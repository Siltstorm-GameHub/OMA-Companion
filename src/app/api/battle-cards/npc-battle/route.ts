// ============================================
// POST /api/battle-cards/npc-battle
// ============================================
// PVE-Kampf gegen zufällige Standard-Karten in 3 Schwierigkeitsstufen —
// für alle eingeloggten User, vorerst unbegrenzt oft spielbar und ohne
// Belohnung (kein Münzen-/Quest-Fortschritt). Die Schwierigkeit skaliert
// die NPC-Karten einfach über die bestehende Stufen-Skalierung der Engine
// (siehe lib/battle-engine/stats.ts) hoch — kein separates Balancing nötig.

import { auth } from "@/auth";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl, resolveAvatarBadgeUrl } from "@/lib/battle-cards/resolve-image";
import { prisma } from "@/lib/prisma";
import type { NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";

const TEAM_SIZE = 5;

const DIFFICULTY_LEVEL: Record<NpcDifficulty, number> = {
  EASY: 1,
  MEDIUM: 3,
  HARD: 5,
};

function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export async function POST(req: Request) {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const difficulty: NpcDifficulty =
    body?.difficulty === "MEDIUM" || body?.difficulty === "HARD" ? body.difficulty : "EASY";
  const npcLevel = DIFFICULTY_LEVEL[difficulty];

  const userCards = await prisma.userCard.findMany({
    where: { userId: playerId },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });
  if (userCards.length === 0) {
    return Response.json(
      { error: "Noch kein Start-Pack gewählt.", needsStarterPick: true },
      { status: 400 }
    );
  }

  const lineup = userCards.filter((uc) => uc.inLineup);
  const playerTeamCards = (lineup.length > 0 ? lineup : userCards).slice(0, TEAM_SIZE);

  const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
  const opponentCards = sampleWithoutReplacement(standardCards, TEAM_SIZE);

  const avatarByDiscordId = await resolveAvatarsForCards([
    ...playerTeamCards.map((uc) => uc.card),
    ...opponentCards,
  ]);
  const playerTeam = playerTeamCards.map((uc) =>
    cardToBattleUnitDefinition(
      uc.card,
      uc.level,
      resolveCardImageUrl(uc.card, avatarByDiscordId),
      resolveAvatarBadgeUrl(uc.card, avatarByDiscordId)
    )
  );
  const opponentTeam = opponentCards.map((card) =>
    cardToBattleUnitDefinition(
      card,
      npcLevel,
      resolveCardImageUrl(card, avatarByDiscordId),
      resolveAvatarBadgeUrl(card, avatarByDiscordId)
    )
  );

  const result = runBattle(playerTeam, opponentTeam);
  const dbResult = result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId,
      opponentType: `PVE_${difficulty}`,
      result: dbResult,
      teamSnapshot: {
        playerTeam: playerTeamCards.map((uc) => uc.card.name),
        opponentTeam: opponentCards.map((c) => c.name),
        difficulty,
      },
      battleLog: serializeBattleLog(result.log, result.roster),
    },
  });

  return Response.json({
    battleId: battle.id,
    result: dbResult,
    difficulty,
    rounds: result.rounds,
    seed: result.seed,
    log: result.log,
    roster: result.roster,
  });
}
