import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";

/** Mindest-Einsatz (nicht admin-editierbar, Höchsteinsatz kommt aus getMinigamesConfig()) */
export const PREDICTION_MIN_WAGER = 10;

/** Multiplikator auf den Gewinn (nicht den Einsatz selbst) basierend auf dem aktuellen Streak-Stand */
function streakMultiplier(streak: number): number {
  if (streak >= 10) return 2;
  if (streak >= 6) return 1.5;
  if (streak >= 3) return 1.25;
  return 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Wertet alle offenen Gesamtsieger-Vorhersagen zu einem Event aus, sobald der
 * Sieger feststeht. winnerUserId = null bedeutet "kein eindeutiger Sieger"
 * (z.B. kooperatives Event ohne Platzierung) — alle offenen Tipps werden dann
 * als falsch aufgelöst.
 *
 * Der Einsatz (wager) wurde bereits bei Abgabe des Tipps abgebucht (Escrow).
 * Bei richtigem Tipp wird der Einsatz zurückerstattet plus ein Gewinn
 * (Einsatz × Streak-Multiplikator) ausgezahlt. Bei falschem Tipp bleibt der
 * Einsatz verloren — hier passiert keine weitere Buchung.
 */
export async function resolveEventPredictions(eventId: string, winnerUserId: string | null) {
  const predictions = await prisma.eventWinnerPrediction.findMany({
    where: { eventId, resolved: false },
  });
  if (predictions.length === 0) return;

  for (const prediction of predictions) {
    const correct = !!winnerUserId && prediction.predictedUserId === winnerUserId;

    if (!correct) {
      await prisma.$transaction([
        prisma.eventWinnerPrediction.update({
          where: { id: prediction.id },
          data: { resolved: true, correct: false, coinsAwarded: 0 },
        }),
        prisma.predictionStreak.upsert({
          where: { userId: prediction.userId },
          create: { userId: prediction.userId, current: 0, best: 0 },
          update: { current: 0 },
        }),
      ]);
      dispatchNotification("prediction_result", {
        users: [prediction.userId],
        placeholders: { "{result}": `falsch — dein Einsatz von ${prediction.wager} Münzen ist verloren`, "{reward}": "0" },
      }).catch(() => {});
      continue;
    }

    const streak = await prisma.predictionStreak.findUnique({ where: { userId: prediction.userId } });
    const today = todayStr();
    const alreadyCountedToday = streak?.lastPlayedDay === today;
    const newCurrent = alreadyCountedToday ? (streak?.current ?? 1) : (streak?.current ?? 0) + 1;
    const newBest = Math.max(newCurrent, streak?.best ?? 0);
    const profit = Math.round(prediction.wager * streakMultiplier(newCurrent));
    const payout = prediction.wager + profit;

    await prisma.$transaction([
      prisma.eventWinnerPrediction.update({
        where: { id: prediction.id },
        data: { resolved: true, correct: true, coinsAwarded: payout },
      }),
      prisma.pointTransaction.create({
        data: { userId: prediction.userId, amount: payout, reason: "🎯 Event-Sieger-Vorhersage richtig" },
      }),
      prisma.user.update({
        where: { id: prediction.userId },
        data: { points: { increment: payout } },
      }),
      prisma.predictionStreak.upsert({
        where: { userId: prediction.userId },
        create: { userId: prediction.userId, current: newCurrent, best: newBest, lastPlayedDay: today },
        update: { current: newCurrent, best: newBest, lastPlayedDay: today },
      }),
    ]);

    dispatchNotification("prediction_result", {
      users: [prediction.userId],
      placeholders: { "{result}": "richtig", "{reward}": String(payout) },
    }).catch(() => {});
  }
}
