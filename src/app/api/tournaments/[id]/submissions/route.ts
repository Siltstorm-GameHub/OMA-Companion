import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";
import {
  MAX_NOTE_LENGTH,
  MAX_SCREENSHOTS,
  applySubmissionValues,
  cleanInt,
  cleanStats,
  isProofUrl,
} from "@/lib/tournaments/matchSubmissions";

function fail(err: unknown) {
  if (err instanceof ApplyMatchResultError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}

/** Teilnehmer meldet sein Ergebnis samt Screenshot-Nachweis (erneutes Senden ersetzt eine offene/abgelehnte Meldung). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.matchId !== "string") {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const urls: unknown = body.screenshotUrls;
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > MAX_SCREENSHOTS || !urls.every(isProofUrl)) {
    return NextResponse.json(
      { error: `Mindestens 1, höchstens ${MAX_SCREENSHOTS} Screenshots als Nachweis erforderlich` },
      { status: 400 },
    );
  }

  const match = await prisma.match.findFirst({
    where: { id: body.matchId, eventId },
    include: { entries: { select: { userId: true } }, event: { select: { tournamentStatus: true, status: true } } },
  });
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 });

  const isInMatch =
    match.player1Id === user.id || match.player2Id === user.id || match.entries.some((e) => e.userId === user.id);
  if (!isInMatch) return NextResponse.json({ error: "Du spielst in diesem Match nicht mit" }, { status: 403 });

  if (match.event.status === "finished" || match.event.tournamentStatus === "finalized") {
    return NextResponse.json({ error: "Das Event ist bereits abgeschlossen" }, { status: 409 });
  }

  const existing = await prisma.matchResultSubmission.findUnique({
    where: { matchId_userId: { matchId: match.id, userId: user.id } },
  });
  if (existing && (existing.status === "approved" || existing.status === "corrected")) {
    return NextResponse.json({ error: "Deine Meldung wurde bereits übernommen" }, { status: 409 });
  }

  try {
    const data = {
      eventId,
      score1: cleanInt(body.score1),
      score2: cleanInt(body.score2),
      placement: cleanInt(body.placement, 1000),
      score: cleanInt(body.score, 10_000_000),
      statsJson: (() => {
        const s = cleanStats(body.statsJson);
        return s ? JSON.stringify(s) : null;
      })(),
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : null,
      screenshotUrls: JSON.stringify(urls),
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      originalJson: null,
    };
    const hasValue = data.score1 != null || data.score2 != null || data.placement != null || data.score != null || data.statsJson;
    if (!hasValue) return NextResponse.json({ error: "Bitte ein Ergebnis angeben" }, { status: 400 });

    const submission = await prisma.matchResultSubmission.upsert({
      where: { matchId_userId: { matchId: match.id, userId: user.id } },
      create: { ...data, matchId: match.id, userId: user.id },
      update: data,
    });
    return NextResponse.json(submission, { status: existing ? 200 : 201 });
  } catch (err) {
    return fail(err);
  }
}

/** Admin/Moderator prüft eine Meldung: approve (so übernehmen), correct (mit eigenen Werten übernehmen), reject. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const reviewer = await requireModeratorOrEventSquadCaptain(eventId);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.submissionId !== "string" || !["approve", "correct", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const sub = await prisma.matchResultSubmission.findFirst({ where: { id: body.submissionId, eventId } });
  if (!sub) return NextResponse.json({ error: "Meldung nicht gefunden" }, { status: 404 });

  const reviewNote =
    typeof body.reviewNote === "string" && body.reviewNote.trim() ? body.reviewNote.trim().slice(0, MAX_NOTE_LENGTH) : null;

  try {
    if (body.action === "reject") {
      const updated = await prisma.matchResultSubmission.update({
        where: { id: sub.id },
        data: { status: "rejected", reviewedById: reviewer.id, reviewedAt: new Date(), reviewNote },
      });
      return NextResponse.json(updated);
    }

    const original = {
      score1: sub.score1, score2: sub.score2, placement: sub.placement, score: sub.score,
      statsJson: sub.statsJson ? JSON.parse(sub.statsJson) : null,
    };
    const values =
      body.action === "correct"
        ? {
            score1: cleanInt(body.score1),
            score2: cleanInt(body.score2),
            placement: cleanInt(body.placement, 1000),
            score: cleanInt(body.score, 10_000_000),
            statsJson: cleanStats(body.statsJson),
          }
        : original;

    await applySubmissionValues(eventId, sub.userId, sub.matchId, values);

    const updated = await prisma.matchResultSubmission.update({
      where: { id: sub.id },
      data: {
        status: body.action === "correct" ? "corrected" : "approved",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        reviewNote,
        ...(body.action === "correct"
          ? {
              ...values,
              statsJson: values.statsJson ? JSON.stringify(values.statsJson) : null,
              originalJson: JSON.stringify(original),
            }
          : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return fail(err);
  }
}
