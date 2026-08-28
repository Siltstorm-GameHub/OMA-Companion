// ============================================
// POST /api/battles/demo
// ============================================
// Übungskampf: die aktuelle Startaufstellung (lib/battle-cards/lineup.ts)
// gegen 5 zufällig gezogene Standard-Karten. Setzt ein gewähltes Start-Pack
// voraus (siehe lib/battle-cards/starter-pick.ts) — kein automatisches
// Voll-Grant, das würde die bewusste Auswahl umgehen.

import { auth } from "@/auth";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
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

  const playerTeam = playerTeamCards.map((uc) => cardToBattleUnitDefinition(uc.card, uc.level));
  const opponentTeam = opponentCards.map((card) => cardToBattleUnitDefinition(card, 1));

  const result = runBattle(playerTeam, opponentTeam);
  const dbResult = result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId,
      opponentType: "PVE_RANDOM",
      result: dbResult,
      teamSnapshot: {
        playerTeam: playerTeamCards.map((uc) => uc.card.name),
        opponentTeam: opponentCards.map((c) => c.name),
      },
      battleLog: result.log,
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
