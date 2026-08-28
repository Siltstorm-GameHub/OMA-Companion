// ============================================
// POST /api/battles/demo
// ============================================
// Startet einen Übungskampf mit den 6 Standard-Karten, aufgeteilt in zwei
// ausbalancierte 3er-Teams (je 1 Tank/1 DD/1 Support). Sorgt bei Bedarf für
// ein Starter-Deck des Spielers — es gibt noch keinen echten Distributions-
// Weg für Karten (siehe lib/battle-cards/starter-deck.ts).

import { auth } from "@/auth";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
import { ensureStarterDeck } from "@/lib/battle-cards/starter-deck";
import { prisma } from "@/lib/prisma";

const PLAYER_TEAM_NAMES = ["Bastionella", "Scherbe", "Pflästerchen"];
const OPPONENT_TEAM_NAMES = ["Betonbert", "Fernrohr", "Kato_09"];

export async function POST() {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const userCards = await ensureStarterDeck(playerId);
  const byName = new Map(userCards.map((uc) => [uc.card.name, uc]));

  const playerTeam = PLAYER_TEAM_NAMES.map((name) => {
    const uc = byName.get(name)!;
    return cardToBattleUnitDefinition(uc.card, uc.level);
  });
  const opponentTeam = OPPONENT_TEAM_NAMES.map((name) => {
    const uc = byName.get(name)!;
    return cardToBattleUnitDefinition(uc.card, 1);
  });

  const result = runBattle(playerTeam, opponentTeam);
  const dbResult = result.winner === "A" ? "WIN" : result.winner === "B" ? "LOSS" : "DRAW";

  const battle = await prisma.battle.create({
    data: {
      playerId,
      opponentType: "PVE_STANDARD",
      result: dbResult,
      teamSnapshot: { playerTeam: PLAYER_TEAM_NAMES, opponentTeam: OPPONENT_TEAM_NAMES },
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
