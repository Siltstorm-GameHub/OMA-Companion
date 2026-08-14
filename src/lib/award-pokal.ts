import { prisma } from "@/lib/prisma";

/**
 * Vergibt (bzw. aktualisiert) digitale Pokale für die Gewinner eines abgeschlossenen,
 * eigenständigen (nicht Teil einer Eventreihe) Events. Liest eventWinnerIds aus
 * event.completionData (gleiches Parsing-Muster wie recompute-wanderpocal.ts).
 * Idempotent: kann mehrfach mit demselben Endstand aufgerufen werden, entfernt
 * außerdem Pokal-Zeilen für User, die nicht mehr in der aktuellen Gewinnerliste stehen
 * (z.B. nach nachträglicher Korrektur des Gewinners).
 */
export async function awardEventPokal(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, category: true, seriesId: true, completionData: true },
  });
  if (!event) return;
  // Nur echte Standalone-Events (nicht Teil einer Eventreihe) erhalten einen Standalone-Pokal.
  if (event.seriesId) return;

  let parsed: { eventWinnerIds?: string[] } = {};
  try {
    parsed = event.completionData ? JSON.parse(event.completionData) : {};
  } catch {
    return;
  }
  const winnerIds = Array.from(new Set(parsed.eventWinnerIds ?? []));

  // Veraltete Pokal-Zeilen entfernen (User, die nicht mehr gewonnen haben)
  await prisma.pokal.deleteMany({
    where: {
      eventId: event.id,
      isSeries: false,
      ...(winnerIds.length ? { userId: { notIn: winnerIds } } : {}),
    },
  });

  if (!winnerIds.length) return;

  for (const userId of winnerIds) {
    const existing = await prisma.pokal.findFirst({ where: { userId, eventId: event.id, isSeries: false } });
    if (existing) {
      await prisma.pokal.update({
        where: { id: existing.id },
        data: { title: event.title, category: event.category },
      });
    } else {
      await prisma.pokal.create({
        data: {
          userId,
          title: event.title,
          category: event.category,
          isSeries: false,
          eventId: event.id,
        },
      });
    }
  }
}

/**
 * Vergibt (bzw. aktualisiert) digitale Pokale für die Gesamtsieger einer abgeschlossenen
 * Eventreihe. Liest overallWinnerIds aus series.seriesCompletionData. Idempotent, mit
 * identischer Aufräum-Logik wie awardEventPokal.
 */
export async function awardSeriesPokal(seriesId: string): Promise<void> {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: { id: true, name: true, category: true, seriesCompletionData: true },
  });
  if (!series) return;

  let parsed: { overallWinnerIds?: string[] } = {};
  try {
    parsed = series.seriesCompletionData ? JSON.parse(series.seriesCompletionData) : {};
  } catch {
    return;
  }
  const winnerIds = Array.from(new Set(parsed.overallWinnerIds ?? []));

  await prisma.pokal.deleteMany({
    where: {
      seriesId: series.id,
      isSeries: true,
      ...(winnerIds.length ? { userId: { notIn: winnerIds } } : {}),
    },
  });

  if (!winnerIds.length) return;

  for (const userId of winnerIds) {
    const existing = await prisma.pokal.findFirst({ where: { userId, seriesId: series.id, isSeries: true } });
    if (existing) {
      await prisma.pokal.update({
        where: { id: existing.id },
        data: { title: series.name, category: series.category },
      });
    } else {
      await prisma.pokal.create({
        data: {
          userId,
          title: series.name,
          category: series.category,
          isSeries: true,
          seriesId: series.id,
        },
      });
    }
  }
}
