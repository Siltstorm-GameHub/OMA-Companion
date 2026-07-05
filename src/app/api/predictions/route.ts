import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMinigameEnabled, getMinigamesConfig } from "@/lib/minigames-config";
import { PREDICTION_MIN_WAGER } from "@/lib/predictions";

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

  const { eventId, predictedUserId, wager } = await req.json();
  if (!eventId || !predictedUserId || typeof wager !== "number" || !Number.isInteger(wager)) {
    return NextResponse.json({ error: "eventId/predictedUserId/wager fehlt oder ungültig" }, { status: 400 });
  }

  const config = await getMinigamesConfig();
  if (wager < PREDICTION_MIN_WAGER || wager > config.predictionMaxWager) {
    return NextResponse.json({ error: `Einsatz muss zwischen ${PREDICTION_MIN_WAGER} und ${config.predictionMaxWager} Münzen liegen` }, { status: 400 });
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

  try {
    const prediction = await prisma.$transaction(async tx => {
      const existing = await tx.eventWinnerPrediction.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });

      if (existing) {
        await tx.user.update({ where: { id: userId }, data: { points: { increment: existing.wager } } });
        await tx.pointTransaction.create({
          data: { userId, amount: existing.wager, reason: "🎯 Vorhersage geändert — Einsatz zurückerstattet" },
        });
      }

      const debit = await tx.user.updateMany({
        where: { id: userId, points: { gte: wager } },
        data: { points: { decrement: wager } },
      });
      if (debit.count === 0) throw new Error("INSUFFICIENT_FUNDS");

      await tx.pointTransaction.create({
        data: { userId, amount: -wager, reason: "🎯 Einsatz: Event-Sieger-Vorhersage" },
      });

      return tx.eventWinnerPrediction.upsert({
        where: { userId_eventId: { userId, eventId } },
        create: { userId, eventId, predictedUserId, wager },
        update: { predictedUserId, wager, resolved: false, correct: null, coinsAwarded: 0 },
      });
    });

    return NextResponse.json({ ok: true, prediction: { ...prediction, predictedUser } });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Nicht genug Münzen für diesen Einsatz" }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  const existing = await prisma.eventWinnerPrediction.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (!existing) return NextResponse.json({ ok: true });

  // Bereits ausgewertete Tipps: einfach löschen, kein Einsatz mehr zu erstatten (schon abgerechnet)
  if (existing.resolved) {
    await prisma.eventWinnerPrediction.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startAt: true, status: true },
  });
  const isLocked = !event || event.status === "finished" || event.startAt < new Date();
  if (isLocked) {
    return NextResponse.json({ error: "Tipp-Abgabe für dieses Event ist gesperrt — Löschen nicht mehr möglich" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { points: { increment: existing.wager } } }),
    prisma.pointTransaction.create({
      data: { userId, amount: existing.wager, reason: "🎯 Vorhersage gelöscht — Einsatz zurückerstattet" },
    }),
    prisma.eventWinnerPrediction.delete({ where: { id: existing.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
