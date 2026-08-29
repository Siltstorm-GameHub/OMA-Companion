// ============================================
// POST /api/battle-cards/test-battle
// ============================================
// Testkampf für Admins/Moderatoren zum Ausprobieren/Debuggen des
// Kampfsystems während der Entwicklung: eigene Startaufstellung (oder erste
// 5 eigene Karten) gegen 5 zufällige Standard-Karten (NPC). Nicht für
// reguläre User zugänglich — kein Fortschritt/Belohnung, dient nur dem Test.

import { auth } from "@/auth";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
import { serializeBattleLog } from "@/lib/battle-cards/battle-log";
import { resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { resolveCardImageUrl, resolveAvatarBadgeUrl } from "@/lib/battle-cards/resolve-image";
import { hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const TEAM_SIZE = 5;

function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export async function POST() {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: playerId }, select: { role: true } });
  if (!user || !hasMinRole(user.role, "moderator")) {
    return Response.json({ error: "Nur für Admins und Moderatoren." }, { status: 403 });
  }

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
      1,
      resolveCardImageUrl(card, avatarByDiscordId),
      resolveAvatarBadgeUrl(card, avatarByDiscordId)
    )
  );

  const result = runBattle(playerTeam, opponentTeam);
  const dbResult = result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId,
      opponentType: "PVE_TEST",
      result: dbResult,
      teamSnapshot: {
        playerTeam: playerTeamCards.map((uc) => uc.card.name),
        opponentTeam: opponentCards.map((c) => c.name),
      },
      battleLog: serializeBattleLog(result.log, result.roster),
    },
  });

  return Response.json({
    battleId: battle.id,
    result: dbResult,
    rounds: result.rounds,
    seed: result.seed,
    log: result.log,
    roster: result.roster,
  });
}
