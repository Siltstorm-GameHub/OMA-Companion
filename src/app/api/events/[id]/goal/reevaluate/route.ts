import { NextRequest, NextResponse } from "next/server";
import { requireEventManager } from "@/lib/roles";
import { reevaluateGoal } from "@/lib/community-goal-milestones";

/**
 * POST — Community-Ziel neu auswerten: bisher ausgezahlte Ziel-Münzen zurückbuchen und mit den
 * aktuellen Werten neu prüfen (z.B. nach einer Korrektur). Ohne Meldungen an die Teilnehmer.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEventManager(id);
  const result = await reevaluateGoal(id);
  return NextResponse.json({ ok: true, ...result });
}
