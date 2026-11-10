/**
 * Spieleliste (/spiele) — Datenbank-Logik (nur serverseitig).
 *
 * Status: APPROVED (sichtbar), PENDING (wartet auf Freischaltung — Freitext-Einträge ohne
 * Steam-Treffer), HIDDEN (vom Team ausgeblendet).
 */

import { Prisma, type Game } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseFavoriteGames, type FavoriteGame } from "@/lib/favorite-games";
import { sameGame } from "@/lib/game-match";
import {
  EDITABLE_FIELDS, cleanGameName, computeFieldSources, mergeSteamFields, parseFieldSources, sanitizeGameFields,
  type FieldSources, type GameFields,
} from "./draft";
import type { GameListItem } from "./filter";
import type { GameGenre, GameMode, GamePlatform, GameStatus, GameTag, SessionLength } from "./options";
import { gameNameKey, uniqueGameSlug } from "./slug";
import { fetchSteamGameDraft, searchSteamGames } from "./steam";

/** Wie viele Spiele ein normales Mitglied pro 24 h hinzufügen darf */
export const DAILY_ADD_LIMIT = 10;

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string; slug?: string };

// ── Hilfen ───────────────────────────────────────────────────────────────────

export function gameFieldsOf(game: Game): GameFields {
  return {
    description:   game.description,
    genres:        game.genres as GameGenre[],
    tags:          game.tags as GameTag[],
    modes:         game.modes as GameMode[],
    platforms:     game.platforms as GamePlatform[],
    crossplay:     game.crossplay,
    isFree:        game.isFree,
    minPlayers:    game.minPlayers,
    maxPlayers:    game.maxPlayers,
    sessionLength: game.sessionLength as SessionLength | null,
  };
}

const sourcesJson = (s: FieldSources) => s as Prisma.InputJsonObject;

async function takenSlugs(): Promise<Set<string>> {
  const rows = await prisma.game.findMany({ select: { slug: true } });
  return new Set(rows.map(r => r.slug));
}

/** Bestehendes Spiel mit derselben Steam-ID bzw. demselben normalisierten Namen */
export async function findDuplicate(steamAppId: number | null, name: string) {
  const or: Prisma.GameWhereInput[] = [{ nameKey: gameNameKey(name) }];
  if (steamAppId) or.push({ steamAppId });
  return prisma.game.findFirst({ where: { OR: or }, select: { id: true, slug: true, name: true, status: true } });
}

// ── "Zockt gerade" (Profil-Lieblingsspiele) ──────────────────────────────────

interface FavoriteHolder { id: string; name: string; image: string | null; rankPoints: number; games: FavoriteGame[] }

export async function loadFavoriteHolders(): Promise<FavoriteHolder[]> {
  const users = await prisma.user.findMany({
    where:  { favoriteGamesJson: { not: null }, deletedAt: null },
    select: { id: true, name: true, username: true, image: true, rankPoints: true, favoriteGamesJson: true },
  });
  return users.map(u => ({
    id: u.id, name: u.username ?? u.name ?? "Unbekannt", image: u.image, rankPoints: u.rankPoints,
    games: parseFavoriteGames(u.favoriteGamesJson),
  }));
}

export function favoriteMatchesGame(fav: FavoriteGame, game: Pick<Game, "steamAppId" | "nameKey">): boolean {
  if (fav.appId !== null && game.steamAppId !== null) return fav.appId === game.steamAppId;
  return gameNameKey(fav.name) === game.nameKey;
}

// ── Liste ────────────────────────────────────────────────────────────────────

export async function listApprovedGames(userId: string | undefined): Promise<GameListItem[]> {
  const [games, reactions, holders] = await Promise.all([
    prisma.game.findMany({ where: { status: "APPROVED" } }),
    userId ? prisma.gameReaction.findMany({ where: { userId } }) : Promise.resolve([]),
    loadFavoriteHolders(),
  ]);
  const mine = new Map(reactions.map(r => [r.gameId, r]));

  return games.map(g => {
    const my = mine.get(g.id);
    return {
      id: g.id, slug: g.slug, name: g.name, coverUrl: g.coverUrl,
      ...pickListFields(gameFieldsOf(g)),
      ratingSum: g.ratingSum, ratingCount: g.ratingCount, wantCount: g.wantCount,
      playingCount: holders.filter(h => h.games.some(f => favoriteMatchesGame(f, g))).length,
      createdAt: g.createdAt.toISOString(),
      myRating: my?.rating ?? null,
      myWant: my?.wantPlay ?? false,
    };
  });
}

