// ============================================
// Cron: schließt abgelaufene OMA-Blocks-Monatswertungen ab
// ============================================
// Läuft täglich (siehe vercel.json) — wirkt nur beim ersten Lauf nach einem Monatswechsel, danach
// ist der Monat über BlocksSeason als abgeschlossen markiert (idempotent, siehe
// finalizeDueBlocksSeasons in lib/blocks/scores.ts). Räumt nebenbei nie eingereichte Läufe auf.

import { NextRequest, NextResponse } from "next/server";
import { finalizeDueBlocksSeasons } from "@/lib/blocks/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await finalizeDueBlocksSeasons();
  return NextResponse.json({ ok: true, ...result });
}
