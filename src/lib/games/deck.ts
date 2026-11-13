/**
 * Swipe-Stapel der Spieleliste — nur serverseitig.
 *
 * Reihenfolge der eigenen Karten: Spiele mit einem Event in den nächsten 30 Tagen (nächstes zuerst),
 * dann beliebte (am Start, Wunschliste, Bewertungen), dann neue, zuletzt Spiele, deren Entscheidung älter
 * als RECHECK_DAYS ist. Dazwischen jede STEAM_EVERY-te Karte ein Steam-Trend, der noch nicht in der Liste
 * steht (steam-trends.ts). "Nicht meins" kommt nie wieder (shouldReask).
 */

import { prisma } from "@/lib/prisma";
import type { GameFields } from "./draft";
import { matchesGameName } from "./match";
import { IN_WHERE, createGame, gameFieldsOf, recomputeGameAggregates } from "./service";
import { getSteamTrends, type SteamTrendKind } from "./steam-trends";
import { effectiveStatus, interleaveDeck, shouldReask, type SwipeStatus } from "./swipe";

const EVENT_WINDOW_DAYS = 30;
const PEOPLE_PER_CARD = 6;

interface Price {
  priceCents: number | null;
  priceInitialCents: number | null;
  discountPercent: number;
  priceCurrency: string | null;
}

export interface DeckGameCard extends Price {
  kind: "game";
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  fields: GameFields;
  ratingSum: number;
  ratingCount: number;
  inCount: number;
  wishCount: number;
  myRating: number | null;
  /** Bisherige Entscheidung (nur bei erneuter Abfrage nach RECHECK_DAYS) */
  myStatus: SwipeStatus | null;
  /** Wer schon am Start ist (öffentlich) */
  inPeople: { id: string; name: string; image: string | null }[];
  nextEvent: { id: string; title: string; startAt: string } | null;
  reason: "event" | "popular" | "new" | "recheck";
}

export interface DeckSteamCard extends Price {
  kind: "steam";
  steamAppId: number;
  name: string;
  coverUrl: string | null;
  fields: GameFields;
  releaseYear: number | null;
  trend: SteamTrendKind;
}

export type DeckCard = DeckGameCard | DeckSteamCard;

/** Stapel für ein Mitglied: die nächsten `limit` Karten und wie viele insgesamt offen sind. */
export async function buildSwipeDeck(userId: string, limit = 20): Promise<{ cards: DeckCard[]; remaining: number }> {
  const now = new Date();
  const until = new Date(now.getTime() + EVENT_WINDOW_DAYS * 24 * 60 * 60_000);
  const [games, reactions, events, trends, steamSwipes] = await Promise.all([
    prisma.game.findMany({ where: { status: "APPROVED" } }),
    prisma.gameReaction.findMany({ where: { userId } }),
    prisma.event.findMany({
      where: { game: { not: null }, hidden: false, startAt: { gte: now, lte: until } },
      select: { id: true, title: true, game: true, startAt: true },
      orderBy: { startAt: "asc" },
    }),
    getSteamTrends(),
    prisma.steamSwipe.findMany({ where: { userId }, select: { steamAppId: true } }),
  ]);
  const mine = new Map(reactions.map(r => [r.gameId, r]));

  const open = games.filter(g => {
    const r = mine.get(g.id);
    return shouldReask(effectiveStatus(r), r?.decidedAt ?? null, now);
  });
  const nextEventOf = (g: (typeof games)[number]) => events.find(e => matchesGameName(g, e.game, true)) ?? null;
  const popularity = (g: (typeof games)[number]) => g.inCount * 2 + g.wishCount + g.ratingCount;

  const withEvent: typeof open = [];
  const popular: typeof open = [];
  const fresh: typeof open = [];
  const recheck: typeof open = [];
  for (const g of open) {
    if (effectiveStatus(mine.get(g.id)) !== null) recheck.push(g);
    else if (nextEventOf(g)) withEvent.push(g);
    else if (popularity(g) > 0) popular.push(g);
    else fresh.push(g);
  }
  withEvent.sort((a, b) => nextEventOf(a)!.startAt.getTime() - nextEventOf(b)!.startAt.getTime());
  popular.sort((a, b) => popularity(b) - popularity(a));
  fresh.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const reasonOf = new Map<string, DeckGameCard["reason"]>([
    ...withEvent.map(g => [g.id, "event"] as const),
    ...popular.map(g => [g.id, "popular"] as const),
    ...fresh.map(g => [g.id, "new"] as const),
    ...recheck.map(g => [g.id, "recheck"] as const),
  ]);
  const own = [...withEvent, ...popular, ...fresh, ...recheck];

  const knownApps = new Set(games.map(g => g.steamAppId).filter((id): id is number => id !== null));
  const swiped = new Set(steamSwipes.map(s => s.steamAppId));
  const openTrends = trends.filter(t => !knownApps.has(t.steamAppId) && !swiped.has(t.steamAppId));
  // "Gerade angesagt" und "Neu & angesagt" abwechselnd, damit beide Sorten früh auftauchen
  const steam = interleaveDeck(openTrends.filter(t => t.trend === "top"), openTrends.filter(t => t.trend === "new"), 2);

  const deck = interleaveDeck(own, steam);
  const page = deck.slice(0, limit);

  // Wer ist bei den Spielen dieser Seite schon am Start?
  const pageGameIds = page.filter((c): c is (typeof games)[number] => "slug" in c).map(g => g.id);
  const inRows = pageGameIds.length
    ? await prisma.gameReaction.findMany({
        where: { gameId: { in: pageGameIds }, ...IN_WHERE, userId: { not: userId }, user: { deletedAt: null } },
        orderBy: { updatedAt: "desc" },
        select: { gameId: true, user: { select: { id: true, name: true, username: true, image: true } } },
      })
    : [];
  const peopleOf = (gameId: string) =>
    inRows
      .filter(r => r.gameId === gameId)
      .slice(0, PEOPLE_PER_CARD)
      .map(r => ({ id: r.user.id, name: r.user.username ?? r.user.name ?? "Mitglied", image: r.user.image }));

  const cards: DeckCard[] = page.map(c => {
    if ("slug" in c) {
      const r = mine.get(c.id);
      const ev = nextEventOf(c);
      return {
        kind: "game",
        id: c.id, slug: c.slug, name: c.name, coverUrl: c.coverUrl, fields: gameFieldsOf(c),
        ratingSum: c.ratingSum, ratingCount: c.ratingCount, inCount: c.inCount, wishCount: c.wishCount,
        myRating: r?.rating ?? null, myStatus: effectiveStatus(r), inPeople: peopleOf(c.id),
        nextEvent: ev ? { id: ev.id, title: ev.title, startAt: ev.startAt.toISOString() } : null,
        reason: reasonOf.get(c.id) ?? "new",
        priceCents: c.priceCents, priceInitialCents: c.priceInitialCents, discountPercent: c.discountPercent, priceCurrency: c.priceCurrency,
      };
    }
    const { steamAppId, trend, name, coverUrl, releaseYear, priceCents, priceInitialCents, discountPercent, priceCurrency, ...rest } = c;
    return {
      kind: "steam", steamAppId, trend, name, coverUrl, releaseYear,
      fields: { ...rest, tags: [] },
      priceCents, priceInitialCents, discountPercent, priceCurrency,
    };
  });
  return { cards, remaining: deck.length };
}