function pickListFields(f: GameFields): Omit<GameFields, "description"> {
  return {
    genres: f.genres, tags: f.tags, modes: f.modes, platforms: f.platforms, crossplay: f.crossplay,
    isFree: f.isFree, minPlayers: f.minPlayers, maxPlayers: f.maxPlayers, sessionLength: f.sessionLength,
  };
}

// ── Detail ───────────────────────────────────────────────────────────────────

export async function getGameDetail(slug: string, userId: string | undefined) {
  const game = await prisma.game.findUnique({
    where: { slug },
    include: { addedBy: { select: { id: true, name: true, username: true } } },
  });
  if (!game) return null;

  const [myReaction, distributionRows, holders, events, servers] = await Promise.all([
    userId ? prisma.gameReaction.findUnique({ where: { userId_gameId: { userId, gameId: game.id } } }) : null,
    prisma.gameReaction.groupBy({ by: ["rating"], where: { gameId: game.id, rating: { not: null } }, _count: { _all: true } }),
    loadFavoriteHolders(),
    prisma.event.findMany({
      where:   { game: { not: null }, hidden: false },
      select:  { id: true, title: true, game: true, startAt: true, status: true },
      orderBy: { startAt: "desc" },
    }),
    prisma.gameServer.findMany({ select: { id: true, name: true, game: true, isOnline: true } }),
  ]);

  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: distributionRows.find(r => r.rating === stars)?._count._all ?? 0,
  }));

  const players = holders
    .filter(h => h.games.some(f => favoriteMatchesGame(f, game)))
    .sort((a, b) => b.rankPoints - a.rankPoints || a.name.localeCompare(b.name, "de"))
    .map(p => ({ id: p.id, name: p.name, image: p.image, rankPoints: p.rankPoints }));

  const matchingEvents = events.filter(e => e.game && sameGame(e.game, game.name));

  return {
    game,
    fields: gameFieldsOf(game),
    fieldSources: parseFieldSources(game.fieldSources),
    myReaction: myReaction ? { rating: myReaction.rating, wantPlay: myReaction.wantPlay } : { rating: null, wantPlay: false },
    distribution,
    players,
    events: matchingEvents.slice(0, 6).map(e => ({ id: e.id, title: e.title, startAt: e.startAt, status: e.status })),
    eventCount: matchingEvents.length,
    servers: servers.filter(s => sameGame(s.game, game.name)),
  };
}

/** Für Links aus Profil/Events: Spiel zu Steam-ID oder Name finden (nur sichtbare). */
export async function findGameSlug(name: string | null, appId: number | null): Promise<string | null> {
  if (appId) {
    const byId = await prisma.game.findFirst({ where: { steamAppId: appId, status: "APPROVED" }, select: { slug: true } });
    if (byId) return byId.slug;
  }
  if (!name) return null;
  const byKey = await prisma.game.findFirst({ where: { nameKey: gameNameKey(name), status: "APPROVED" }, select: { slug: true } });
  return byKey?.slug ?? null;
}

// ── Suche beim Hinzufügen ────────────────────────────────────────────────────

export interface LookupResult {
  local: { slug: string; name: string; coverUrl: string | null; status: string }[];
  steam: { appId: number; name: string; thumbUrl: string; existingSlug: string | null }[];
  steamError: boolean;
}

