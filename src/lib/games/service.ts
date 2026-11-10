/**
 * Spieleliste (/spiele) — Datenbank-Logik (nur serverseitig).
 *
 * Status: APPROVED (sichtbar), PENDING (wartet auf Freischaltung — Freitext-Einträge ohne
 * Steam-/IGDB-Treffer), HIDDEN (vom Team ausgeblendet).
 */

import { Prisma, type Game } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseFavoriteGames, type FavoriteGame } from "@/lib/favorite-games";
import { gameKeys, matchesGameName, sanitizeAliases } from "./match";
import {
  EDITABLE_FIELDS, cleanGameName, computeFieldSources, mergeAutoFields, parseFieldSources, sanitizeGameFields,
  type FieldSources, type GameFields,
} from "./draft";
import { igdbConfigured, searchIgdbGames } from "./igdb";
import { fetchCombinedDraft } from "./sources";
import type { GroupGameInfo } from "./group";
import { DAILY_FILL_LIMIT, FILLABLE_FIELDS, applicableFills, type FillableField } from "./edits";
import type { GameListItem } from "./filter";
import type { GameGenre, GameMode, GamePlatform, GameStatus, GameTag, SessionLength } from "./options";
import { gameNameKey, uniqueGameSlug } from "./slug";
import { searchSteamGames } from "./steam";

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

/** Bestehendes Spiel mit derselben Steam-/IGDB-ID bzw. demselben normalisierten Namen */
export async function findDuplicate(steamAppId: number | null, name: string, igdbId: number | null = null) {
  const or: Prisma.GameWhereInput[] = [];
  if (gameNameKey(name)) or.push({ nameKey: gameNameKey(name) });
  if (steamAppId) or.push({ steamAppId });
  if (igdbId) or.push({ igdbId });
  if (or.length === 0) return null;
  const direct = await prisma.game.findFirst({ where: { OR: or }, select: { id: true, slug: true, name: true, status: true } });
  if (direct) return direct;
  return findByAlias(name);
}

/** Spiel, dessen andere Schreibweisen den Namen enthalten ("CS2" → Counter-Strike 2) */
async function findByAlias(name: string, onlyApproved = false) {
  const key = gameNameKey(name);
  if (!key) return null;
  const withAliases = await prisma.game.findMany({
    where: { aliases: { isEmpty: false }, ...(onlyApproved ? { status: "APPROVED" } : {}) },
    select: { id: true, slug: true, name: true, status: true, aliases: true },
  });
  const hit = withAliases.find(g => g.aliases.some(a => gameNameKey(a) === key));
  return hit ? { id: hit.id, slug: hit.slug, name: hit.name, status: hit.status } : null;
}

/** Steam-/IGDB-ID nur übernehmen, wenn sie keinem anderen Eintrag gehört (Rest: Fall fürs Zusammenführen) */
async function freeIds(gameId: string | null, steamAppId: number | null, igdbId: number | null) {
  const [steamOwner, igdbOwner] = await Promise.all([
    steamAppId ? prisma.game.findUnique({ where: { steamAppId }, select: { id: true } }) : null,
    igdbId ? prisma.game.findFirst({ where: { igdbId }, select: { id: true } }) : null,
  ]);
  return {
    steamAppId: steamOwner && steamOwner.id !== gameId ? null : steamAppId,
    igdbId: igdbOwner && igdbOwner.id !== gameId ? null : igdbId,
  };
}

const positiveInt = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v > 0 && v < 2_000_000_000 ? v : null;

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

