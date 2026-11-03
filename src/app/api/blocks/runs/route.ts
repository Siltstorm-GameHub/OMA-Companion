// ============================================
// POST /api/blocks/runs — neuen Solo-Lauf von OMA Blocks starten
// ============================================
// Vergibt den Seed (bestimmt die Teile-Reihenfolge). Das Ergebnis wird später an
// /api/blocks/runs/[id] eingereicht und dort aus Seed + Eingaben nachgespielt.

import { randomInt } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_OPEN_RUNS_PER_10_MIN = 30;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  const recentOpen = await prisma.blocksRun.count({
    where: { userId, finishedAt: null, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recentOpen >= MAX_OPEN_RUNS_PER_10_MIN) {
    return Response.json({ error: "Zu viele angefangene Runden. Bitte kurz warten." }, { status: 429 });
  }

  const run = await prisma.blocksRun.create({
    data: { userId, seed: randomInt(1, 2 ** 31 - 1) },
    select: { id: true, seed: true },
  });
  return Response.json({ runId: run.id, seed: run.seed });
}
