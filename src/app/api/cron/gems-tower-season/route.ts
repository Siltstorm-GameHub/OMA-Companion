// ============================================
// Cron: schließt abgelaufene Turm-Saisons ab und vergibt die Platzierungs-Packs
// ============================================
// Läuft täglich (siehe vercel.json) — wirkt nur beim ersten Lauf nach einem Monatswechsel, danach
// ist die Saison über GemsTowerSeason als abgeschlossen markiert (idempotent, siehe
// finalizeDueTowerSeasons in lib/gems/tower-season.ts).

import { NextRequest, NextResponse } from "next/server";
import { finalizeDueTowerSeasons } from "@/lib/gems/tower-season";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await finalizeDueTowerSeasons();
  return NextResponse.json({ ok: true, ...result });
}
