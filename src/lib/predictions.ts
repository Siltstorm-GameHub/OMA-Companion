import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";
import { isEventHidden } from "./event-visibility";

/** Mindest-Einsatz (nicht admin-editierbar, Höchsteinsatz kommt aus getMinigamesConfig()) */
export const PREDICTION_MIN_WAGER = 10;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type StreakSnapshot = { current: number; best: number; lastPlayedDay: string | null };

async function snapshotStreak(userId: string): Promise<StreakSnapshot> {
  const streak = await prisma.predictionStreak.findUnique({ where: { userId } });
  return { current: streak?.current ?? 0, best: streak?.best ?? 0, lastPlayedDay: streak?.lastPlayedDay ?? null };
}

/**
 * Side-Pot-Aufteilung (wie beim Poker): jeder richtige Tipper kann von jedem anderen Teilnehmer
 * maximal seinen eigenen Einsatz gewinnen. Setzt ein Gewinner z.B. nur 1 Münze, kann er auch nur
 * 1 Münze je Mitspieler gewinnen — der Rest darüber (von höher einsetzenden Verlierern) verfällt,
 * sofern kein Gewinner mit entsprechend hohem Einsatz existiert.
 */
function computeSidePotPayouts(
  allPredictions: { id: string; wager: number }[],
  winnerIds: Set<string>
): Map<string, number> {
  const payouts = new Map<string, number>();
  const winners = allPredictions.filter(p => winnerIds.has(p.id));
  if (winners.length === 0) return payouts;

  const thresholds = [...new Set(allPredictions.map(p => p.wager))].sort((a, b) => a - b);
  // Deterministische Reihenfolge für die Verteilung von Rundungsresten
  const sortedWinnerIds = [...winners].sort((a, b) => a.id.localeCompare(b.id)).map(w => w.id);

  let prevThreshold = 0;
  for (const t of thresholds) {
    const layerHeight = t - prevThreshold;
    if (layerHeight <= 0) { prevThreshold = t; continue; }

    const contributorCount = allPredictions.filter(p => p.wager >= t).length;
    const layerSize = layerHeight * contributorCount;
    const eligibleWinnerIds = sortedWinnerIds.filter(id => {
      const w = winners.find(x => x.id === id)!;
      return w.wager >= t;
    });

    if (eligibleWinnerIds.length > 0 && layerSize > 0) {
      const share = Math.floor(layerSize / eligibleWinnerIds.length);
      const remainder = layerSize - share * eligibleWinnerIds.length;
      for (const id of eligibleWinnerIds) {
        payouts.set(id, (payouts.get(id) ?? 0) + share);
      }
      for (let i = 0; i < remainder; i++) {
        const id = eligibleWinnerIds[i % eligibleWinnerIds.length];
        payouts.set(id, (payouts.get(id) ?? 0) + 1);
      }
    }
    // Kein Gewinner deckt diese Schicht ab → das Geld darin verfällt (bleibt unausgezahlt)
    prevThreshold = t;
  }

  return payouts;
}

/**
 * Wertet alle Gesamtsieger-Vorhersagen zu einem Event aus, sobald der Sieger feststeht (oder sich
 * nachträglich ändert). winnerUserId = null bedeutet "kein eindeutiger Sieger" — der gesamte Pott
 * verfällt, alle Tipps gelten als falsch.
 *
 * Pott-Prinzip (wie beim Poker): alle Einsätze (bereits bei Abgabe als Escrow abgebucht) bilden
 * gemeinsam den Pott. Die richtigen Tipper teilen sich den Pott per Side-Pot-Logik nach Einsatzhöhe
 * gestaffelt. Hat insgesamt nur ein einziger User getippt und lag richtig, wird seine Auszahlung
 * verdoppelt (da niemand da ist, mit dem er den Pott teilen könnte).
 *
 * Idempotent: wird die Funktion erneut mit einem anderen winnerUserId aufgerufen (z.B. weil der
 * Sieger nachträglich korrigiert wurde), macht sie zunächst eine evtl. vorherige Auflösung
 * vollständig rückgängig (Auszahlung zurückbuchen, Streak-Zustand wiederherstellen) und wertet dann
 * mit dem neuen Sieger neu aus.
 */
