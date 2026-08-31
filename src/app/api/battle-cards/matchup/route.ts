// ============================================
// GET /api/battle-cards/matchup — grobe Gewinnchancen-Einschätzung
// ============================================
// ?opponentId=<userId>  → Vergleich gegen die aktuelle Startaufstellung eines
//                          anderen Users (für Direkt-Herausforderungen).
// ?npc=1                → Vergleich gegen alle 3 NPC-Schwierigkeitsstufen,
//                          approximiert über die Durchschnittswerte aller
//                          Standard-Karten (echte Kämpfe würfeln 5 zufällige
//                          Karten — für eine stabile Richtwert-Anzeige wird
//                          hier bewusst der Pool-Durchschnitt verwendet).
// Beide Varianten geben nur die grobe Einstufung zurück (siehe
// matchup-strength.ts), keine Prozentzahl.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildBattleTeam } from "@/lib/battle-cards/team-builder";
import { estimateMatchupStrength, type PowerStatUnit } from "@/lib/battle-cards/matchup-strength";
import { DIFFICULTY_LEVEL, type NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";

function average(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const opponentId = searchParams.get("opponentId");
  const npc = searchParams.get("npc");

  const myTeam = (await buildBattleTeam(userId)).units;
  if (myTeam.length === 0) {
    return NextResponse.json({ error: "Du hast noch keine Startaufstellung." }, { status: 400 });
  }

  if (opponentId) {
    if (opponentId === userId) return NextResponse.json({ strength: null });
    const opponentTeam = (await buildBattleTeam(opponentId)).units;
    return NextResponse.json({ strength: estimateMatchupStrength(myTeam, opponentTeam) });
  }

  if (npc) {
    const standardCards = await prisma.card.findMany({ where: { rarity: "STANDARD" } });
    const avg: Omit<PowerStatUnit, "level"> = {
      baseHp: average(standardCards.map((c) => c.baseHp)),
      baseAttack: average(standardCards.map((c) => c.baseAttack)),
      baseDefense: average(standardCards.map((c) => c.baseDefense)),
      speed: average(standardCards.map((c) => c.speed)),
    };

    const result: Record<NpcDifficulty, ReturnType<typeof estimateMatchupStrength>> = {
      EASY: null,
      MEDIUM: null,
      HARD: null,
    };
    for (const difficulty of Object.keys(DIFFICULTY_LEVEL) as NpcDifficulty[]) {
      const level = DIFFICULTY_LEVEL[difficulty];
      const npcTeam: PowerStatUnit[] = Array.from({ length: 5 }, () => ({ ...avg, level }));
      result[difficulty] = estimateMatchupStrength(myTeam, npcTeam);
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "opponentId oder npc erforderlich." }, { status: 400 });
}
