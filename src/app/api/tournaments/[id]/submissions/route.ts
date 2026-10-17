import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";
import {
  MAX_NOTE_LENGTH,
  MAX_SCREENSHOTS,
  applySubmissionValues,
  checkSubmissionValues,
  revertProvisional,
  cleanInt,
  cleanStats,
  isParticipantEditLocked,
  isProofUrl,
  isDuelMatch,
  submissionSubject,
  type SubmissionValues,
} from "@/lib/tournaments/matchSubmissions";

function fail(err: unknown) {
  if (err instanceof ApplyMatchResultError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}

/** Teilnehmer meldet ein Ergebnis (eigenes oder das eines anderen Spielers) samt Screenshot-Nachweis (erneutes Senden ersetzt die eigene Meldung). */
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
    include: { entries: { select: { userId: true } }, event: { select: { tournamentStatus: true, status: true, completionData: true } } },
  });
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 });

  // Jeder Teilnehmer des Events (kein Zuschauer) darf Ergebnisse melden — auch für Matches/Spieler,
  // an denen er selbst nicht beteiligt ist.
  const isInMatch =
    match.player1Id === user.id || match.player2Id === user.id || match.entries.some((e) => e.userId === user.id);
  if (!isInMatch) {
    const [reg, participant] = await Promise.all([
      prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId: user.id, eventId } }, select: { role: true } }),
      prisma.tournamentParticipant.findUnique({ where: { eventId_userId: { eventId, userId: user.id } }, select: { id: true } }),
    ]);
    if (!participant && (!reg || reg.role === "spectator")) {
      return NextResponse.json({ error: "Nur Teilnehmer des Events können Ergebnisse melden" }, { status: 403 });
    }
  }

  // FFA/Coop: Für welchen Spieler werden die Werte gemeldet? (Standard: der Melder selbst)
  const isDuel = isDuelMatch(match);
  const subjectId = !isDuel && typeof body.forUserId === "string" && body.forUserId ? body.forUserId : user.id;
  if (!isDuel && !match.entries.some((e) => e.userId === subjectId)) {
    return NextResponse.json({ error: "Dieser Spieler spielt in diesem Match nicht mit" }, { status: 400 });
  }
  const forUserId = subjectId === user.id ? "" : subjectId;

  if (isParticipantEditLocked(match.event)) {
    return NextResponse.json(
      { error: "Die aktive Eventphase ist abgeschlossen — Ergebnisse können nicht mehr geändert werden" },
      { status: 409 },
    );
  }

  const existing = await prisma.matchResultSubmission.findUnique({
    where: { matchId_userId_forUserId: { matchId: match.id, userId: user.id, forUserId } },
  });

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

    const values: SubmissionValues = {
      score1: data.score1, score2: data.score2, placement: data.placement, score: data.score,
      statsJson: data.statsJson ? JSON.parse(data.statsJson) : null,
    };
    // Vorab prüfen (z.B. Unentschieden im K.-o.-Baum), damit keine unbrauchbare Meldung gespeichert wird.
    await checkSubmissionValues(eventId, subjectId, match.id, values);

    const submission = await prisma.matchResultSubmission.upsert({
      where: { matchId_userId_forUserId: { matchId: match.id, userId: user.id, forUserId } },
      create: { ...data, matchId: match.id, userId: user.id, forUserId },
      update: { ...data, applied: false },
    });

    // Direkt für alle sichtbar — außer ein Admin hat das Ergebnis dieses Matches bereits bestätigt;
    // dann bleibt die Korrektur offen, bis ein Admin sie prüft.
    const fresh = await prisma.match.findUnique({ where: { id: match.id }, select: { resultConfirmed: true, playedAt: true } });
    const adminConfirmed = !!fresh?.playedAt && fresh.resultConfirmed;
    if (!adminConfirmed) {
      await applySubmissionValues(eventId, submission.id, subjectId, match.id, values, true);
    }
    return NextResponse.json({ ...submission, visible: !adminConfirmed }, { status: existing ? 200 : 201 });
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

  // Atomar "beanspruchen": zwei Admins (oder Doppelklick) können dieselbe Meldung nicht parallel übernehmen.
  const claimed = await prisma.matchResultSubmission.updateMany({
    where: { id: sub.id, status: "pending" },
    data: { status: "processing" },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Meldung wurde bereits bearbeitet oder vom Spieler geändert — bitte neu laden" }, { status: 409 });
  }

  const release = () =>
    prisma.matchResultSubmission.updateMany({ where: { id: sub.id, status: "processing" }, data: { status: "pending" } });

  try {
    const base = { reviewedById: reviewer.id, reviewedAt: new Date(), reviewNote };
    let data: Record<string, unknown>;

    if (body.action === "reject") {
      if (sub.applied) await revertProvisional(eventId, submissionSubject(sub), sub.matchId);
      data = { ...base, status: "rejected", applied: false };
    } else {
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

      await applySubmissionValues(eventId, sub.id, submissionSubject(sub), sub.matchId, values);

      data = {
        ...base,
        status: body.action === "correct" ? "corrected" : "approved",
        ...(body.action === "correct"
          ? { ...values, statsJson: values.statsJson ? JSON.stringify(values.statsJson) : null, originalJson: JSON.stringify(original) }
          : {}),
      };
    }

    // Hat der Spieler währenddessen neu gemeldet (Status wieder "pending"), bleibt seine neue Meldung offen.
    const done = await prisma.matchResultSubmission.updateMany({ where: { id: sub.id, status: "processing" }, data });
    const updated = await prisma.matchResultSubmission.findUnique({ where: { id: sub.id } });
    return NextResponse.json({ ...updated, supersededByPlayer: done.count === 0 });
  } catch (err) {
    await release();
    return fail(err);
  }
}