export function favoriteMatchesGame(fav: FavoriteGame, game: Pick<Game, "steamAppId" | "nameKey" | "aliases">): boolean {
  if (fav.appId !== null && game.steamAppId !== null) return fav.appId === game.steamAppId;
  return gameKeys(game).includes(gameNameKey(fav.name));
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
      ratingSum: g.ratingSum, ratingCount: g.ratingCount, wantCount: g.wantCount, ownCount: g.ownCount,
      playingCount: holders.filter(h => h.games.some(f => favoriteMatchesGame(f, g))).length,
      createdAt: g.createdAt.toISOString(),
      myRating: my?.rating ?? null,
      myWant: my?.wantPlay ?? false,
      myOwns: my?.owns ?? false,
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

  const matchingEvents = events.filter(e => matchesGameName(game, e.game, true));
  const now = new Date();
  const past = matchingEvents.filter(e => e.startAt <= now);
  const upcoming = matchingEvents.filter(e => e.startAt > now).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const participations = past.length > 0
    ? await prisma.eventRegistration.count({ where: { eventId: { in: past.map(e => e.id) }, role: "player" } })
    : 0;
  const toItem = (e: (typeof events)[number]) => ({ id: e.id, title: e.title, startAt: e.startAt, status: e.status });

  return {
    game,
    fields: gameFieldsOf(game),
    fieldSources: parseFieldSources(game.fieldSources),
    myReaction: myReaction
      ? { rating: myReaction.rating, wantPlay: myReaction.wantPlay, owns: myReaction.owns }
      : { rating: null, wantPlay: false, owns: false },
    distribution,
    players,
    // Kommende zuerst (nächstes oben), dann die letzten vergangenen
    events: [...upcoming.slice(0, 3), ...past.slice(0, 6 - Math.min(upcoming.length, 3))].map(toItem),
    eventCount: matchingEvents.length,
    stats: {
      pastEvents: past.length,
      participations,
      lastPlayedAt: past[0]?.startAt ?? null,
      nextEvent: upcoming[0] ? toItem(upcoming[0]) : null,
    },
    servers: servers.filter(s => matchesGameName(game, s.game, true)),
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
  if (byKey) return byKey.slug;
  return (await findByAlias(name, true))?.slug ?? null;
}

// ── Suche beim Hinzufügen ────────────────────────────────────────────────────

export interface LookupResult {
  local: { slug: string; name: string; coverUrl: string | null; status: string }[];
  steam: { appId: number; name: string; thumbUrl: string; existingSlug: string | null }[];
  /** IGDB-Treffer, die nicht schon unter den Steam-Treffern sind (Konsole, Handy, Launcher-Spiele) */
  igdb: { igdbId: number; name: string; year: number | null; platforms: string[]; thumbUrl: string | null; existingSlug: string | null }[];
  steamError: boolean;
  igdbError: boolean;
}

export async function lookupGames(q: string): Promise<LookupResult> {
  const key = gameNameKey(q);
  const [all, steamResult, igdbResult] = await Promise.all([
    prisma.game.findMany({
      where:  { status: { not: "HIDDEN" } },
      select: { slug: true, name: true, nameKey: true, aliases: true, coverUrl: true, status: true, steamAppId: true, igdbId: true },
    }),
    searchSteamGames(q, { resolveCovers: false }).then(r => ({ ok: true as const, r }), () => ({ ok: false as const, r: [] })),
    igdbConfigured()
      ? searchIgdbGames(q).then(r => ({ ok: true as const, r }), err => { console.error("[games] IGDB-Suche", err); return { ok: false as const, r: [] }; })
      : Promise.resolve({ ok: true as const, r: [] }),
  ]);
  const byAppId = new Map(all.filter(g => g.steamAppId).map(g => [g.steamAppId!, g.slug]));
  const byIgdbId = new Map(all.filter(g => g.igdbId).map(g => [g.igdbId!, g.slug]));
  const steamIds = new Set(steamResult.r.map(s => s.appId));
  const steamKeys = new Set(steamResult.r.map(s => gameNameKey(s.name)));

  const local = key
    ? all.filter(g => gameKeys(g).some(k => k.includes(key)))
        .sort((a, b) => Number(gameKeys(b).includes(key)) - Number(gameKeys(a).includes(key)) || a.name.length - b.name.length)
        .slice(0, 5)
        .map(({ slug, name, coverUrl, status }) => ({ slug, name, coverUrl, status }))
    : [];

  return {
    local,
    steam: steamResult.r.map(s => ({ appId: s.appId, name: s.name, thumbUrl: s.thumbUrl, existingSlug: byAppId.get(s.appId) ?? null })),
    igdb: igdbResult.r
      .filter(h => !(h.steamAppId && steamIds.has(h.steamAppId)) && !steamKeys.has(gameNameKey(h.name)))
      .slice(0, 6)
      .map(h => ({
        igdbId: h.igdbId, name: h.name, year: h.year, platforms: h.platforms, thumbUrl: h.thumbUrl,
        existingSlug: byIgdbId.get(h.igdbId) ?? (h.steamAppId ? byAppId.get(h.steamAppId) : undefined) ?? null,
      })),
    steamError: !steamResult.ok,
    igdbError: !igdbResult.ok,
  };
}

// ── Anlegen ──────────────────────────────────────────────────────────────────

export async function createGame(
  user: { id: string; isModerator: boolean },
  input: { steamAppId?: unknown; igdbId?: unknown; name?: unknown; fields?: unknown },
): Promise<Result<{ slug: string; status: GameStatus }>> {
  let steamAppId = positiveInt(input.steamAppId);
  let igdbId = positiveInt(input.igdbId);
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

  // Automatische Angaben serverseitig neu holen — Cover und Name nie vom Client übernehmen
  let auto: Awaited<ReturnType<typeof fetchCombinedDraft>>["combined"] = null;
  if (steamAppId || igdbId) {
    const res = await fetchCombinedDraft({ steamAppId, igdbId });
    if (!res.combined && !res.allFailed) return { ok: false, status: 400, error: "Zu diesem Treffer gibt es keine Spieldaten." };
    auto = res.combined;
    if (auto) {
      name = auto.draft.name;
      steamAppId = auto.draft.steamAppId ?? steamAppId;
      igdbId = auto.draft.igdbId ?? igdbId;
    }
  }
  if (!name) return { ok: false, status: 400, error: "Bitte gib einen Spielnamen an." };

  const dup = await findDuplicate(steamAppId, name, igdbId);
  if (dup) return { ok: false, status: 409, error: `„${dup.name}“ ist schon in der Spieleliste.`, slug: dup.slug };

  // Ohne Steam-/IGDB-Treffer (Freitext) prüft das Team erst; Moderatoren schalten direkt frei
  const status: GameStatus = user.isModerator || steamAppId || igdbId ? "APPROVED" : "PENDING";
  const taken = await takenSlugs();

  try {
    const game = await prisma.game.create({
      data: {
        slug: uniqueGameSlug(name, s => taken.has(s)),
        nameKey: gameNameKey(name),
        name,
        steamAppId,
        igdbId,
        coverUrl: auto?.draft.coverUrl ?? null,
        releaseYear: auto?.draft.releaseYear ?? null,
        ...fields,
        fieldSources: sourcesJson(computeFieldSources(fields, auto?.draft ?? null, auto?.sources)),
        enrichedAt: auto ? new Date() : null,
        status,
        addedById: user.id,
      },
      select: { slug: true, status: true },
    });
    return { ok: true, slug: game.slug, status: game.status as GameStatus };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await findDuplicate(steamAppId, name, igdbId);
      return { ok: false, status: 409, error: "Das Spiel wurde gerade schon hinzugefügt.", slug: again?.slug };
    }
    throw err;
  }
}

