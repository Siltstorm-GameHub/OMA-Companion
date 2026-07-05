import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMinigameEnabled } from "@/lib/minigames-config";

const userSelect = { id: true, username: true, name: true, image: true } as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  const myPrediction = await prisma.eventWinnerPrediction.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
    include: { predictedUser: { select: userSelect } },
  });

  return NextResponse.json({ myPrediction });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isMinigameEnabled("prediction"))) {
    return NextResponse.json({ error: "Event-Vorhersagen sind zurzeit deaktiviert" }, { status: 403 });
  }

  const { eventId, predictedUserId } = await req.json();
  if (!eventId || !predictedUserId) {
    return NextResponse.json({ error: "eventId/predictedUserId fehlt" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startAt: true, status: true },
  });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });

  const isLocked = event.status === "finished" || event.startAt < new Date();
  if (isLocked) {
    return NextResponse.json({ error: "Tipp-Abgabe für dieses Event ist gesperrt" }, { status: 409 });
  }

  const predictedUser = await prisma.user.findUnique({ where: { id: predictedUserId }, select: userSelect });
  if (!predictedUser) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  const prediction = await prisma.eventWinnerPrediction.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, predictedUserId },
    update: { predictedUserId },
  });

  return NextResponse.json({ ok: true, prediction: { ...prediction, predictedUser } });
}
