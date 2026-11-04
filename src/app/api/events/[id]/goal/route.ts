import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEventManager } from "@/lib/roles";
import { sanitizeCommunityGoal } from "@/lib/community-goal";
import { seriesEventStatFieldsFromConfig } from "@/lib/series-stat-fields";
import { checkCommunityGoal } from "@/lib/community-goal-milestones";
import { withGoalMode } from "@/lib/event-goal";

/**
 * Community-Ziel genau eines Events festlegen — ohne die übrige statConfigJson (Stat-Punkte,
 * Platzierungspunkte, Ø-Richtung) anzufassen. Siehe lib/event-goal.ts.
 * Body: { mode: "inherit" | "override" | "off", goal?: CommunityGoal }
 *   - inherit:  Ziel der Eventreihe übernehmen (Abweichung entfernen)
 *   - override: eigenes Ziel nur für diesen Termin
 *   - off:      dieser Termin hat kein Ziel
 * Ohne Reihe gibt es nichts zu erben — "inherit" entfernt dann einfach das Ziel.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireEventManager(eventId);
  const body = await req.json().catch(() => null) as { mode?: unknown; goal?: unknown } | null;
  const mode = body?.mode;
  if (mode !== "inherit" && mode !== "override" && mode !== "off") {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { format: true, statFields: true, statConfigJson: true, series: { select: { seriesStatConfig: true } } },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.format !== "coop_stats") {
    return NextResponse.json({ error: "Community-Ziele gibt es nur im Format Punktewertung" }, { status: 400 });
  }

  let goal = null;
  if (mode === "override") {
    // Erlaubte Felder: Statistiken der Reihe + eigene Stat-Felder des Events
    let fields = seriesEventStatFieldsFromConfig(event.series?.seriesStatConfig);
    try {
      if (event.statFields) fields = [...new Set([...fields, ...(JSON.parse(event.statFields) as string[])])];
    } catch { /* nur Reihen-Felder */ }
    goal = sanitizeCommunityGoal(body?.goal, fields);
    if (!goal) {
      return NextResponse.json({ error: "Ziel unvollständig — mindestens ein Stat-Feld und eine Zielmarke über 0" }, { status: 400 });
    }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { statConfigJson: withGoalMode(event.statConfigJson, mode, goal) },
  });
  // Neues bzw. geerbtes Ziel kann sofort eine Stufe erreichen (bzw. Belohnungen fällig machen)
  if (mode !== "off") await checkCommunityGoal(eventId);
  return NextResponse.json({ ok: true, mode, goal });
}