// ── Bewertung & "Würde ich zocken" ───────────────────────────────────────────

async function recomputeAggregates(tx: Prisma.TransactionClient, gameId: string) {
  const [ratings, wants, owns] = await Promise.all([
    tx.gameReaction.aggregate({ where: { gameId, rating: { not: null } }, _sum: { rating: true }, _count: { rating: true } }),
    tx.gameReaction.count({ where: { gameId, wantPlay: true } }),
    tx.gameReaction.count({ where: { gameId, owns: true } }),
  ]);
  return tx.game.update({
    where: { id: gameId },
    data: { ratingSum: ratings._sum.rating ?? 0, ratingCount: ratings._count.rating, wantCount: wants, ownCount: owns },
    select: { ratingSum: true, ratingCount: true, wantCount: true, ownCount: true },
  });
}

/** Schnitte neu berechnen, z.B. nachdem Bewertungen eines gelöschten Kontos entfernt wurden */
export async function recomputeGameAggregates(gameIds: string[]) {
  for (const gameId of new Set(gameIds)) {
    await prisma.$transaction(tx => recomputeAggregates(tx, gameId));
  }
}

export interface ReactionChange { rating?: number | null; wantPlay?: boolean; owns?: boolean }

export async function setReaction(
  userId: string, slug: string, change: ReactionChange,
): Promise<Result<{
  ratingSum: number; ratingCount: number; wantCount: number; ownCount: number;
  rating: number | null; wantPlay: boolean; owns: boolean;
}>> {
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!game || game.status !== "APPROVED") return { ok: false, status: 404, error: "Spiel nicht gefunden" };

  return prisma.$transaction(async tx => {
    const data: ReactionChange = {};
    if (change.rating !== undefined) data.rating = change.rating;
    if (change.wantPlay !== undefined) data.wantPlay = change.wantPlay;
    if (change.owns !== undefined) data.owns = change.owns;

    const reaction = await tx.gameReaction.upsert({
      where:  { userId_gameId: { userId, gameId: game.id } },
      create: { userId, gameId: game.id, rating: data.rating ?? null, wantPlay: data.wantPlay ?? false, owns: data.owns ?? false },
      update: data,
    });
    // Leere Reaktionen nicht aufheben
    if (reaction.rating === null && !reaction.wantPlay && !reaction.owns) {
      await tx.gameReaction.delete({ where: { userId_gameId: { userId, gameId: game.id } } });
    }
    const agg = await recomputeAggregates(tx, game.id);
    return { ok: true as const, ...agg, rating: reaction.rating, wantPlay: reaction.wantPlay, owns: reaction.owns };
  });
}

