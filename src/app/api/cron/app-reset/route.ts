// ============================================
// Cron: führt einen geplanten selektiven Reset aus
// ============================================
// Läuft täglich um 03:00 UTC (≈ 04:00 Berlin, siehe vercel.json). Tut nur etwas, wenn im Admin-Bereich
// ein Reset für heute (oder ein verpasstes früheres Datum) geplant ist — einmalig, siehe runDueReset.
import { NextRequest, NextResponse } from "next/server";
import { runDueReset } from "@/lib/reset-selective";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await runDueReset()) });
}
