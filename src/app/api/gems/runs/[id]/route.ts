// ============================================
// POST /api/gems/runs/[id] — Runde OMA Gems einreichen
// ============================================
// Body: { moves: number[] } (kodierte Züge, siehe encodeMove in lib/gems/engine.ts). Der Server spielt die Runde
// mit dem beim Start vergebenen Seed nach und übernimmt nur das selbst errechnete Ergebnis. Eine Runde kann nicht
// schneller gespielt worden sein, als Züge nun mal brauchen — sonst wird sie abgelehnt. Man darf eine Runde auch
// vorzeitig beenden (dann zählt der Stand bis dahin).

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_REPLAY_MOVES, replayGame, type GameMode } from "@/lib/gems/engine";
import { CLASSIC_ALL_TIME, classicMonthBoard, dailyBoard, getGemsPlace, recordGemsResult } from "@/lib/gems/scores";
import { updateQuestProgress } from "@/lib/quests";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  moves: z.array(z.number().int().nonnegative()).max(MAX_REPLAY_MOVES),
});

/** Untergrenze je Zug (Tausch + Animation) und Spielraum für Uhren-/Netzwerk-Abweichungen. */
const MIN_MS_PER_MOVE = 150;
const SLACK_MS = 5000;

export async function POST(req: Request, ctx: RouteContext<"/api/gems/runs/[id]">) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;
  const { id } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Daten." }, { status: 400 });
  const { moves } = parsed.data;

  const run = await prisma.gemsRun.findUnique({ where: { id } });
  if (!run || run.userId !== userId) return Response.json({ error: "Runde nicht gefunden." }, { status: 404 });
  if (run.finishedAt) return Response.json({ error: "Runde wurde schon gewertet." }, { status: 409 });
  const mode: GameMode = run.mode === "daily" ? "daily" : "classic";

  const now = new Date();
  if (moves.length * MIN_MS_PER_MOVE > now.getTime() - run.createdAt.getTime() + SLACK_MS) {
    return Response.json({ error: "Runde ist ungültig." }, { status: 422 });
  }

  const result = replayGame(mode, run.seed, moves);
  if (!result.ok) return Response.json({ error: result.error }, { status: 422 });
  const { state } = result;

  const record = await recordGemsResult(
    userId,
    { id: run.id, mode, day: run.day },
    { score: state.score, level: state.level, moves: state.totalMoves },
    now,
  );
  if (moves.length > 0) updateQuestProgress(userId, "BATTLE_CARD_DUEL", 1).catch(() => {});

  const placeBoards = mode === "daily" && run.day ? [dailyBoard(run.day)] : [classicMonthBoard(record.season), CLASSIC_ALL_TIME];
  const places = await Promise.all(placeBoards.map((b) => getGemsPlace(userId, b)));

  return Response.json({
    mode,
    score: state.score,
    level: state.level,
    moves: state.totalMoves,
    boards: record.boards.map((b, i) => ({ ...b, place: places[i]?.place ?? null })),
  });
}