// ── Automatischer Abgleich (Steam + IGDB) ─────────────────────────────────────

export type EnrichOutcome = "enriched" | "not_found" | "error";

/** Treffer mit (fast) gleichem Namen — sonst landete z.B. "Mario Kart" bei einem fremden Spiel */
function nameMatches(candidate: string, game: Pick<Game, "name" | "nameKey" | "aliases">): boolean {
  return matchesGameName(game, candidate, true);
}

/**
 * Ergänzt ein Spiel um Steam- und IGDB-Daten. Ohne IDs wird per Namenssuche gesucht und nur ein
 * Treffer mit (fast) gleichem Namen übernommen. Von Menschen gesetzte Felder bleiben unangetastet.
 */
export async function enrichGame(game: Game): Promise<EnrichOutcome> {
  try {
    let steamAppId = game.steamAppId;
    let igdbId = game.igdbId;
    let searchFailed = false;

    if (!steamAppId && !igdbId) {
      const [steamHits, igdbHits] = await Promise.all([
        searchSteamGames(game.name, { resolveCovers: false }).catch(() => { searchFailed = true; return []; }),
        igdbConfigured() ? searchIgdbGames(game.name).catch(() => { searchFailed = true; return []; }) : Promise.resolve([]),
      ]);
      const steamHit = steamHits.find(h => gameNameKey(h.name) === game.nameKey) ?? steamHits.find(h => nameMatches(h.name, game));
      const igdbHit = igdbHits.find(h => gameNameKey(h.name) === game.nameKey) ?? igdbHits.find(h => nameMatches(h.name, game));
      ({ steamAppId, igdbId } = await freeIds(game.id, steamHit?.appId ?? igdbHit?.steamAppId ?? null, igdbHit?.igdbId ?? null));
    }

    if (!steamAppId && !igdbId) {
      if (searchFailed) return "error"; // nicht als "erledigt" markieren — später nochmal versuchen
      await prisma.game.update({ where: { id: game.id }, data: { enrichedAt: new Date() } });
      return "not_found";
    }

    const res = await fetchCombinedDraft({ steamAppId, igdbId });
    if (!res.combined) {
      if (res.allFailed) return "error";
      await prisma.game.update({ where: { id: game.id }, data: { enrichedAt: new Date() } });
      return "not_found";
    }
    const { draft, sources } = res.combined;
    const ids = await freeIds(game.id, draft.steamAppId ?? steamAppId, draft.igdbId ?? igdbId);
    const merged = mergeAutoFields(gameFieldsOf(game), parseFieldSources(game.fieldSources), draft, sources);
    await prisma.game.update({
      where: { id: game.id },
      data: {
        steamAppId: ids.steamAppId ?? game.steamAppId,
        igdbId: ids.igdbId ?? game.igdbId,
        coverUrl: draft.coverUrl ?? game.coverUrl,
        releaseYear: draft.releaseYear ?? game.releaseYear,
        ...merged.fields,
        fieldSources: sourcesJson(merged.sources),
        enrichedAt: new Date(),
      },
    });
    return "enriched";
  } catch (err) {
    console.error(`[games] Abgleich für ${game.name} fehlgeschlagen`, err);
    return "error";
  }
}

