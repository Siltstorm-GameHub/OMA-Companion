// ============================================
// Cron: schließt abgelaufene OMA-Gems-Monatswertungen ab
// ============================================
// Läuft täglich (siehe vercel.json) — wirkt nur beim ersten Lauf nach einem Monatswechsel, danach ist der Monat
// über GemsMonth als abgeschlossen markiert (idempotent, siehe finalizeDueGemsMonths in lib/gems/scores.ts).
// Räumt nebenbei nie eingereichte Runden auf.

import { NextRequest, NextResponse } from "next/server";
import { finalizeDueGemsMonths } from "@/lib/gems/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await finalizeDueGemsMonths()) });
}