export async function lookupGames(q: string): Promise<LookupResult> {
  const key = gameNameKey(q);
  const [all, steamResult] = await Promise.all([
    prisma.game.findMany({
      where:  { status: { not: "HIDDEN" } },
      select: { slug: true, name: true, nameKey: true, coverUrl: true, status: true, steamAppId: true },
    }),
    searchSteamGames(q, { resolveCovers: false }).then(r => ({ ok: true as const, r }), () => ({ ok: false as const, r: [] })),
  ]);
  const byAppId = new Map(all.filter(g => g.steamAppId).map(g => [g.steamAppId!, g.slug]));

  const local = key
    ? all.filter(g => g.nameKey.includes(key))
        .sort((a, b) => Number(b.nameKey === key) - Number(a.nameKey === key) || a.name.length - b.name.length)
        .slice(0, 5)
        .map(({ slug, name, coverUrl, status }) => ({ slug, name, coverUrl, status }))
    : [];

  return {
    local,
    steam: steamResult.r.map(s => ({ appId: s.appId, name: s.name, thumbUrl: s.thumbUrl, existingSlug: byAppId.get(s.appId) ?? null })),
    steamError: !steamResult.ok,
  };
}

// ── Anlegen ──────────────────────────────────────────────────────────────────

export async function createGame(
  user: { id: string; isModerator: boolean },
  input: { steamAppId?: unknown; name?: unknown; fields?: unknown },
): Promise<Result<{ slug: string; status: GameStatus }>> {
  const steamAppId = typeof input.steamAppId === "number" && Number.isInteger(input.steamAppId) && input.steamAppId > 0
    ? input.steamAppId : null;
  const fields = sanitizeGameFields(input.fields);
  let name = cleanGameName(input.name);

  if (!user.isModerator) {
    const recent = await prisma.game.count({
      where: { addedById: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
    });
    if (recent >= DAILY_ADD_LIMIT) {
      return { ok: false, status: 429, error: `Du kannst höchstens ${DAILY_ADD_LIMIT} Spiele pro Tag hinzufügen.` };
    }
  }

  // Steam-Daten serverseitig neu holen — Cover und Name nie vom Client übernehmen
  let steam: Awaited<ReturnType<typeof fetchSteamGameDraft>> = null;
  let steamReached = false;
  if (steamAppId) {
    try {
      steam = await fetchSteamGameDraft(steamAppId);
      steamReached = true;
    } catch (err) {
      console.error("[games] Steam nicht erreichbar", err);
    }
    if (steamReached && !steam) return { ok: false, status: 400, error: "Steam kennt dieses Spiel nicht." };
    if (steam) name = steam.name;
  }
  if (!name) return { ok: false, status: 400, error: "Bitte gib einen Spielnamen an." };

  const dup = await findDuplicate(steamAppId, name);
  if (dup) return { ok: false, status: 409, error: `„${dup.name}“ ist schon in der Spieleliste.`, slug: dup.slug };

  // Ohne Steam-Treffer (Freitext) prüft das Team erst; Moderatoren schalten direkt frei
  const status: GameStatus = user.isModerator || steamAppId ? "APPROVED" : "PENDING";
  const taken = await takenSlugs();

  try {
    const game = await prisma.game.create({
      data: {
        slug: uniqueGameSlug(name, s => taken.has(s)),
        nameKey: gameNameKey(name),
        name,
        steamAppId,
        coverUrl: steam?.coverUrl ?? null,
        releaseYear: steam?.releaseYear ?? null,
        ...fields,
        fieldSources: sourcesJson(computeFieldSources(fields, steam)),
        enrichedAt: steam ? new Date() : null,
        status,
        addedById: user.id,
      },
      select: { slug: true, status: true },
    });
    return { ok: true, slug: game.slug, status: game.status as GameStatus };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await findDuplicate(steamAppId, name);
      return { ok: false, status: 409, error: "Das Spiel wurde gerade schon hinzugefügt.", slug: again?.slug };
    }
    throw err;
  }
}

// ── Bewertung & "Würde ich zocken" ───────────────────────────────────────────

async function recomputeAggregates(tx: Prisma.TransactionClient, gameId: string) {
  const [ratings, wants] = await Promise.all([
    tx.gameReaction.aggregate({ where: { gameId, rating: { not: null } }, _sum: { rating: true }, _count: { rating: true } }),
    tx.gameReaction.count({ where: { gameId, wantPlay: true } }),
  ]);
  return tx.game.update({
    where: { id: gameId },
    data: { ratingSum: ratings._sum.rating ?? 0, ratingCount: ratings._count.rating, wantCount: wants },
    select: { ratingSum: true, ratingCount: true, wantCount: true },
  });
}