/** Nächste Spiele ohne Abgleich verarbeiten (nacheinander, um die Rate-Limits zu schonen). */
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
    prisma.game.findMany({ select: { slug: true, nameKey: true, aliases: true, steamAppId: true } }),
  ]);

  const candidates: FavoriteGame[] = [
    ...holders.flatMap(h => h.games), // zuerst: haben meist eine Steam-ID
    ...ideas.map(i => ({ name: i.gameName!, appId: i.gameAppId })),
    ...events.map(e => ({ name: e.game!, appId: null })),
    ...spieltage.map(s => ({ name: s.game!, appId: null })),
    ...servers.map(s => ({ name: s.game, appId: null })),
  ];

  const keys = new Set(existing.flatMap(g => gameKeys(g)));
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
  input: { name?: unknown; status?: unknown; steamAppId?: unknown; igdbId?: unknown; aliases?: unknown; fields?: unknown },
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

  if (input.aliases !== undefined) {
    const aliases = sanitizeAliases(input.aliases, (data.name as string | undefined) ?? game.name);
    // Eine Schreibweise, die schon eigenes Spiel ist, wäre eine Dublette → zusammenführen statt Alias
    const clash = await prisma.game.findFirst({
      where: { nameKey: { in: aliases.map(gameNameKey) }, id: { not: id } },
      select: { name: true },
    });
    if (clash) return { ok: false, status: 409, error: `„${clash.name}“ ist ein eigenes Spiel — lieber zusammenführen.` };
    data.aliases = aliases;
  }

  if (input.status !== undefined) {
    if (input.status !== "APPROVED" && input.status !== "PENDING" && input.status !== "HIDDEN") {
      return { ok: false, status: 400, error: "Ungültiger Status" };
    }
    data.status = input.status;
  }

  const parseId = (v: unknown): number | null =>
    v === null || v === "" ? null : Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 2_000_000_000 ? Number(v) : NaN;

  let idsChanged = false;
  if (input.steamAppId !== undefined) {
    const appId = parseId(input.steamAppId);
    if (Number.isNaN(appId)) return { ok: false, status: 400, error: "Ungültige Steam-App-ID" };
    if (appId !== game.steamAppId) {
      if (appId) {
        const owner = await prisma.game.findUnique({ where: { steamAppId: appId }, select: { name: true } });
        if (owner) return { ok: false, status: 409, error: `Diese Steam-ID gehört schon zu „${owner.name}“.` };
      }
      data.steamAppId = appId;
      idsChanged = true;
    }
  }
  if (input.igdbId !== undefined) {
    const igdbId = parseId(input.igdbId);
    if (Number.isNaN(igdbId)) return { ok: false, status: 400, error: "Ungültige IGDB-ID" };
    if (igdbId !== game.igdbId) {
      if (igdbId) {
        const owner = await prisma.game.findFirst({ where: { igdbId, id: { not: id } }, select: { name: true } });
        if (owner) return { ok: false, status: 409, error: `Diese IGDB-ID gehört schon zu „${owner.name}“.` };
      }
      data.igdbId = igdbId;
      idsChanged = true;
    }
  }
  if (idsChanged) {
    data.coverUrl = null;
    data.enrichedAt = null;
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
  if (idsChanged && (updated.steamAppId || updated.igdbId)) await enrichGame(updated);
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
        data: { userId: r.userId, gameId: targetId, rating: r.rating, wantPlay: r.wantPlay, owns: r.owns, createdAt: r.createdAt },
      });
    }
    // Name und Schreibweisen der Dublette als Alias behalten — so passen alte Events/Profile weiter
    await tx.game.update({
      where: { id: targetId },
      data: { aliases: sanitizeAliases([...target.aliases, source.name, ...source.aliases], target.name) },
    });
    // Protokoll der Ergänzungen mitnehmen, bevor das Löschen es per Cascade entfernt
    await tx.gameEdit.updateMany({ where: { gameId: sourceId }, data: { gameId: targetId } });
    await tx.game.delete({ where: { id: sourceId } });
    if (!target.steamAppId && source.steamAppId) {
      await tx.game.update({ where: { id: targetId }, data: { steamAppId: source.steamAppId, coverUrl: target.coverUrl ?? source.coverUrl } });
    }
    if (!target.igdbId && source.igdbId) {
      await tx.game.update({ where: { id: targetId }, data: { igdbId: source.igdbId, coverUrl: target.coverUrl ?? source.coverUrl } });
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

// ── Gruppen-Finder ("Was zocken wir?") ───────────────────────────────────────

export const GROUP_MAX_MEMBERS = 16;

export interface GroupMember { id: string; name: string; image: string | null }

/** Mitglieder für die Auswahl im Gruppen-Finder (zuletzt aktive zuerst) */
export async function listGroupCandidates(): Promise<GroupMember[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, leftServerAt: null },
    select: { id: true, name: true, username: true, image: true },
    orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: 500,
  });
  return users.map(u => ({ id: u.id, name: u.username ?? u.name ?? "Unbekannt", image: u.image }));
}

