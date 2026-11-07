import { NextRequest, NextResponse } from "next/server";
import "@/lib/community-job-bootstrap";
import { runWeeklyPayout, runReputationUpdate } from "@/lib/community-job-service";
import { runCoachSessionReminders } from "@/lib/coach-service";
import { closeExpiredIdeas, postIdeaDigests } from "@/lib/visionaer-service";
import { publishDueScheduledPosts } from "@/lib/journalist-service";
import { resolveDuePolls } from "@/lib/post-poll-service";
import { runContentDigest } from "@/lib/content-digest";
import { recordCronRun } from "@/lib/community-admin-overview";

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
 * Offene Community-Jobs: Verträge, Vertragsablauf, Verlängerungs-Erinnerung und
 * Inaktivitäts-Verwarnung entfallen — es gibt keine Mitgliedschaft mehr.
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

  const startedAt = Date.now();
  const payout = await step("payout", () => runWeeklyPayout());
  // Direkt nach dem Payout, damit die neue Woche schon ins Ansehen (Profilrahmen, Discord-Rolle) einfließt.
  const badges = await step("badges", () => runReputationUpdate());
  const coachReminders = await step("coachReminders", () => runCoachSessionReminders());
  const ideas = await step("ideas", () => closeExpiredIdeas());
  const scheduledPosts = await step("scheduledPosts", () => publishDueScheduledPosts());
  const pollResolve = await step("pollResolve", () => resolveDuePolls());
  const contentDigest = await step("contentDigest", () => runContentDigest());
  const ideaDigests = await step("ideaDigests", () => postIdeaDigests());

  const hasError = [payout, badges, coachReminders, ideas, ideaDigests, scheduledPosts, pollResolve, contentDigest].some(r => "error" in r)
    || ("failed" in payout && payout.failed > 0);
  const result = { payout, badges, coachReminders, ideas, ideaDigests, scheduledPosts, pollResolve, contentDigest };
  await recordCronRun(Date.now() - startedAt, hasError, result);
  return NextResponse.json(result, { status: hasError ? 500 : 200 });
}
