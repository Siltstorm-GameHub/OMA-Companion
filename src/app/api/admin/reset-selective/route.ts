import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { resetAllExceptSeries } from "@/lib/reset-selective";

/**
 * POST /api/admin/reset-selective
 * Setzt Münzen & Rang-Punkte aller User zurück, außer den ausgewählten Eventreihen (deren
 * Rang-Punkte-Beitrag erhalten bleibt) — inkl. vollständiger Löschung aller Events/Eventreihen
 * außerhalb der Auswahl sowie LuL, Quest-Fortschritt, Duellen, Vorhersagen und Shop-Inventar.
 * Badges, Wanderpokale, Clip-Contests und der Spendenpool bleiben unangetastet.
 */
export async function POST(req: NextRequest) {
  await requireRole("admin");

  const body = await req.json() as { keepSeriesIds?: string[] };
  const keepSeriesIds = Array.isArray(body.keepSeriesIds) ? body.keepSeriesIds.filter(id => typeof id === "string") : [];

  const summary = await resetAllExceptSeries(keepSeriesIds);
  return NextResponse.json({ ok: true, ...summary });
}