/**
 * Wer aus der Gruppe hat welches Spiel ("Hab ich" oder als Lieblingsspiel im Profil) und wer würde
 * es zocken. Nur freigeschaltete Spiele, bei denen mindestens einer aus der Gruppe etwas markiert hat.
 */
export async function groupOwnership(userIds: string[]): Promise<Record<string, GroupGameInfo>> {
  const ids = [...new Set(userIds)].slice(0, GROUP_MAX_MEMBERS);
  if (ids.length === 0) return {};
  const [games, reactions, users] = await Promise.all([
    prisma.game.findMany({ where: { status: "APPROVED" }, select: { id: true, steamAppId: true, nameKey: true, aliases: true } }),
    prisma.gameReaction.findMany({
      where: { userId: { in: ids }, OR: [{ owns: true }, { wantPlay: true }] },
      select: { userId: true, gameId: true, owns: true, wantPlay: true },
    }),
    prisma.user.findMany({ where: { id: { in: ids }, favoriteGamesJson: { not: null } }, select: { id: true, favoriteGamesJson: true } }),
  ]);

  const out: Record<string, GroupGameInfo> = {};
  const entry = (gameId: string) => (out[gameId] ??= { owners: [], wanters: [] });
  const approved = new Set(games.map(g => g.id));

  for (const r of reactions) {
    if (!approved.has(r.gameId)) continue;
    if (r.owns && !entry(r.gameId).owners.includes(r.userId)) entry(r.gameId).owners.push(r.userId);
    if (r.wantPlay) entry(r.gameId).wanters.push(r.userId);
  }
  // "Zockt gerade" im Profil heißt: hat das Spiel
  for (const u of users) {
    for (const fav of parseFavoriteGames(u.favoriteGamesJson)) {
      const g = games.find(x => favoriteMatchesGame(fav, x));
      if (g && !entry(g.id).owners.includes(u.id)) entry(g.id).owners.push(u.id);
    }
  }
  return out;
}

// ── Ergänzungen durch Mitglieder ─────────────────────────────────────────────

/** Leere Angaben eines Spiels ergänzen (nie überschreiben). Jede Änderung wird protokolliert. */
export async function fillMissingFields(
  user: { id: string; isModerator: boolean }, slug: string, input: unknown,
): Promise<Result<{ filled: string[] }>> {
  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game || game.status !== "APPROVED") return { ok: false, status: 404, error: "Spiel nicht gefunden" };

  const fills = applicableFills(gameFieldsOf(game), sanitizeGameFields(input));
  const fields = Object.keys(fills) as FillableField[];
  if (fields.length === 0) return { ok: false, status: 400, error: "Nichts Neues zum Ergänzen — evtl. hat jemand anderes schneller ausgefüllt." };

  if (!user.isModerator) {
    const recent = await prisma.gameEdit.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
    });
    if (recent + fields.length > DAILY_FILL_LIMIT) {
      return { ok: false, status: 429, error: "Für heute hast du genug ergänzt — danke! Morgen geht's weiter." };
    }
  }

  const sources = parseFieldSources(game.fieldSources);
  for (const f of fields) sources[f] = "user";

  await prisma.$transaction([
    // Nur übernehmen, wenn die Felder noch leer sind (gleichzeitige Ergänzungen)
    prisma.game.update({ where: { id: game.id, updatedAt: game.updatedAt }, data: { ...fills, fieldSources: sourcesJson(sources) } }),
    prisma.gameEdit.createMany({
      data: fields.map(f => ({
        gameId: game.id, userId: user.id, field: f,
        oldValue: jsonValue(gameFieldsOf(game)[f]), newValue: jsonValue(fills[f]),
      })),
    }),
  ]).catch(err => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") throw new ConflictError();
    throw err;
  });
  return { ok: true, filled: fields };
}

