/**
 * GameSwipe-Stapel der Spieleliste — nur serverseitig.
 *
 * Lädt alles, was die Planung braucht (Spiele, Events, Entdecken-Feeds, Drop der Woche, die eigenen
 * Entscheidungen), ordnet mit planDeck (deck-plan.ts, dort steht die Reihenfolge) und reichert die
 * nächsten Karten für die Anzeige an. "Nicht meins" kommt nie wieder (shouldReask).
 */

import { prisma } from "@/lib/prisma";
import type { GameFields } from "./draft";
import {
  discoverKey, planDeck, type DiscoverItem, type DiscoverSource, type GameReason, type PlanInput, type PlannedCard, type WeeklyDrop,
} from "./deck-plan";
import { getDiscoverItems } from "./discover";
import { getWeeklyDrop } from "./drop";
import { matchesGameName } from "./match";
import { IN_WHERE, createGame, gameFieldsOf, recomputeGameAggregates } from "./service";
import { effectiveStatus, type SwipeStatus } from "./swipe";

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
  /** Bisherige Entscheidung (erneute Abfrage nach RECHECK_DAYS oder Hinweis-Karte) */
  myStatus: SwipeStatus | null;
  /** Wer schon am Start ist (öffentlich) */
  inPeople: { id: string; name: string; image: string | null }[];
  nextEvent: { id: string; title: string; startAt: string } | null;
  reason: GameReason;
  /** Teil des Drops der Woche */
  drop: boolean;
  /** Empfehlung (Drop) */
  tip: { by: string | null; note: string | null } | null;
  /** Abo-Schlüssel (GAME_SUBSCRIPTIONS) */
  subscriptions: string[];
  /** Laufende Gratis-Aktion (reason "free") */
  promo: { freeUntil: string | null; store: "epic" | "steam" | null; storeUrl: string | null } | null;
}

export interface DeckDiscoverCard extends Price {
  kind: "discover";
  source: DiscoverSource;
  steamAppId: number | null;
  igdbId: number | null;
  name: string;
  coverUrl: string | null;
  fields: GameFields;
  releaseYear: number | null;
  releaseDate: string | null;
  freeUntil: string | null;
  store: "epic" | "steam" | null;
  storeUrl: string | null;
  subscriptions: string[];
  drop: boolean;
}

export type DeckCard = DeckGameCard | DeckDiscoverCard;

export interface DropInfo {
  week: string;
  endsAt: string;
  total: number;
  /** Davon noch offen für dieses Mitglied */
  open: number;
  /** Angefangene Tage bis zum Ende (1 = endet heute) */
  daysLeft: number;
}

export interface SwipeDeckData {
  cards: DeckCard[];
  remaining: number;
  drop: DropInfo | null;
}

// ── Laden ───────────────────────────────────────────────────────────────────────

/** Was für alle Mitglieder gleich ist (einmal laden, z.B. für die Benachrichtigungen). */
export async function loadDeckContext(now = new Date()) {
  const until = new Date(now.getTime() + EVENT_WINDOW_DAYS * 24 * 60 * 60_000);
  const [games, events, discover, drop] = await Promise.all([
    prisma.game.findMany({ where: { status: "APPROVED" } }),
    prisma.event.findMany({
      where: { game: { not: null }, hidden: false, startAt: { gte: now, lte: until } },
      select: { id: true, title: true, game: true, startAt: true },
      orderBy: { startAt: "asc" },
    }),
    getDiscoverItems(),
    getWeeklyDrop(),
  ]);
  const eventOf = new Map<string, (typeof events)[number]>();
  for (const g of games) {
    const ev = events.find(e => matchesGameName(g, e.game, true));
    if (ev) eventOf.set(g.id, ev);
  }
  return { now, games, eventOf, discover, drop };
}
export type DeckContext = Awaited<ReturnType<typeof loadDeckContext>>;

export interface DeckUserData {
  reactions: PlanInput["reactions"];
  steamSwiped: Set<number>;
  igdbSwiped: Set<number>;
  squadIn?: Set<string>;
}

async function loadUserData(userId: string): Promise<DeckUserData & { ratings: Map<string, number | null> }> {
  const [reactions, steamSwipes, igdbSwipes, squadIn] = await Promise.all([
    prisma.gameReaction.findMany({ where: { userId } }),
    prisma.steamSwipe.findMany({ where: { userId }, select: { steamAppId: true } }),
    prisma.igdbSwipe.findMany({ where: { userId }, select: { igdbId: true } }),
    squadInGameIds(userId),
  ]);
  return {
    reactions,
    steamSwiped: new Set(steamSwipes.map(s => s.steamAppId)),
    igdbSwiped: new Set(igdbSwipes.map(s => s.igdbId)),
    squadIn,
    ratings: new Map(reactions.map(r => [r.gameId, r.rating])),
  };
}

