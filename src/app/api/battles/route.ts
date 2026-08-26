// ============================================
// POST /api/battles
// ============================================
// Führt einen Kampf serverseitig aus (Cheat-Schutz: Client übergibt nur
// Karten-IDs + Stufe, nie Stats/Ergebnis) und persistiert ihn. Der Spieler
// kommt aus der authentifizierten Session, NICHT aus dem Request-Body —
// sonst könnte jeder im Namen jedes anderen Users kämpfen.

import { z } from "zod";
import { auth } from "@/auth";
import { cardToBattleUnitDefinition } from "@/lib/battle-engine/adapters";
import { runBattle } from "@/lib/battle-engine/engine";
import { InvalidSkillDataError } from "@/lib/battle-engine/skill-schema";
import type { BattleResult as EngineBattleResult } from "@/lib/battle-engine/types";
import { prisma } from "@/lib/prisma";
import type { BattleResult as DbBattleResult } from "@prisma/client";

const requestSchema = z.object({
  opponentType: z.string().min(1),
  playerTeam: z
    .array(z.object({ userCardId: z.string().min(1) }))
    .min(1)
    .max(5),
  opponentTeam: z
    .array(z.object({ cardId: z.string().min(1), level: z.number().int().min(1).max(5) }))
    .min(1)
    .max(5),
  seed: z.number().int().optional(),
});

function toDbResult(winner: EngineBattleResult["winner"]): DbBattleResult {
  if (winner === "A") return "WIN";
  if (winner === "B") return "LOSS";
  return "DRAW";
}

export async function POST(request: Request) {
  const session = await auth();
  const playerId = session?.user?.id;
  if (!playerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return Response.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { opponentType, playerTeam, opponentTeam, seed } = parsed.data;

  // Eigentumsprüfung: der Spieler darf nur mit UserCards kämpfen, die ihm gehören.
  const ownedUserCards = await prisma.userCard.findMany({
    where: { userId: playerId, id: { in: playerTeam.map((u) => u.userCardId) } },
    include: { card: true },
  });
  if (ownedUserCards.length !== playerTeam.length) {
    return Response.json(
      { error: "Ein oder mehrere Karten im Team gehören dir nicht oder existieren nicht." },
      { status: 403 }
    );
  }
  const ownedById = new Map(ownedUserCards.map((uc) => [uc.id, uc]));

  const opponentCards = await prisma.card.findMany({
    where: { id: { in: opponentTeam.map((c) => c.cardId) } },
  });
  if (opponentCards.length !== opponentTeam.length) {
    return Response.json({ error: "Ein oder mehrere Gegner-Karten existieren nicht." }, { status: 400 });
  }
  const opponentCardById = new Map(opponentCards.map((c) => [c.id, c]));

  try {
    const teamA = playerTeam.map((entry) => {
      const userCard = ownedById.get(entry.userCardId)!;
      return cardToBattleUnitDefinition(userCard.card, userCard.level);
    });
    const teamB = opponentTeam.map((entry) => {
      const card = opponentCardById.get(entry.cardId)!;
      return cardToBattleUnitDefinition(card, entry.level);
    });

    const result = runBattle(teamA, teamB, { seed });
    const dbResult = toDbResult(result.winner);

    const battle = await prisma.battle.create({
      data: {
        playerId,
        opponentType,
        result: dbResult,
        teamSnapshot: {
          playerTeam: playerTeam.map((t) => t.userCardId),
          opponentTeam: opponentTeam,
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
    });
  } catch (error) {
    if (error instanceof InvalidSkillDataError) {
      console.error(error);
      return Response.json({ error: "Karten-Daten sind beschädigt." }, { status: 500 });
    }
    throw error;
  }
}