export class ConflictError extends Error {
  constructor() { super("Das Spiel wurde gerade geändert — bitte Seite neu laden."); }
}

const jsonValue = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

export async function listRecentGameEdits(take = 60) {
  const rows = await prisma.gameEdit.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      game: { select: { id: true, slug: true, name: true } },
      user: { select: { id: true, name: true, username: true } },
    },
  });
  return rows.map(r => ({
    id: r.id, field: r.field, oldValue: r.oldValue, newValue: r.newValue,
    reverted: r.revertedAt !== null, createdAt: r.createdAt.toISOString(),
    game: r.game, userName: r.user ? r.user.username ?? r.user.name : null,
  }));
}

/** Ergänzung zurücksetzen — nur solange der Wert seither nicht weiter geändert wurde. */
export async function revertGameEdit(editId: string): Promise<Result<{ slug: string }>> {
  const edit = await prisma.gameEdit.findUnique({ where: { id: editId }, include: { game: true } });
  if (!edit) return { ok: false, status: 404, error: "Eintrag nicht gefunden" };
  if (edit.revertedAt) return { ok: false, status: 400, error: "Schon zurückgesetzt" };
  if (!(FILLABLE_FIELDS as readonly string[]).includes(edit.field)) return { ok: false, status: 400, error: "Unbekanntes Feld" };
  const field = edit.field as FillableField;

  const current = gameFieldsOf(edit.game)[field];
  if (JSON.stringify(current ?? null) !== JSON.stringify(edit.newValue ?? null)) {
    return { ok: false, status: 409, error: "Der Wert wurde seitdem geändert — bitte direkt im Spiel bearbeiten." };
  }

  const restore = edit.oldValue ?? (Array.isArray(edit.newValue) ? [] : null);
  const sources = parseFieldSources(edit.game.fieldSources);
  delete sources[field];

  await prisma.$transaction([
    prisma.game.update({ where: { id: edit.gameId }, data: { [field]: restore, fieldSources: sourcesJson(sources) } }),
    prisma.gameEdit.update({ where: { id: editId }, data: { revertedAt: new Date() } }),
  ]);
  return { ok: true, slug: edit.game.slug };
}

// ── Vorschläge für Spiel-Eingabefelder (Events, Server, Umfragen, Profil) ────

export interface GameSuggestion { name: string; coverUrl: string | null }

/**
 * Freigeschaltete Spiele, deren Name oder andere Schreibweise passt (immer mit dem offiziellen
 * Namen, damit überall dieselbe Schreibweise landet). Ohne Suchtext: die beliebtesten Spiele.
 */
export async function suggestGames(q: string, take = 6): Promise<GameSuggestion[]> {
  const key = gameNameKey(q);
  if (!key) {
    return prisma.game.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ wantCount: "desc" }, { ownCount: "desc" }, { ratingCount: "desc" }, { name: "asc" }],
      take: 8,
      select: { name: true, coverUrl: true },
    });
  }
  const games = await prisma.game.findMany({
    where: { status: "APPROVED" },
    select: { name: true, nameKey: true, aliases: true, coverUrl: true, wantCount: true },
  });
  return games
    .map(g => ({ g, keys: gameKeys(g) }))
    .filter(({ keys }) => keys.some(k => k.includes(key)))
    .sort((a, b) =>
      Number(b.keys.some(k => k.startsWith(key))) - Number(a.keys.some(k => k.startsWith(key)))
      || b.g.wantCount - a.g.wantCount
      || a.g.name.length - b.g.name.length)
    .slice(0, take)
    .map(({ g }) => ({ name: g.name, coverUrl: g.coverUrl }));
}
