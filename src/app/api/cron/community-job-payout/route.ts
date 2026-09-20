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
 *
 * Jeder Schritt läuft isoliert: wirft einer, laufen die übrigen trotzdem, und die
 * Antwort enthält den Fehler statt eines pauschalen 500.
 */
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[community-job-payout] Schritt "${name}" fehlgeschlagen:`, err);
    return { error: err instanceof Error ? err.message : "Unbekannter Fehler" };
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payout = await step("payout", () => runWeeklyPayout());
  const expiry = await step("expiry", () => runContractExpiryCheck());
  const inactivity = await step("inactivity", () => runInactivityCheck());
  const reminder = await step("reminder", () => runContractReminderCheck());

  const hasError = [payout, expiry, inactivity, reminder].some(r => "error" in r)
    || ("failed" in payout && payout.failed > 0);
  return NextResponse.json({ payout, expiry, inactivity, reminder }, { status: hasError ? 500 : 200 });
}
