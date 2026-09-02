// ============================================
// Cron: finalisiert abgelaufene OMA-Gems-Turniere und vergibt Belohnungen
// ============================================
// Läuft täglich (siehe vercel.json — Vercel Hobby erlaubt nur tägliche Cron
// Jobs) — findet jedes GemsTournament mit abgelaufenem endAt, das noch nicht
// finalisiert wurde, und ruft finalizeDueGemsTournaments() auf (Idempotenz
// über GemsTournament.finalizedAt). Ein Turnier wird also nicht sofort bei
// Ablauf, sondern binnen bis zu 24h finalisiert — für Belohnungsauszahlung
// unkritisch.

import { NextRequest, NextResponse } from "next/server";
import { finalizeDueGemsTournaments } from "@/lib/battle-cards/gems-tournament";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await finalizeDueGemsTournaments();
  return NextResponse.json({ ok: true, ...result });
}
