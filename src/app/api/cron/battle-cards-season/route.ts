// ============================================
// Cron: löst Saison 1 automatisch aus, sobald das Admin-Startdatum erreicht ist
// ============================================
// Läuft täglich (siehe vercel.json). Macht nichts, solange kein Startdatum
// gesetzt ist, das Datum noch nicht erreicht ist, oder Saison 1 schon lief
// (season1RanAt gesetzt) — jeweils idempotent, kein Doppel-Lauf möglich.

import { NextRequest, NextResponse } from "next/server";
import { getSeasonConfig, markSeason1Ran } from "@/lib/season/season-config";
import { runFullSeasonUpdate } from "@/lib/season/run-season";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getSeasonConfig();

  if (!config.season1StartAt) {
    return NextResponse.json({ ok: true, skipped: "Kein Startdatum gesetzt" });
  }
  if (config.season1RanAt) {
    return NextResponse.json({ ok: true, skipped: "Saison 1 wurde bereits ausgelöst" });
  }
  if (new Date() < new Date(config.season1StartAt)) {
    return NextResponse.json({ ok: true, skipped: "Startdatum noch nicht erreicht" });
  }

  const result = await runFullSeasonUpdate();
  await markSeason1Ran();

  return NextResponse.json({ ok: true, ...result });
}
