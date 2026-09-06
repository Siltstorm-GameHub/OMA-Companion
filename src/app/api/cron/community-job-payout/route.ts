import { NextRequest, NextResponse } from "next/server";
import "@/lib/community-job-bootstrap";
import { runWeeklyPayout, runContractExpiryCheck, runInactivityCheck, runContractReminderCheck } from "@/lib/community-job-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Wöchentliches Community-Job-Gehalt. Läuft täglich (Vercel-Cron-Zeitplan siehe
 * vercel.json) — runWeeklyPayout ist idempotent (eine Zeile pro Nutzer/Job/Woche),
 * ein tägliches Antriggern schadet also nicht und fängt verspätete erste Läufe ab.
 *
 * Reihenfolge wichtig (siehe Plan): erst Payout, DANN Vertragsablauf/Inaktivität —
 * sonst verliert ein User mit genau in dieser Woche endendem Vertrag sein bereits
 * verdientes anteiliges Gehalt.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payout = await runWeeklyPayout();
  const expiry = await runContractExpiryCheck();
  const inactivity = await runInactivityCheck();
  const reminder = await runContractReminderCheck();

  return NextResponse.json({ payout, expiry, inactivity, reminder });
}
