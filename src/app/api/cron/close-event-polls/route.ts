import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as completeEventRoute } from "@/app/api/admin/events/[id]/complete/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function legacyPollConfigured(pollConfigJson: string | null | undefined): boolean {
  if (!pollConfigJson) return false;
  try { return !!(JSON.parse(pollConfigJson) as { enabled?: boolean } | null)?.enabled; }
  catch { return false; }
}

/**
 * GET /api/cron/close-event-polls
 *
 * Schließt die Umfragephase (Status "umfrage") automatisch ab, sobald alle zugehörigen
 * EventPoll-Umfragen (mit fest eingestellter Dauer, siehe "Live-Umfragen" im Abschluss-Panel)
 * ihr Abstimmungsfenster (endAt) überschritten haben — vorher musste dafür ein Admin die
 * Umfragephase manuell erneut speichern. Ruft dafür intern denselben Abschluss-Endpunkt auf,
 * den auch Admins nutzen (identische Sperr-/Auszahlungslogik), mit den zuletzt gespeicherten
 * Werten (completionData) als Body — es ändert sich inhaltlich nichts außer dem Status.
 *
 * Bleibt eine (nicht an eine feste Dauer gebundene) Legacy-Einzelumfrage ohne bereits gewählten
 * Sieger offen, wird das Event übersprungen — das erfordert weiterhin eine manuelle Entscheidung.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const candidates = await prisma.event.findMany({
    where: { status: "umfrage" },
    select: {
      id: true,
      completionData: true,
      finalRankingNote: true,
      pollConfigJson: true,
      series: { select: { pollConfigJson: true } },
      polls: { where: { rewardsPaid: false }, select: { endAt: true } },
      _count: { select: { polls: true } },
    },
  });

  const finalized: string[] = [];
  const skipped: string[] = [];

  for (const event of candidates) {
    // Ohne jemals angelegte EventPoll gibt es keine "genaue Dauer", auf die gewartet werden könnte —
    // das Event steckt dann ausschließlich wegen der bewussten Zwei-Schritt-Bestätigung in "umfrage"
    // (siehe Kommentar in route.ts) und braucht weiterhin eine explizite manuelle Bestätigung.
    if (event._count.polls === 0) { skipped.push(event.id); continue; }
    if (event.polls.some(p => p.endAt > now)) continue; // Umfrage(n) laufen noch

    const oldCompletion = (() => {
      try { return JSON.parse(event.completionData ?? "{}") as Record<string, unknown>; }
      catch { return {}; }
    })();

    const hasLegacyPoll = legacyPollConfigured(event.pollConfigJson ?? event.series?.pollConfigJson);
    const legacyResolved = !hasLegacyPoll || ((oldCompletion.pollWinnerIds as string[] | null)?.length ?? 0) > 0;
    if (!legacyResolved) { skipped.push(event.id); continue; } // braucht noch eine manuelle Sieger-Wahl

    const body = {
      mvpUserId:               oldCompletion.mvpUserId ?? undefined,
      winnerStatField:         oldCompletion.winnerStatField ?? undefined,
      avgWinnerDirection:      oldCompletion.avgWinnerDirection ?? undefined,
      seriesWinnerTargetField: oldCompletion.seriesWinnerTargetField ?? undefined,
      pollWinnerIds:           oldCompletion.pollWinnerIds ?? undefined,
      pollLabel:               oldCompletion.pollLabel ?? undefined,
      pollBonusCoins:          oldCompletion.pollBonusCoins ?? undefined,
      pollBonusRankPoints:     oldCompletion.pollBonusRankPoints ?? undefined,
      pollExcludedUserIds:     oldCompletion.pollExcludedUserIds ?? undefined,
      spectatorAttendedIds:    oldCompletion.spectatorAttendedIds ?? undefined,
      finalRanking:            oldCompletion.finalRanking ?? undefined,
      finalRankingGroups:      oldCompletion.finalRankingGroups ?? undefined,
      finalRankingNote:        event.finalRankingNote ?? undefined,
      excludedUserIds:         oldCompletion.excludedUserIds ?? undefined,
    };

    const internalReq = new NextRequest(`http://internal.local/api/admin/events/${event.id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify(body),
    });

    try {
      const res = await completeEventRoute(internalReq, { params: Promise.resolve({ id: event.id }) });
      if (res.ok) finalized.push(event.id);
      else skipped.push(event.id);
    } catch {
      skipped.push(event.id);
    }
  }

  return NextResponse.json({ ok: true, finalized, skipped });
}
