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
 * nachträglich ändert). winnerUserIds = alle User auf Platz 1 — bei Gleichstand mehrere, dann ist
 * jeder Tipp auf einen von ihnen richtig und alle diese Tipper teilen sich den Pott. Leer/null
 * bedeutet "kein Sieger" — der gesamte Pott verfällt, alle Tipps gelten als falsch.
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
/**
 * Macht eine evtl. vorherige Auflösung der Gesamtsieger-Vorhersagen eines Events rückgängig: bereits
 * ausgezahlte Pott-Gewinne werden zurückgebucht, der Streak-Zustand auf den Snapshot vor der Auflösung
 * zurückgesetzt, und die Tipps wieder als unaufgelöst (resolved: false) markiert. Wird sowohl von
 * resolveEventPredictions() (vor einer Neu-Auflösung) als auch beim Zurücksetzen des Event-Status vor
 * die Spielphase genutzt (siehe revertEventCompletion) — dort bleiben die Tipps danach bewusst
 * unaufgelöst stehen (kein `correct: false`), da der Sieger schlicht wieder offen ist, nicht falsch.
 */
export async function rollbackResolvedPredictions(eventId: string) {
  const alreadyResolved = await prisma.eventWinnerPrediction.findMany({ where: { eventId, resolved: true } });

  for (const prediction of alreadyResolved) {
    const txns = [];

    // Ausgezahlt (richtig) oder erstattet (correct null) — beides zurücknehmen
    if (prediction.coinsAwarded > 0) {
      txns.push(
        prisma.user.update({
          where: { id: prediction.userId },
          data: { points: { decrement: prediction.coinsAwarded } },
        }),
        prisma.pointTransaction.create({
          data: {
            userId: prediction.userId,
            amount: -prediction.coinsAwarded,
            reason: prediction.correct ? "🎯 Korrektur: Sieger wurde neu ermittelt — Auszahlung zurückgebucht" : "🎯 Korrektur: Erstattung zurückgebucht (wird neu ausgewertet)",
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
}

function toWinnerSet(winnerUserIds: string[] | string | null): Set<string> {
  return new Set((Array.isArray(winnerUserIds) ? winnerUserIds : winnerUserIds ? [winnerUserIds] : []).filter(Boolean));
}

/** Ergebnis je Tipp für eine (geplante) Auflösung — gleiche Regeln wie resolveEventPredictions. */
function planResolution(
  predictions: { id: string; wager: number; predictedUserId: string }[],
  winnerUserSet: Set<string>,
): { winnerIds: Set<string>; payouts: Map<string, number> } {
  const winnerIds = new Set(predictions.filter(p => winnerUserSet.has(p.predictedUserId)).map(p => p.id));
  // Sonderfall: nur ein einziger Tipp insgesamt, und er ist richtig → Auszahlung verdoppelt,
  // da kein Pott mit anderen Teilnehmern existiert.
  const soloCorrect = predictions.length === 1 && winnerIds.has(predictions[0].id);
  const payouts = soloCorrect
    ? new Map([[predictions[0].id, predictions[0].wager * 2]])
    : computeSidePotPayouts(predictions, winnerIds);
  return { winnerIds, payouts };
}

type PredictionRow = { id: string; userId: string; wager: number; predictedUserId: string };

/** Meldung zum Tipp (Regel "prediction_settled"): mit Eventname und Link zur Eventseite. */
function notifySettled(userId: string, eventId: string, eventTitle: string, headline: string, detail: string) {
  dispatchNotification("prediction_settled", {
    users: [userId],
    placeholders: { "{eventName}": eventTitle, "{headline}": headline, "{detail}": detail },
    urlOverride: `/tournament/${eventId}`, skipDiscordChannel: true,
  }).catch(() => {});
}

/** Einsatz zurückbuchen und den Tipp als erstattet markieren (resolved, correct = null, coinsAwarded = Einsatz). */
async function refundPrediction(p: PredictionRow, reason: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: p.userId }, data: { points: { increment: p.wager } } }),
    prisma.pointTransaction.create({ data: { userId: p.userId, amount: p.wager, reason: `🎯 Einsatz zurück: ${reason}` } }),
    prisma.eventWinnerPrediction.update({
      where: { id: p.id },
      data: { resolved: true, correct: null, coinsAwarded: p.wager, streakSnapshotJson: null },
    }),
  ]);
}

/**
 * Event wird gelöscht/abgesagt: offene Einsätze zurückbuchen, bevor die Tipps mit dem Event verschwinden.
 * revert = true (Belohnungen werden mit zurückgebucht): auch schon ausgewertete Tipps zurückdrehen und erstatten.
 */
export async function refundPredictionsBeforeDelete(eventId: string, revert: boolean): Promise<number> {
  if (revert) await rollbackResolvedPredictions(eventId);
  const [open, event] = await Promise.all([
    prisma.eventWinnerPrediction.findMany({ where: { eventId, resolved: false } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
  ]);
  for (const p of open) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: p.userId }, data: { points: { increment: p.wager } } }),
      prisma.pointTransaction.create({ data: { userId: p.userId, amount: p.wager, reason: "🎯 Einsatz zurück: Event abgesagt" } }),
    ]);
    notifySettled(p.userId, eventId, event?.title ?? "Event", "Einsatz zurück", `Das Event wurde abgesagt. Deine ${p.wager} Münzen sind wieder auf deinem Konto.`);
  }
  return open.length;
}

