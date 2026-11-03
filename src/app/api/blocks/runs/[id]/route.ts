// ============================================
// POST /api/blocks/runs/[id] — Solo-Lauf einreichen
// ============================================
// Body: { handling, inputs, frames }. Der Server spielt den Lauf mit dem beim Start vergebenen Seed
// nach (lib/blocks/replay.ts) und übernimmt nur das selbst errechnete Ergebnis. Ein Lauf kann nicht
// schneller als in Echtzeit gespielt worden sein — sonst wird er abgelehnt.

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clampHandling, FPS } from "@/lib/blocks/engine";
import { verifyReplay, MAX_REPLAY_INPUTS, MAX_REPLAY_FRAMES } from "@/lib/blocks/replay";
import { recordBlocksResult, getBlocksPlace, ALL_TIME } from "@/lib/blocks/scores";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  handling: z.object({ das: z.number(), arr: z.number(), sdf: z.number() }),
  inputs: z.array(z.number().int().nonnegative()).max(MAX_REPLAY_INPUTS),
  frames: z.number().int().nonnegative().max(MAX_REPLAY_FRAMES),
});

/** Spielraum für Uhren-/Netzwerk-Abweichungen zwischen Start-Request und Spielbeginn. */
const REALTIME_SLACK_MS = 5000;

export async function POST(req: Request, ctx: RouteContext<"/api/blocks/runs/[id]">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;
  const { id } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Daten." }, { status: 400 });
  const { inputs, frames } = parsed.data;
  const handling = clampHandling(parsed.data.handling);

  const run = await prisma.blocksRun.findUnique({ where: { id } });
  if (!run || run.userId !== userId) return Response.json({ error: "Runde nicht gefunden." }, { status: 404 });
  if (run.finishedAt) return Response.json({ error: "Runde wurde schon gewertet." }, { status: 409 });

  const now = new Date();
  const playedMs = (frames / FPS) * 1000;
  if (playedMs > now.getTime() - run.createdAt.getTime() + REALTIME_SLACK_MS) {
    return Response.json({ error: "Runde ist ungültig." }, { status: 422 });
  }

  const result = verifyReplay(run.seed, handling, inputs, frames);
  if (!result.ok || !result.stats) {
    return Response.json({ error: result.error ?? "Runde ist ungültig." }, { status: 422 });
  }

  const record = await recordBlocksResult(userId, run.id, result.stats, now);
  const [monthPlace, allTimePlace] = await Promise.all([
    getBlocksPlace(userId, record.season),
    getBlocksPlace(userId, ALL_TIME),
  ]);

  return Response.json({
    score: result.stats.score,
    lines: result.stats.lines,
    level: result.stats.level,
    ...record,
    monthPlace: monthPlace?.place ?? null,
    allTimePlace: allTimePlace?.place ?? null,
  });
}
