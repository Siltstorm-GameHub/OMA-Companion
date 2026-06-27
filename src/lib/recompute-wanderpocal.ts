import { prisma } from "@/lib/prisma";
import { EventCategory, EventGenre } from "@prisma/client";

const ALL_CATEGORIES = Object.values(EventCategory);
const ALL_GENRES = Object.values(EventGenre);

/**
 * Queries all finished events, tallies wins per user per category and genre,
 * then atomically replaces WanderpocalHolder and WanderpocalStat tables.
 * Safe to re-run (idempotent). Call after every event completion.
 */
export async function recomputeWanderpocalHolders(): Promise<void> {
  const events = await prisma.event.findMany({
    where: { status: "finished", completionData: { not: null } },
    select: { category: true, genre: true, completionData: true },
  });

  const catWins: Record<string, Record<string, number>> = {};
  const genreWins: Record<string, Record<string, number>> = {};

  for (const ev of events) {
    let parsed: { eventWinnerIds?: string[] } = {};
    try {
      parsed = JSON.parse(ev.completionData as string);
    } catch {
      continue;
    }
    const winners = parsed.eventWinnerIds;
    if (!winners?.length) continue;

    for (const uid of winners) {
      if (!catWins[ev.category]) catWins[ev.category] = {};
      catWins[ev.category][uid] = (catWins[ev.category][uid] ?? 0) + 1;

      if (ev.genre) {
        if (!genreWins[ev.genre]) genreWins[ev.genre] = {};
        genreWins[ev.genre][uid] = (genreWins[ev.genre][uid] ?? 0) + 1;
      }
    }
  }

  // Build holder rows (only top winners per scope, ties included)
  const holderRows: { userId: string; scopeType: string; scopeValue: string; winCount: number }[] = [];

  function addHolders(scopeType: "category" | "genre", scopeValue: string, winsMap: Record<string, number>) {
    const entries = Object.entries(winsMap);
    if (!entries.length) return;
    const maxWins = Math.max(...entries.map(([, c]) => c));
    for (const [userId, count] of entries) {
      if (count === maxWins) holderRows.push({ userId, scopeType, scopeValue, winCount: count });
    }
  }

  for (const cat of ALL_CATEGORIES) addHolders("category", cat, catWins[cat] ?? {});
  for (const genre of ALL_GENRES) addHolders("genre", genre, genreWins[genre] ?? {});

  // Build stat rows (all users with at least 1 win in any scope)
  const statRows: { userId: string; scopeType: string; scopeValue: string; winCount: number }[] = [];
  for (const [scopeValue, wins] of Object.entries(catWins)) {
    for (const [userId, winCount] of Object.entries(wins)) {
      statRows.push({ userId, scopeType: "category", scopeValue, winCount });
    }
  }
  for (const [scopeValue, wins] of Object.entries(genreWins)) {
    for (const [userId, winCount] of Object.entries(wins)) {
      statRows.push({ userId, scopeType: "genre", scopeValue, winCount });
    }
  }

  await prisma.$transaction([
    prisma.wanderpocalHolder.deleteMany(),
    prisma.wanderpocalHolder.createMany({ data: holderRows }),
    prisma.wanderpocalStat.deleteMany(),
    prisma.wanderpocalStat.createMany({ data: statRows }),
  ]);
}