export async function resolveEventPredictions(eventId: string, winnerUserId: string | null) {
  const allPredictions = await prisma.eventWinnerPrediction.findMany({ where: { eventId } });
  if (allPredictions.length === 0) return;

  const event = await prisma.event.findUnique({
    where:  { id: eventId },
    select: { hidden: true, series: { select: { hidden: true } } },
  });
  const notifyParticipants = !!event && !isEventHidden(event);

  // ── Schritt 1: eine evtl. vorherige Auflösung rückgängig machen ─────────────
  const alreadyResolved = allPredictions.filter(p => p.resolved);
  for (const prediction of alreadyResolved) {
    const txns = [];

    if (prediction.correct && prediction.coinsAwarded > 0) {
      txns.push(
        prisma.user.update({
          where: { id: prediction.userId },
          data: { points: { decrement: prediction.coinsAwarded } },
        }),
        prisma.pointTransaction.create({
          data: {
            userId: prediction.userId,
            amount: -prediction.coinsAwarded,
            reason: "🎯 Korrektur: Sieger wurde neu ermittelt — Auszahlung zurückgebucht",
          },
        })
      );
    }

    if (prediction.streakSnapshotJson) {
      try {
        const snap = JSON.parse(prediction.streakSnapshotJson) as StreakSnapshot;
        txns.push(
          prisma.predictionStreak.upsert({
            where: { userId: prediction.userId },
            create: { userId: prediction.userId, current: snap.current, best: snap.best, lastPlayedDay: snap.lastPlayedDay },
            update: { current: snap.current, best: snap.best, lastPlayedDay: snap.lastPlayedDay },
          })
        );
      } catch { /* korruptes Snapshot ignorieren */ }
    }

    txns.push(
      prisma.eventWinnerPrediction.update({
        where: { id: prediction.id },
        data: { resolved: false, correct: null, coinsAwarded: 0, streakSnapshotJson: null },
      })
    );

    await prisma.$transaction(txns);
  }

  // ── Schritt 2: frische Auflösung mit dem (neuen) Sieger ─────────────────────
  const predictions = await prisma.eventWinnerPrediction.findMany({ where: { eventId } });
  const winnerIds = new Set(
    predictions.filter(p => !!winnerUserId && p.predictedUserId === winnerUserId).map(p => p.id)
  );

  // Sonderfall: nur ein einziger Tipp insgesamt, und er ist richtig → Auszahlung verdoppelt,
  // da kein Pott mit anderen Teilnehmern existiert.
  const soloCorrect = predictions.length === 1 && winnerIds.has(predictions[0].id);
  const payouts = soloCorrect
    ? new Map([[predictions[0].id, predictions[0].wager * 2]])
    : computeSidePotPayouts(predictions, winnerIds);

  for (const prediction of predictions) {
    const correct = winnerIds.has(prediction.id);
    const streakSnapshot = await snapshotStreak(prediction.userId);

    if (!correct) {
      await prisma.$transaction([
        prisma.eventWinnerPrediction.update({
          where: { id: prediction.id },
          data: {
            resolved: true,
            correct: false,
            coinsAwarded: 0,
            streakSnapshotJson: JSON.stringify(streakSnapshot),
          },
        }),
        prisma.predictionStreak.upsert({
          where: { userId: prediction.userId },
          create: { userId: prediction.userId, current: 0, best: 0 },
          update: { current: 0 },
        }),
      ]);
      if (notifyParticipants) {
        dispatchNotification("prediction_result", {
          users: [prediction.userId],
          placeholders: { "{result}": `falsch — dein Einsatz von ${prediction.wager} Münzen ist verloren`, "{reward}": "0" },
        }).catch(() => {});
      }
      continue;
    }

    const payout = payouts.get(prediction.id) ?? 0;
    const today = todayStr();
    const alreadyCountedToday = streakSnapshot.lastPlayedDay === today;
    const newCurrent = alreadyCountedToday ? streakSnapshot.current : streakSnapshot.current + 1;
    const newBest = Math.max(newCurrent, streakSnapshot.best);

    await prisma.$transaction([
      prisma.eventWinnerPrediction.update({
        where: { id: prediction.id },
        data: {
          resolved: true,
          correct: true,
          coinsAwarded: payout,
          streakSnapshotJson: JSON.stringify(streakSnapshot),
        },
      }),
      ...(payout > 0
        ? [
            prisma.pointTransaction.create({
              data: { userId: prediction.userId, amount: payout, reason: "🎯 Event-Sieger-Vorhersage richtig — Pott-Auszahlung" },
            }),
            prisma.user.update({
              where: { id: prediction.userId },
              data: { points: { increment: payout } },
            }),
          ]
        : []),
      prisma.predictionStreak.upsert({
        where: { userId: prediction.userId },
        create: { userId: prediction.userId, current: newCurrent, best: newBest, lastPlayedDay: today },
        update: { current: newCurrent, best: newBest, lastPlayedDay: today },
      }),
    ]);

    if (notifyParticipants) {
      dispatchNotification("prediction_result", {
        users: [prediction.userId],
        placeholders: { "{result}": "richtig", "{reward}": String(payout) },
      }).catch(() => {});
    }
  }
}