/** Schnitte neu berechnen, z.B. nachdem Bewertungen eines gelöschten Kontos entfernt wurden */
export async function recomputeGameAggregates(gameIds: string[]) {
  for (const gameId of new Set(gameIds)) {
    await prisma.$transaction(tx => recomputeAggregates(tx, gameId));
  }
}

export async function setReaction(
  userId: string, slug: string, change: { rating?: number | null; wantPlay?: boolean },
): Promise<Result<{ ratingSum: number; ratingCount: number; wantCount: number; rating: number | null; wantPlay: boolean }>> {
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!game || game.status !== "APPROVED") return { ok: false, status: 404, error: "Spiel nicht gefunden" };

  return prisma.$transaction(async tx => {
    const data: { rating?: number | null; wantPlay?: boolean } = {};
    if (change.rating !== undefined) data.rating = change.rating;
    if (change.wantPlay !== undefined) data.wantPlay = change.wantPlay;

    const reaction = await tx.gameReaction.upsert({
      where:  { userId_gameId: { userId, gameId: game.id } },
      create: { userId, gameId: game.id, rating: data.rating ?? null, wantPlay: data.wantPlay ?? false },
      update: data,
    });
    // Leere Reaktionen nicht aufheben
    if (reaction.rating === null && !reaction.wantPlay) {
      await tx.gameReaction.delete({ where: { userId_gameId: { userId, gameId: game.id } } });
    }
    const agg = await recomputeAggregates(tx, game.id);
    return { ok: true as const, ...agg, rating: reaction.rating, wantPlay: reaction.wantPlay };
  });
}

// ── Steam-Abgleich ───────────────────────────────────────────────────────────

export type EnrichOutcome = "enriched" | "not_found" | "error";

/**
 * Ergänzt ein Spiel um Steam-Daten. Ohne Steam-ID wird per Namenssuche gesucht — übernommen wird
 * nur ein Treffer mit (fast) gleichem Namen, sonst landete z.B. "Mario Kart" bei einem fremden Spiel.
 * Von Menschen gesetzte Felder bleiben unangetastet.
 */
export async function enrichGame(game: Game): Promise<EnrichOutcome> {
  try {
    let appId = game.steamAppId;
    if (!appId) {
      const hits = await searchSteamGames(game.name, { resolveCovers: false });
      const hit = hits.find(h => gameNameKey(h.name) === game.nameKey) ?? hits.find(h => sameGame(h.name, game.name));
      if (hit) {
        const owner = await prisma.game.findUnique({ where: { steamAppId: hit.appId }, select: { id: true } });
        if (!owner) appId = hit.appId; // gehört schon einem anderen Eintrag → Fall fürs Zusammenführen
      }
    }
    const steam = appId ? await fetchSteamGameDraft(appId) : null;
    if (!steam) {
      await prisma.game.update({ where: { id: game.id }, data: { enrichedAt: new Date() } });
      return "not_found";
    }
    const merged = mergeSteamFields(gameFieldsOf(game), parseFieldSources(game.fieldSources), steam);
    await prisma.game.update({
      where: { id: game.id },
      data: {
        steamAppId: appId,
        coverUrl: steam.coverUrl ?? game.coverUrl,
        releaseYear: steam.releaseYear ?? game.releaseYear,
        ...merged.fields,
        fieldSources: sourcesJson(merged.sources),
        enrichedAt: new Date(),
      },
    });
    return "enriched";
  } catch (err) {
    console.error(`[games] Steam-Abgleich für ${game.name} fehlgeschlagen`, err);
    return "error";
  }
}

