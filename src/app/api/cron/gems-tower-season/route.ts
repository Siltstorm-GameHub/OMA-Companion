// ============================================
// Cron: schließt abgelaufene Aufstiegs- und Last-Stand-Saisons ab und vergibt die Platzierungs-Packs
// ============================================
// Läuft täglich (siehe vercel.json) — wirkt nur beim ersten Lauf nach einem Monatswechsel, danach
// ist die Saison über GemsTowerSeason als abgeschlossen markiert (idempotent, siehe
// finalizeDueTowerSeasons in lib/gems/tower-season.ts).

import { NextRequest, NextResponse } from "next/server";
import { finalizeDueTowerSeasons } from "@/lib/gems/tower-season";
import { finalizeDueWaveSeasons } from "@/lib/gems/wave-season";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tower, waves] = await Promise.all([finalizeDueTowerSeasons(), finalizeDueWaveSeasons()]);
  return NextResponse.json({ ok: true, ...tower, lastStandFinalized: waves.finalized });
}
