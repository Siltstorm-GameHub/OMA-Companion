import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEventManager } from "@/lib/roles";
import { sanitizeCommunityGoal } from "@/lib/community-goal";
import { seriesEventStatFieldsFromConfig } from "@/lib/series-stat-fields";
import { checkCommunityGoal } from "@/lib/community-goal-milestones";

/**
 * Community-Ziel genau eines Events setzen/ändern/entfernen — ohne die übrige statConfigJson
 * (Stat-Punkte, Platzierungspunkte, Ø-Richtung) anzufassen. Gebraucht von Terminen einer Reihe mit
 * festem Spiel, die keinen eigenen "Turnier"-Reiter haben (siehe EventEditClient → EventGoalPanel).
 * Body: { goal: CommunityGoal | null }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireEventManager(eventId);
  const body = await req.json().catch(() => null);
  if (!body || !("goal" in body)) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { format: true, statFields: true, statConfigJson: true, series: { select: { seriesStatConfig: true } } },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.format !== "coop_stats") {
    return NextResponse.json({ error: "Community-Ziele gibt es nur im Format Punktewertung" }, { status: 400 });
  }

  // Erlaubte Felder: Statistiken der Reihe + eigene Stat-Felder des Events
  let fields = seriesEventStatFieldsFromConfig(event.series?.seriesStatConfig);
  try {
    if (event.statFields) fields = [...new Set([...fields, ...(JSON.parse(event.statFields) as string[])])];
  } catch { /* nur Reihen-Felder */ }

  const goal = body.goal === null ? null : sanitizeCommunityGoal(body.goal, fields);
  if (body.goal !== null && !goal) {
    return NextResponse.json({ error: "Ziel unvollständig — mindestens ein Stat-Feld und eine Zielmarke über 0" }, { status: 400 });
  }

  let cfg: Record<string, unknown> = {};
  try { cfg = event.statConfigJson ? JSON.parse(event.statConfigJson) : {}; } catch { cfg = {}; }
  const next: Record<string, unknown> = { ...cfg };
  if (goal) next.goal = goal; else delete next.goal;

  await prisma.event.update({
    where: { id: eventId },
    data: { statConfigJson: Object.keys(next).length > 0 ? JSON.stringify(next) : null },
  });
  // Neue Zielmarke kann sofort eine Stufe erreichen (bzw. Belohnungen fällig machen)
  if (goal) await checkCommunityGoal(eventId);
  return NextResponse.json({ ok: true, goal });
}
