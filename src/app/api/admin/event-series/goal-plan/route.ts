import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeriesManager } from "@/lib/roles";
import { sanitizeCommunityGoal, type CommunityGoal } from "@/lib/community-goal";
import { MAX_GOAL_PLAN, parseTournamentTemplate, serializeTournamentTemplate } from "@/lib/series-seasons";

/**
 * PUT /api/admin/event-series/goal-plan — geplante Community-Ziele einer Reihe ersetzen (lib/goal-plan.ts).
 * Body: { seriesId: string, plan: CommunityGoal[] } — Reihenfolge = Reihenfolge der kommenden Zyklen.
 */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null) as { seriesId?: unknown; plan?: unknown } | null;
  if (!body || typeof body.seriesId !== "string" || !Array.isArray(body.plan)) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const seriesId = body.seriesId;
  await requireSeriesManager(seriesId);
  if (body.plan.length > MAX_GOAL_PLAN) {
    return NextResponse.json({ error: `Höchstens ${MAX_GOAL_PLAN} geplante Ziele` }, { status: 400 });
  }
  const plan = body.plan.map(g => sanitizeCommunityGoal(g));
  if (plan.some(g => !g)) {
    return NextResponse.json({ error: "Ein geplantes Ziel ist unvollständig — Stat-Feld und Zielmarke über 0 nötig" }, { status: 400 });
  }

  const series = await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { tournamentTemplateJson: true, status: true } });
  if (!series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  if (series.status === "archived") return NextResponse.json({ error: "Diese Saison ist abgeschlossen" }, { status: 409 });

  const template = parseTournamentTemplate(series.tournamentTemplateJson);
  await prisma.eventSeries.update({
    where: { id: seriesId },
    data: { tournamentTemplateJson: serializeTournamentTemplate({ ...template, goalPlan: plan as CommunityGoal[] }) },
  });
  return NextResponse.json({ ok: true, plan });
}