/** Spiele, bei denen jemand aus den eigenen Squads am Start ist. */
async function squadInGameIds(userId: string): Promise<Set<string>> {
  const memberships = await prisma.squadMembership.findMany({
    where: { userId, squad: { hidden: false } },
    select: { squad: { select: { memberships: { select: { userId: true } } } } },
  });
  const mates = [...new Set(memberships.flatMap(m => m.squad.memberships.map(x => x.userId)))].filter(id => id !== userId);
  if (mates.length === 0) return new Set();
  const rows = await prisma.gameReaction.findMany({
    where: { userId: { in: mates }, ...IN_WHERE },
    select: { gameId: true },
    distinct: ["gameId"],
  });
  return new Set(rows.map(r => r.gameId));
}

export function planFor(ctx: DeckContext, user: DeckUserData): PlannedCard[] {
  return planDeck({
    now: ctx.now,
    games: ctx.games,
    nextEventAt: new Map([...ctx.eventOf].map(([id, e]) => [id, e.startAt])),
    squadIn: user.squadIn,
    discover: ctx.discover,
    drop: ctx.drop,
    reactions: user.reactions,
    steamSwiped: user.steamSwiped,
    igdbSwiped: user.igdbSwiped,
  });
}

export function dropInfoOf(drop: WeeklyDrop | null, plan: PlannedCard[], now = new Date()): DropInfo | null {
  if (!drop || new Date(drop.endsAt) <= now || drop.items.length === 0) return null;
  const daysLeft = Math.max(1, Math.ceil((new Date(drop.endsAt).getTime() - now.getTime()) / 86_400_000));
  return { week: drop.week, endsAt: drop.endsAt, total: drop.items.length, open: plan.filter(c => c.drop).length, daysLeft };
}

// ── Stapel ──────────────────────────────────────────────────────────────────────

/** Stapel für ein Mitglied: die nächsten `limit` Karten, wie viele insgesamt offen sind und der Drop. */
export async function buildSwipeDeck(userId: string, limit = 20): Promise<SwipeDeckData> {
  const [ctx, user] = await Promise.all([loadDeckContext(), loadUserData(userId)]);
  const plan = planFor(ctx, user);
  const page = plan.slice(0, limit);
  const gameById = new Map(ctx.games.map(g => [g.id, g]));
  const mine = new Map(user.reactions.map(r => [r.gameId, r]));

  // Wer ist bei den Spielen dieser Seite schon am Start?
  const pageGameIds = page.filter(c => c.kind === "game").map(c => (c as { gameId: string }).gameId);
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

  const cards: DeckCard[] = [];
  for (const c of page) {
    if (c.kind === "game") {
      const g = gameById.get(c.gameId);
      if (!g) continue;
      const ev = ctx.eventOf.get(g.id);
      cards.push({
        kind: "game",
        id: g.id, slug: g.slug, name: g.name, coverUrl: g.coverUrl, fields: gameFieldsOf(g),
        ratingSum: g.ratingSum, ratingCount: g.ratingCount, inCount: g.inCount, wishCount: g.wishCount,
        myRating: user.ratings.get(g.id) ?? null, myStatus: effectiveStatus(mine.get(g.id)), inPeople: peopleOf(g.id),
        nextEvent: ev ? { id: ev.id, title: ev.title, startAt: ev.startAt.toISOString() } : null,
        reason: c.reason, drop: c.drop, tip: c.tip, subscriptions: g.subscriptions,
        promo: c.promo ? { freeUntil: c.promo.freeUntil, store: c.promo.store, storeUrl: c.promo.storeUrl } : null,
        priceCents: g.priceCents, priceInitialCents: g.priceInitialCents, discountPercent: g.discountPercent, priceCurrency: g.priceCurrency,
      });
    } else {
      cards.push(discoverCard(c.item, c.drop));
    }
  }
  return { cards, remaining: plan.length, drop: dropInfoOf(ctx.drop, plan, ctx.now) };
}

function discoverCard(item: DiscoverItem, drop: boolean): DeckDiscoverCard {
  return {
    kind: "discover", source: item.source, steamAppId: item.steamAppId, igdbId: item.igdbId, name: item.name, coverUrl: item.coverUrl,
    releaseYear: item.releaseYear, releaseDate: item.releaseDate, freeUntil: item.freeUntil, store: item.store, storeUrl: item.storeUrl,
    subscriptions: item.subscriptions, drop,
    fields: {
      description: item.description, genres: item.genres, tags: [], modes: item.modes, platforms: item.platforms,
      crossplay: item.crossplay, isFree: item.isFree, minPlayers: item.minPlayers, maxPlayers: item.maxPlayers,
      sessionLength: item.sessionLength,
    },
    priceCents: item.priceCents, priceInitialCents: item.priceInitialCents, discountPercent: item.discountPercent, priceCurrency: item.priceCurrency,
  };
}