/** Nächste Spiele ohne Steam-Abgleich verarbeiten (nacheinander, um Steams Rate-Limit zu schonen). */
export async function enrichPendingGames(limit = 8) {
  const games = await prisma.game.findMany({
    where: { enrichedAt: null, status: { not: "HIDDEN" } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const outcome: Record<EnrichOutcome, number> = { enriched: 0, not_found: 0, error: 0 };
  for (const g of games) outcome[await enrichGame(g)]++;
  const remaining = await prisma.game.count({ where: { enrichedAt: null, status: { not: "HIDDEN" } } });
  return { processed: games.length, ...outcome, remaining };
}

// ── Import aus bestehenden Community-Daten ───────────────────────────────────

/** In-App-Spiele (OMA Gems, OMA Blocks …) gehören nicht in die Spieleliste */
const isInternalGame = (name: string) => /^oma\b/i.test(name.trim());

/**
 * Übernimmt alle Spiele, die schon irgendwo in der App stehen (Events, Liga-Spieltage, Gameserver,
 * Lieblingsspiele, Spiele-Ideen), als freigeschaltete Einträge. Ohne Steam-Abfragen — die
 * Ergänzung läuft danach schrittweise über enrichPendingGames.
 */
export async function importCommunityGames(): Promise<{ created: number; candidates: number }> {
  const [events, spieltage, servers, holders, ideas, existing] = await Promise.all([
    prisma.event.findMany({ where: { game: { not: null } }, select: { game: true }, distinct: ["game"] }),
    prisma.lulSpieltag.findMany({ where: { game: { not: null } }, select: { game: true }, distinct: ["game"] }),
    prisma.gameServer.findMany({ select: { game: true } }),
    loadFavoriteHolders(),
    prisma.communityIdea.findMany({ where: { gameName: { not: null } }, select: { gameName: true, gameAppId: true } }),
    prisma.game.findMany({ select: { slug: true, nameKey: true, steamAppId: true } }),
  ]);

  const candidates: FavoriteGame[] = [
    ...holders.flatMap(h => h.games), // zuerst: haben meist eine Steam-ID
    ...ideas.map(i => ({ name: i.gameName!, appId: i.gameAppId })),
    ...events.map(e => ({ name: e.game!, appId: null })),
    ...spieltage.map(s => ({ name: s.game!, appId: null })),
    ...servers.map(s => ({ name: s.game, appId: null })),
  ];

  const keys = new Set(existing.map(g => g.nameKey));
  const appIds = new Set(existing.flatMap(g => (g.steamAppId ? [g.steamAppId] : [])));
  const slugs = new Set(existing.map(g => g.slug));
  const rows: Prisma.GameCreateManyInput[] = [];

  for (const c of candidates) {
    const name = cleanGameName(c.name);
    if (!name || isInternalGame(name)) continue;
    const key = gameNameKey(name);
    if (!key || keys.has(key) || (c.appId && appIds.has(c.appId))) continue;
    const slug = uniqueGameSlug(name, s => slugs.has(s));
    keys.add(key);
    slugs.add(slug);
    if (c.appId) appIds.add(c.appId);
    rows.push({ slug, nameKey: key, name, steamAppId: c.appId ?? null, status: "APPROVED" });
  }

  const created = rows.length > 0 ? (await prisma.game.createMany({ data: rows, skipDuplicates: true })).count : 0;
  return { created, candidates: candidates.length };
}

// ── Team-Verwaltung ──────────────────────────────────────────────────────────

export async function updateGameAdmin(
  id: string,
  input: { name?: unknown; status?: unknown; steamAppId?: unknown; fields?: unknown },
): Promise<Result<{ slug: string }>> {
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return { ok: false, status: 404, error: "Spiel nicht gefunden" };

  const data: Prisma.GameUpdateInput = {};

  if (input.name !== undefined) {
    const name = cleanGameName(input.name);
    if (!name) return { ok: false, status: 400, error: "Name fehlt" };
    const key = gameNameKey(name);
    if (key !== game.nameKey) {
      const clash = await prisma.game.findUnique({ where: { nameKey: key }, select: { slug: true, name: true } });
      if (clash) return { ok: false, status: 409, error: `„${clash.name}“ gibt es schon — lieber zusammenführen.`, slug: clash.slug };
    }
    data.name = name;
    data.nameKey = key;
  }

  if (input.status !== undefined) {
    if (input.status !== "APPROVED" && input.status !== "PENDING" && input.status !== "HIDDEN") {
      return { ok: false, status: 400, error: "Ungültiger Status" };
    }
    data.status = input.status;
  }

  let steamChanged = false;
  if (input.steamAppId !== undefined) {
    const appId = input.steamAppId === null || input.steamAppId === ""
      ? null
      : Number.isInteger(Number(input.steamAppId)) && Number(input.steamAppId) > 0 ? Number(input.steamAppId) : NaN;
    if (Number.isNaN(appId)) return { ok: false, status: 400, error: "Ungültige Steam-App-ID" };
    if (appId !== game.steamAppId) {
      if (appId) {
        const owner = await prisma.game.findUnique({ where: { steamAppId: appId }, select: { name: true } });
        if (owner) return { ok: false, status: 409, error: `Diese Steam-ID gehört schon zu „${owner.name}“.` };
      }
      data.steamAppId = appId;
      data.coverUrl = null;
      data.enrichedAt = null;
      steamChanged = true;
    }
  }

  if (input.fields !== undefined) {
    const next = sanitizeGameFields(input.fields);
    const current = gameFieldsOf(game);
    const sources = parseFieldSources(game.fieldSources);
    for (const field of EDITABLE_FIELDS) {
      if (JSON.stringify(next[field]) !== JSON.stringify(current[field])) sources[field] = "user";
    }
    Object.assign(data, next, { fieldSources: sourcesJson(sources) });
  }

  const updated = await prisma.game.update({ where: { id }, data });
  if (steamChanged && updated.steamAppId) await enrichGame(updated);
  return { ok: true, slug: updated.slug };
}

/** Dublette auflösen: Bewertungen wandern zum Ziel (bei Doppelbewertung zählt die des Ziels). */
export async function mergeGames(sourceId: string, targetId: string): Promise<Result<{ slug: string }>> {
  if (sourceId === targetId) return { ok: false, status: 400, error: "Quelle und Ziel sind dasselbe Spiel" };
  const [source, target] = await Promise.all([
    prisma.game.findUnique({ where: { id: sourceId } }),
    prisma.game.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) return { ok: false, status: 404, error: "Spiel nicht gefunden" };

  await prisma.$transaction(async tx => {
    const targetUsers = new Set(
      (await tx.gameReaction.findMany({ where: { gameId: targetId }, select: { userId: true } })).map(r => r.userId),
    );
    const sourceReactions = await tx.gameReaction.findMany({ where: { gameId: sourceId } });
    for (const r of sourceReactions) {
      if (targetUsers.has(r.userId)) continue;
      await tx.gameReaction.create({
        data: { userId: r.userId, gameId: targetId, rating: r.rating, wantPlay: r.wantPlay, createdAt: r.createdAt },
      });
    }
    await tx.game.delete({ where: { id: sourceId } });
    if (!target.steamAppId && source.steamAppId) {
      await tx.game.update({ where: { id: targetId }, data: { steamAppId: source.steamAppId, coverUrl: source.coverUrl } });
    }
    await recomputeAggregates(tx, targetId);
  });
  return { ok: true, slug: target.slug };
}

// ── Teaser (Games-Seite, Dashboard) ──────────────────────────────────────────

export interface GameTeaser { slug: string; name: string; coverUrl: string | null; ratingSum: number; ratingCount: number; wantCount: number }

const TEASER_SELECT = { slug: true, name: true, coverUrl: true, ratingSum: true, ratingCount: true, wantCount: true } as const;

/** Beliebteste Spiele (für Cover-Vorschau) + Gesamtzahl */
export async function getGameListTeaser(take = 4): Promise<{ total: number; top: GameTeaser[] }> {
  const [total, top] = await Promise.all([
    prisma.game.count({ where: { status: "APPROVED" } }),
    prisma.game.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ wantCount: "desc" }, { ratingCount: "desc" }, { ratingSum: "desc" }, { createdAt: "desc" }],
      take,
      select: TEASER_SELECT,
    }),
  ]);
  return { total, top };
}

/** Zufällige Spiel-Idee aus den 20 beliebtesten (bevorzugt mit Cover) — für die Dashboard-Kachel */
export async function pickGameIdea(): Promise<GameTeaser | null> {
  const pool = await prisma.game.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ wantCount: "desc" }, { ratingCount: "desc" }, { ratingSum: "desc" }],
    take: 20,
    select: TEASER_SELECT,
  });
  const withCover = pool.filter(g => g.coverUrl);
  const candidates = withCover.length > 0 ? withCover : pool;
  return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}