/** Wie viele Karten auf ein Mitglied warten (für den Hinweis auf Home) — ohne Karten-Details. */
export async function countSwipeDeck(userId: string): Promise<number> {
  const now = new Date();
  const [games, reactions, trends, steamSwipes] = await Promise.all([
    prisma.game.findMany({ where: { status: "APPROVED" }, select: { id: true, steamAppId: true } }),
    prisma.gameReaction.findMany({ where: { userId }, select: { gameId: true, status: true, owns: true, wantPlay: true, decidedAt: true } }),
    getSteamTrends(),
    prisma.steamSwipe.findMany({ where: { userId }, select: { steamAppId: true } }),
  ]);
  const mine = new Map(reactions.map(r => [r.gameId, r]));
  const own = games.filter(g => shouldReask(effectiveStatus(mine.get(g.id)), mine.get(g.id)?.decidedAt ?? null, now)).length;
  const knownApps = new Set(games.map(g => g.steamAppId).filter((id): id is number => id !== null));
  const swiped = new Set(steamSwipes.map(s => s.steamAppId));
  return own + trends.filter(t => !knownApps.has(t.steamAppId) && !swiped.has(t.steamAppId)).length;
}

/**
 * "Am Start" bei einem Steam-Trend: Spiel in die Spieleliste aufnehmen (oder das schon vorhandene nehmen).
 * Frühere "Würde ich holen"/"Nicht meins"-Entscheidungen anderer zu diesem Spiel (SteamSwipe) werden dabei
 * als Reaktionen übernommen.
 */
export async function adoptSteamGame(userId: string, steamAppId: number): Promise<{ ok: true; gameId: string; slug: string } | { ok: false; status: number; error: string }> {
  const existing = await prisma.game.findFirst({ where: { steamAppId }, select: { id: true, slug: true, status: true } });
  let gameId = existing?.id ?? null;
  let slug = existing?.slug ?? null;
  if (!existing) {
    // Angaben aus der Trendliste mitgeben (wie beim Hinzufügen über das Formular) — createGame holt von
    // Steam selbst nur Name, Cover und Preis.
    const trend = (await getSteamTrends()).find(t => t.steamAppId === steamAppId);
    const fields = trend
      ? {
          description: trend.description, genres: trend.genres, modes: trend.modes, platforms: trend.platforms,
          crossplay: trend.crossplay, isFree: trend.isFree, minPlayers: trend.minPlayers, maxPlayers: trend.maxPlayers,
          sessionLength: trend.sessionLength,
        }
      : undefined;
    const created = await createGame({ id: userId, isModerator: false }, { steamAppId, fields }, { skipDailyLimit: true });
    if (!created.ok) {
      // Gleichzeitig von jemand anderem aufgenommen? Dann das vorhandene Spiel nehmen.
      if (created.status !== 409 || !created.slug) return { ok: false, status: created.status, error: created.error };
    }
    slug = created.ok ? created.slug : created.slug!;
    gameId = (await prisma.game.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  } else if (existing.status !== "APPROVED") {
    return { ok: false, status: 409, error: "Das Spiel ist in der Spieleliste ausgeblendet." };
  }
  if (!gameId || !slug) return { ok: false, status: 500, error: "Spiel konnte nicht aufgenommen werden." };

  const pending = await prisma.steamSwipe.findMany({ where: { steamAppId } });
  if (pending.length > 0) {
    await prisma.$transaction([
      ...pending.map(p =>
        prisma.gameReaction.upsert({
          where: { userId_gameId: { userId: p.userId, gameId: gameId! } },
          create: { userId: p.userId, gameId: gameId!, status: p.status, decidedAt: p.createdAt, firstDecidedAt: p.createdAt },
          update: {},
        }),
      ),
      prisma.steamSwipe.deleteMany({ where: { steamAppId } }),
    ]);
    await recomputeGameAggregates([gameId]);
  }
  return { ok: true, gameId, slug };
}
