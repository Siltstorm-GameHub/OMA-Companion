// ============================================
// POST /api/battles/demo
// ============================================
// Startet einen Übungskampf: eigenes Team aus den tatsächlich besessenen
// UserCards (bis zu 3, bevorzugt 1 Tank/1 Support/1 DD falls vorhanden)
// gegen eine feste NPC-Aufstellung aus 3 Standard-Karten. Setzt ein
// gewähltes Start-Pack voraus (siehe lib/battle-cards/starter-pick.ts) —
// kein automatisches Voll-Grant mehr, das würde die bewusste Auswahl
// umgehen.

import { auth } from "@/auth";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
import { prisma } from "@/lib/prisma";
import type { CardClass } from "@prisma/client";

const OPPONENT_TEAM_NAMES = ["Betonbert", "Fernrohr", "Kato_09"];
const CLASS_ORDER: CardClass[] = ["TANK", "SUPPORT", "DAMAGE_DEALER"];

export async function POST() {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId: playerId },
    include: { card: true },
  });
  if (userCards.length === 0) {
    return Response.json(
      { error: "Noch kein Start-Pack gewählt.", needsStarterPick: true },
      { status: 400 }
    );
  }

  // Bevorzugt ein ausgewogenes Team (1 pro Klasse), sonst einfach auffüllen.
  const byClass = new Map<CardClass, typeof userCards>();
  for (const uc of userCards) {
    const list = byClass.get(uc.card.class) ?? [];
    list.push(uc);
    byClass.set(uc.card.class, list);
  }
  const picks: typeof userCards = [];
  for (const cls of CLASS_ORDER) {
    const first = byClass.get(cls)?.[0];
    if (first) picks.push(first);
  }
  for (const uc of userCards) {
    if (picks.length >= 3) break;
    if (!picks.includes(uc)) picks.push(uc);
  }
  const playerTeamCards = picks.slice(0, 3);

  const opponentCards = await prisma.card.findMany({
    where: { name: { in: OPPONENT_TEAM_NAMES }, rarity: "STANDARD" },
  });
  const opponentByName = new Map(opponentCards.map((c) => [c.name, c]));

  const playerTeam = playerTeamCards.map((uc) => cardToBattleUnitDefinition(uc.card, uc.level));
  const opponentTeam = OPPONENT_TEAM_NAMES.map((name) =>
    cardToBattleUnitDefinition(opponentByName.get(name)!, 1)
  );

  const result = runBattle(playerTeam, opponentTeam);
  const dbResult = result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId,
      opponentType: "PVE_STANDARD",
      result: dbResult,
      teamSnapshot: {
        playerTeam: playerTeamCards.map((uc) => uc.card.name),
        opponentTeam: OPPONENT_TEAM_NAMES,
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