/** Offene Karten und Drop-Stand eines Mitglieds (Hinweis auf Home) — ohne Karten-Details. */
export async function getSwipeSummary(userId: string): Promise<{ open: number; drop: DropInfo | null }> {
  const [ctx, user] = await Promise.all([loadDeckContext(), loadUserData(userId)]);
  const plan = planFor(ctx, user);
  return { open: plan.length, drop: dropInfoOf(ctx.drop, plan, ctx.now) };
}

/** GameSwipe angeschaut — Grundlage für "neue Karten seit dem letzten Besuch" (swipe-notify.ts). */
export async function markSwipeSeen(userId: string): Promise<void> {
  const now = new Date();
  await prisma.gameSwipeState.upsert({ where: { userId }, create: { userId, seenAt: now }, update: { seenAt: now } }).catch(() => {});
}

// ── Aufnehmen ───────────────────────────────────────────────────────────────────

/** Entdecken-Karte zu einer Steam-/IGDB-ID (aktuelle Feeds und Drop) */
async function findDiscoverItem(ids: { steamAppId: number | null; igdbId: number | null }): Promise<DiscoverItem | null> {
  const key = discoverKey(ids);
  const [items, drop] = await Promise.all([getDiscoverItems(), getWeeklyDrop()]);
  const dropItems = (drop?.items ?? []).flatMap(d => (d.kind === "discover" ? [d.item] : []));
  return [...items, ...dropItems].find(i => discoverKey(i) === key || (ids.igdbId && i.igdbId === ids.igdbId)) ?? null;
}

/**
 * "Am Start" bei einer Entdecken-Karte: Spiel in die Spieleliste aufnehmen (oder das schon vorhandene
 * nehmen). Frühere "Würde ich holen"/"Nicht meins"-Entscheidungen anderer zu diesem Spiel (SteamSwipe,
 * IgdbSwipe) werden dabei als Reaktionen übernommen. Karten aus den Feeds zählen nicht gegen das
 * Tageslimit fürs Hinzufügen; unbekannte IDs schon.
 */
export async function adoptCandidate(
  userId: string, ids: { steamAppId: number | null; igdbId: number | null },
): Promise<{ ok: true; gameId: string; slug: string } | { ok: false; status: number; error: string }> {
  const existing = await findListGame(ids);
  let gameId = existing?.id ?? null;
  let slug = existing?.slug ?? null;
  if (!existing) {
    // Angaben aus dem Feed mitgeben (wie beim Hinzufügen über das Formular) — createGame holt von
    // Steam/IGDB selbst nur Name, Cover und Preis.
    const item = await findDiscoverItem(ids);
    const fields = item
      ? {
          description: item.description, genres: item.genres, modes: item.modes, platforms: item.platforms,
          crossplay: item.crossplay, isFree: item.isFree, minPlayers: item.minPlayers, maxPlayers: item.maxPlayers,
          sessionLength: item.sessionLength,
        }
      : undefined;
    const created = await createGame(
      { id: userId, isModerator: false },
      { steamAppId: ids.steamAppId ?? item?.steamAppId ?? undefined, igdbId: ids.igdbId ?? item?.igdbId ?? undefined, fields },
      { skipDailyLimit: !!item },
    );
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

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { steamAppId: true, igdbId: true } });
  const steamAppId = game?.steamAppId ?? ids.steamAppId;
  const igdbId = game?.igdbId ?? ids.igdbId;
  const [steamPending, igdbPending] = await Promise.all([
    steamAppId ? prisma.steamSwipe.findMany({ where: { steamAppId } }) : [],
    igdbId ? prisma.igdbSwipe.findMany({ where: { igdbId } }) : [],
  ]);
  const pending = new Map<string, { status: string; createdAt: Date }>();
  for (const p of [...steamPending, ...igdbPending]) if (!pending.has(p.userId)) pending.set(p.userId, p);
  if (pending.size > 0) {
    await prisma.$transaction([
      ...[...pending].map(([uid, p]) =>
        prisma.gameReaction.upsert({
          where: { userId_gameId: { userId: uid, gameId: gameId! } },
          create: { userId: uid, gameId: gameId!, status: p.status, decidedAt: p.createdAt, firstDecidedAt: p.createdAt },
          update: {},
        }),
      ),
      ...(steamAppId ? [prisma.steamSwipe.deleteMany({ where: { steamAppId } })] : []),
      ...(igdbId ? [prisma.igdbSwipe.deleteMany({ where: { igdbId } })] : []),
    ]);
    await recomputeGameAggregates([gameId]);
  }
  return { ok: true, gameId, slug };
}

/** Listen-Spiel zu einer Steam- oder IGDB-ID */
export async function findListGame(ids: { steamAppId: number | null; igdbId: number | null }) {
  const or = [
    ...(ids.steamAppId ? [{ steamAppId: ids.steamAppId }] : []),
    ...(ids.igdbId ? [{ igdbId: ids.igdbId }] : []),
  ];
  if (or.length === 0) return null;
  return prisma.game.findFirst({ where: { OR: or }, select: { id: true, slug: true, status: true } });
}
