import { NextRequest, NextResponse } from "next/server";
import { expireStaleChallenges } from "@/lib/battle-cards/challenge-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Räumt liegen gelassene OMA-Duels-Herausforderungen auf (siehe challenge-expiry.ts).
// Läuft täglich.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireStaleChallenges();
  return NextResponse.json({ ok: true, ...result });
}
