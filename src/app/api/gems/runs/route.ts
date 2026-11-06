// ============================================
// POST /api/gems/runs — neue Runde OMA Gems starten
// ============================================
// Body: { mode: "classic" | "daily" }. Vergibt den Seed (klassisch zufällig, täglich aus dem Berliner Datum —
// alle spielen dasselbe Brett). Das Ergebnis wird später an /api/gems/runs/[id] eingereicht und dort aus
// Seed + Zügen nachgespielt.

import { randomInt } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dailySeed } from "@/lib/gems/engine";
import { berlinDayKey } from "@/lib/month-season";

export const runtime = "nodejs";

const MAX_OPEN_RUNS_PER_10_MIN = 30;

const bodySchema = z.object({ mode: z.enum(["classic", "daily"]) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültiger Modus." }, { status: 400 });
  const { mode } = parsed.data;

  const recentOpen = await prisma.gemsRun.count({
    where: { userId, finishedAt: null, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recentOpen >= MAX_OPEN_RUNS_PER_10_MIN) {
    return Response.json({ error: "Zu viele angefangene Runden. Bitte kurz warten." }, { status: 429 });
  }

  const day = mode === "daily" ? berlinDayKey() : null;
  const seed = day ? dailySeed(day) : randomInt(1, 2 ** 31 - 1);
  const run = await prisma.gemsRun.create({
    data: { userId, mode, seed, day },
    select: { id: true, seed: true, day: true, mode: true },
  });
  return Response.json({ runId: run.id, seed: run.seed, mode: run.mode, day: run.day });
}
