import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createTrainingSession } from "@/lib/coach-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Anstehende Trainings-Termine (für alle sichtbar — Coach-Büro + Anmeldung), je mit
 * `isMine` (eigener Termin) und `signedUp` (bin ich angemeldet). Die Teilnehmerliste
 * bekommt nur der Coach des Termins. Zusätzlich `rateable`: vergangene Termine
 * (30 Tage), an denen der User teilgenommen und noch nicht bewertet hat.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const now = new Date();
  const [upcoming, rateable, pastOwn] = await Promise.all([
    prisma.coachTrainingSession.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: {
        coach: { select: { id: true, username: true, name: true } },
        signups: { select: { userId: true, user: { select: { id: true, username: true, name: true } } } },
        waitlist: { select: { userId: true } },
      },
    }),
    prisma.coachTrainingSession.findMany({
      where: {
        startAt: { lt: now, gte: new Date(now.getTime() - 30 * 86_400_000) },
        coachId: { not: user.id },
        signups: { some: { userId: user.id } },
        ratings: { none: { raterId: user.id } },
      },
      orderBy: { startAt: "desc" },
      include: { coach: { select: { id: true, username: true, name: true } } },
    }),
    // Eigene vergangene Termine (30 Tage) samt Teilnehmern + Anwesenheit — zum Eintragen im Büro.
    prisma.coachTrainingSession.findMany({
      where: { coachId: user.id, startAt: { lt: now, gte: new Date(now.getTime() - 30 * 86_400_000) } },
      orderBy: { startAt: "desc" },
      include: { signups: { select: { userId: true, attended: true, user: { select: { id: true, username: true, name: true } } } } },
    }),
  ]);

  const sessions = upcoming.map(({ signups, waitlist, ...s }) => ({
    ...s,
    onWaitlist: waitlist.some(w => w.userId === user.id),
    waitlistCount: waitlist.length,
    isMine: s.coachId === user.id,
    signedUp: signups.some(x => x.userId === user.id),
    _count: { signups: signups.length },
    participants: s.coachId === user.id ? signups.map(x => x.user) : undefined,
  }));
  const past = pastOwn.map(({ signups, ...s }) => ({
    ...s,
    participants: signups.map(x => ({ ...x.user, attended: x.attended })),
  }));
  return NextResponse.json({ sessions, rateable, past });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { title, description, startAt, capacity, discordChannelId, eventId, repeatWeeks, meetingUrl } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof startAt !== "string") {
    return NextResponse.json({ error: "Titel und Startzeit erforderlich" }, { status: 400 });
  }

  const result = await createTrainingSession(user.id, {
    title, description: typeof description === "string" ? description : undefined,
    startAt: new Date(startAt), capacity: typeof capacity === "number" ? capacity : undefined,
    discordChannelId: typeof discordChannelId === "string" ? discordChannelId : undefined,
    eventId: typeof eventId === "string" && eventId ? eventId : undefined,
    repeatWeeks: typeof repeatWeeks === "number" ? repeatWeeks : undefined,
    meetingUrl: typeof meetingUrl === "string" ? meetingUrl : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