/**
 * Wertet alle Gesamtsieger-Vorhersagen aus (siehe Kommentar oben). Zusätzlich:
 *  - kein Sieger (leer/null): niemand lag falsch — alle bekommen ihren Einsatz zurück
 *  - playedUserIds: wer tatsächlich mitgespielt hat. Tipps auf andere (nie angemeldet, abgemeldet,
 *    nicht ausgelost, "nicht da") sind ungültig: Einsatz zurück, sie zählen nicht zum Pott.
 */
export async function resolveEventPredictions(
  eventId: string, winnerUserIds: string[] | string | null, opts: { playedUserIds?: Set<string> } = {},
) {
  const winnerUserSet = toWinnerSet(winnerUserIds);
  const allPredictions = await prisma.eventWinnerPrediction.findMany({ where: { eventId } });
  if (allPredictions.length === 0) return;

  const event = await prisma.event.findUnique({
    where:  { id: eventId },
    select: { title: true, hidden: true, series: { select: { hidden: true } } },
  });
  const notifyParticipants = !!event && !isEventHidden(event);
  const title = event?.title ?? "Event";

  // ── Schritt 1: eine evtl. vorherige Auflösung rückgängig machen ─────────────
  await rollbackResolvedPredictions(eventId);
  const predictions = await prisma.eventWinnerPrediction.findMany({ where: { eventId } });

  // ── Kein Sieger: alle Einsätze zurück ───────────────────────────────────────
  if (winnerUserSet.size === 0) {
    for (const p of predictions) {
      await refundPrediction(p, "kein Sieger ermittelt");
      if (notifyParticipants) notifySettled(p.userId, eventId, title, "Einsatz zurück", `Es gibt keinen Sieger. Deine ${p.wager} Münzen sind wieder auf deinem Konto.`);
    }
    return;
  }

  // ── Ungültige Tipps (auf jemanden, der nicht mitgespielt hat): Einsatz zurück ─
  const played = opts.playedUserIds;
  const invalid = played ? predictions.filter(p => !played.has(p.predictedUserId) && !winnerUserSet.has(p.predictedUserId)) : [];
  const valid = predictions.filter(p => !invalid.includes(p));
  for (const p of invalid) {
    await refundPrediction(p, "getippter Spieler hat nicht mitgespielt");
    if (notifyParticipants) notifySettled(p.userId, eventId, title, "Einsatz zurück", `Dein Tipp war ungültig, weil der Spieler nicht mitgespielt hat. Deine ${p.wager} Münzen sind zurück.`);
  }

  // ── Schritt 2: frische Auflösung mit dem (neuen) Sieger ─────────────────────
  // Richtig ist jeder Tipp auf einen der (ggf. gleichauf liegenden) Erstplatzierten
  const { winnerIds, payouts } = planResolution(valid, winnerUserSet);
  const winnerNames = (await prisma.user.findMany({ where: { id: { in: [...winnerUserSet] } }, select: { username: true, name: true } }))
    .map(u => u.username ?? u.name ?? "?").join(", ");

  for (const prediction of valid) {
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
        notifySettled(prediction.userId, eventId, title, "leider falsch", `Gewonnen hat ${winnerNames}. Dein Einsatz von ${prediction.wager} Münzen ist verloren.`);
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
      notifySettled(prediction.userId, eventId, title, "richtig!", payout > 0 ? `+${payout} Münzen aus dem Pott (Einsatz ${prediction.wager}).` : "Richtig getippt.");
    }
  }
}
