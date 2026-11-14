/**
 * GameSwipe-Entdecken — Spiele, die (noch) nicht in der Spieleliste stehen. Nur serverseitig.
 *
 * Quellen (je ein Feed in BotConfig, täglich vom Cron cron/game-discover aufgebaut):
 *  - "free":         Gratis-Aktionen — Epic Games Store (Gratisspiele der Woche) und Steam (100 % reduziert)
 *  - "upcoming":     Erscheint bald — Mehrspieler-Spiele der nächsten 90 Tage aus IGDB, nach Vorfreude
 *  - "subscription": Neu im Game Pass — Titel, die seit dem letzten Abgleich im Katalog dazugekommen sind
 *                    (der Abgleich in store-sync.ts merkt sie vor, hier werden sie Steam/IGDB zugeordnet)
 *  - Steam-Trends ("steam_top"/"steam_new") kommen aus steam-trends.ts.
 *
 * Jede Karte braucht eine Steam- oder IGDB-ID, damit "Am Start" das Spiel in die Liste aufnehmen kann.
 */

import { prisma } from "@/lib/prisma";
import type { GameDraft } from "./draft";
import { discoverKey, SUBSCRIPTION_NEW_DAYS, type DiscoverItem, type DiscoverSource } from "./deck-plan";
import { parseEpicFreeGames, steamSearchAppIds } from "./discover-parse";
import type { GamePassCatalog } from "./gamepass";
import { fetchUpcomingMultiplayer, igdbConfigured, searchIgdbGames } from "./igdb";
import { gameNameKey } from "./slug";
import { fetchCombinedDraft } from "./sources";
import { fetchSteamGameDraft, fetchSteamPrices, searchSteamGames } from "./steam";
import { getSteamTrends } from "./steam-trends";

const FEED_KEY = {
  free: "games_discover_free",
  upcoming: "games_discover_upcoming",
  subscription: "games_discover_subscription",
} as const;
type FeedName = keyof typeof FEED_KEY;
const SUB_SEEN_KEY = "games_gamepass_seen";
const SUB_PENDING_KEY = "games_gamepass_pending";

const UA = { "User-Agent": "OMA-Companion/1.0 (Spieleliste)" };
const EPIC_URL = "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=de&country=DE&allowCountries=DE";
const STEAM_FREE_URL = "https://store.steampowered.com/search/results/?maxprice=free&specials=1&json=1&cc=de&l=german&count=20";

/** Höchstens so viele Namens-Zuordnungen bzw. Detailabfragen je Quelle und Lauf */
const MAX_LOOKUPS = 6;
const MAX_UPCOMING = 12;

// ── Speicher ─────────────────────────────────────────────────────────────────────

async function readJson<T>(key: string): Promise<T | null> {
  const row = await prisma.botConfig.findUnique({ where: { key } });
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

async function writeJson(key: string, value: unknown) {
  const v = JSON.stringify(value);
  await prisma.botConfig.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}

async function readFeed(name: FeedName): Promise<DiscoverItem[]> {
  const feed = await readJson<{ items?: DiscoverItem[] }>(FEED_KEY[name]);
  return Array.isArray(feed?.items) ? feed.items : [];
}

async function writeFeed(name: FeedName, items: DiscoverItem[]) {
  await writeJson(FEED_KEY[name], { updatedAt: new Date().toISOString(), items });
}

/** Alle Entdecken-Karten aller Quellen (inkl. Steam-Trends), Reihenfolge innerhalb einer Quelle = Priorität. */
export async function getDiscoverItems(): Promise<DiscoverItem[]> {
  const [free, upcoming, subscription, trends] = await Promise.all([
    readFeed("free"), readFeed("upcoming"), readFeed("subscription"), getSteamTrends(),
  ]);
  const steam: DiscoverItem[] = trends.map(t => {
    const { steamAppId, trend, firstSeenAt, ...rest } = t;
    return {
      ...rest, source: trend === "top" ? "steam_top" : "steam_new", steamAppId, igdbId: null, releaseDate: null,
      freeUntil: null, store: "steam", storeUrl: `https://store.steampowered.com/app/${steamAppId}/`, subscriptions: [],
      addedAt: firstSeenAt ?? new Date(0).toISOString(),
    };
  });
  return [...free, ...subscription, ...upcoming, ...steam];
}

// ── Hilfen ───────────────────────────────────────────────────────────────────────

function itemFromDraft(
  draft: GameDraft, source: DiscoverSource, addedAt: string, extra: Partial<DiscoverItem> = {},
): DiscoverItem {
  return {
    source, steamAppId: draft.steamAppId, igdbId: draft.igdbId, name: draft.name, coverUrl: draft.coverUrl,
    releaseYear: draft.releaseYear, releaseDate: null,
    description: draft.description, genres: draft.genres, modes: draft.modes, platforms: draft.platforms,
    crossplay: draft.crossplay, isFree: draft.isFree, minPlayers: draft.minPlayers, maxPlayers: draft.maxPlayers,
    sessionLength: draft.sessionLength,
    priceCents: draft.steamPrice?.priceCents ?? null, priceInitialCents: draft.steamPrice?.priceInitialCents ?? null,
    discountPercent: draft.steamPrice?.discountPercent ?? 0, priceCurrency: draft.steamPrice?.currency ?? null,
    freeUntil: null, store: null, storeUrl: null, subscriptions: [], addedAt,
    ...extra,
  };
}

/** Bisheriges "seit wann" einer Karte behalten, damit sie nicht jeden Tag wieder als neu zählt. */
function addedAtLookup(previous: DiscoverItem[], nowIso: string) {
  const byKey = new Map(previous.map(i => [discoverKey(i), i.addedAt]));
  return (i: { steamAppId: number | null; igdbId: number | null }) => byKey.get(discoverKey(i)) ?? nowIso;
}

/** Spielname (Epic, Game Pass) → Steam-/IGDB-Entwurf. Nur exakte Namensgleichheit (nach Normalisierung). */
async function resolveByName(name: string): Promise<GameDraft | null> {
  const key = gameNameKey(name);
  if (!key) return null;
  if (igdbConfigured()) {
    const hit = (await searchIgdbGames(name).catch(() => [])).find(h => gameNameKey(h.name) === key);
    if (hit) {
      const res = await fetchCombinedDraft({ igdbId: hit.igdbId, steamAppId: hit.steamAppId });
      if (res.combined) return res.combined.draft;
    }
  }
  const steamHit = (await searchSteamGames(name, { resolveCovers: false }).catch(() => [])).find(h => gameNameKey(h.name) === key);
  if (steamHit) {
    const res = await fetchCombinedDraft({ steamAppId: steamHit.appId });
    if (res.combined) return res.combined.draft;
  }
  return null;
}

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  return out;
}

// ── Gratis-Aktionen ──────────────────────────────────────────────────────────────

async function fetchEpicFree(addedAt: ReturnType<typeof addedAtLookup>): Promise<DiscoverItem[]> {
  const res = await fetch(EPIC_URL, { headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Epic ${res.status}`);
  const promos = parseEpicFreeGames(await res.json()).slice(0, MAX_LOOKUPS);
  const drafts = await inBatches(promos, 3, p => resolveByName(p.title).catch(() => null));
  const out: DiscoverItem[] = [];
  drafts.forEach((d, k) => {
    if (!d || (!d.steamAppId && !d.igdbId)) return;
    const p = promos[k];
    out.push(itemFromDraft(d, "free", addedAt(d), {
      coverUrl: d.coverUrl ?? p.imageUrl, freeUntil: p.endsAt, store: "epic", storeUrl: p.storeUrl, isFree: true,
    }));
  });
  return out;
}

async function fetchSteamFree(addedAt: ReturnType<typeof addedAtLookup>): Promise<DiscoverItem[]> {
  const res = await fetch(STEAM_FREE_URL, { headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Steam Gratis-Suche ${res.status}`);
  const ids = steamSearchAppIds(await res.json()).slice(0, 15);
  if (ids.length === 0) return [];
  // Nur, was gerade wirklich 100 % reduziert ist (die Suche liefert auch dauerhaft Kostenloses)
  const prices = await fetchSteamPrices(ids);
  const free = ids.filter(id => {
    const p = prices.get(id);
    return p && p.discountPercent === 100 && p.priceCents === 0;
  }).slice(0, MAX_LOOKUPS);
  const drafts = await inBatches(free, 3, id => fetchSteamGameDraft(id, { excludeSoftware: true }).catch(() => null));
  return drafts
    .filter((d): d is GameDraft => !!d)
    .map(d => itemFromDraft(d, "free", addedAt(d), {
      store: "steam", storeUrl: `https://store.steampowered.com/app/${d.steamAppId}/`, isFree: true,
      priceCents: 0, discountPercent: 100,
    }));
}

export async function refreshFreePromos(): Promise<{ epic: number | string; steam: number | string; kept: number }> {
  const previous = await readFeed("free");
  const nowIso = new Date().toISOString();
  const addedAt = addedAtLookup(previous, nowIso);
  const [epic, steam] = await Promise.allSettled([fetchEpicFree(addedAt), fetchSteamFree(addedAt)]);
  if (epic.status === "rejected") console.error("[games] Epic-Gratisspiele", epic.reason);
  if (steam.status === "rejected") console.error("[games] Steam-Gratisspiele", steam.reason);

  // Fällt eine Quelle aus, bleiben ihre bisherigen (noch laufenden) Aktionen stehen
  const keepOld = (store: "epic" | "steam") =>
    previous.filter(i => i.store === store && (!i.freeUntil || i.freeUntil > nowIso));
  const items = [
    ...(epic.status === "fulfilled" ? epic.value : keepOld("epic")),
    ...(steam.status === "fulfilled" ? steam.value : keepOld("steam")),
  ];
  await writeFeed("free", dedupe(items));
  return {
    epic: epic.status === "fulfilled" ? epic.value.length : String(epic.reason),
    steam: steam.status === "fulfilled" ? steam.value.length : String(steam.reason),
    kept: items.length,
  };
}

// ── Erscheint bald ───────────────────────────────────────────────────────────────

export async function refreshUpcoming(): Promise<{ found: number; kept: number } | { skipped: string }> {
  if (!igdbConfigured()) return { skipped: "IGDB nicht eingerichtet" };
  const previous = await readFeed("upcoming");
  const addedAt = addedAtLookup(previous, new Date().toISOString());
  const upcoming = (await fetchUpcomingMultiplayer(90, 25)).slice(0, MAX_UPCOMING);
  // Mit Steam-Seite: deutsche Beschreibung und Querformat-Cover von Steam dazuholen
  const items = await inBatches(upcoming, 4, async u => {
    let draft: GameDraft = u;
    if (u.steamAppId) {
      const res = await fetchCombinedDraft({ steamAppId: u.steamAppId, igdbId: u.igdbId }).catch(() => null);
      if (res?.combined) draft = res.combined.draft;
    }
    return itemFromDraft(draft, "upcoming", addedAt(draft), { releaseDate: u.releaseDate, store: draft.steamAppId ? "steam" : null,
      storeUrl: draft.steamAppId ? `https://store.steampowered.com/app/${draft.steamAppId}/` : null });
  });
  await writeFeed("upcoming", dedupe(items));
  return { found: upcoming.length, kept: items.length };
}

// ── Neu im Game Pass ─────────────────────────────────────────────────────────────

interface PendingTitle { title: string; subs: string[]; addedAt: string }

/**
 * Nach dem täglichen Game-Pass-Abgleich: Titel, die neu im Katalog sind und nicht in der Spieleliste stehen,
 * zum Zuordnen vormerken. Beim allerersten Lauf wird nur der Stand gemerkt (sonst wäre alles "neu").
 * knownKeys: Namen/Aliase der Spieleliste (normalisiert) — deren Abo-Neuzugänge zeigt der Stapel direkt.
 */
export async function recordSubscriptionCatalog(catalog: GamePassCatalog, knownKeys: Set<string>): Promise<{ fresh: number }> {
  if (catalog.titles.size === 0) return { fresh: 0 };
  const seen = await readJson<string[]>(SUB_SEEN_KEY);
  const current = [...catalog.titles.keys()];
  if (!seen) {
    await writeJson(SUB_SEEN_KEY, current);
    return { fresh: 0 };
  }
  const seenSet = new Set(seen);
  const nowIso = new Date().toISOString();
  const fresh: PendingTitle[] = [];
  for (const [key, { title, subs }] of catalog.titles) {
    if (seenSet.has(key) || knownKeys.has(key)) continue;
    fresh.push({ title, subs: [...subs], addedAt: nowIso });
  }
  if (fresh.length > 0) {
    const pending = (await readJson<PendingTitle[]>(SUB_PENDING_KEY)) ?? [];
    await writeJson(SUB_PENDING_KEY, [...pending, ...fresh].slice(-40));
  }
  // Nie verkleinern: fällt ein Katalog einmal aus, gelten seine Titel danach nicht als neu
  await writeJson(SUB_SEEN_KEY, [...new Set([...seen, ...current])]);
  return { fresh: fresh.length };
}

export async function resolveSubscriptionPending(): Promise<{ resolved: number; pending: number }> {
  const pending = (await readJson<PendingTitle[]>(SUB_PENDING_KEY)) ?? [];
  const now = Date.now();
  const recent = (iso: string) => now - Date.parse(iso) <= SUBSCRIPTION_NEW_DAYS * 86_400_000;
  const feed = (await readFeed("subscription")).filter(i => recent(i.addedAt));
  const batch = pending.slice(0, MAX_LOOKUPS);
  const drafts = await inBatches(batch, 3, p => resolveByName(p.title).catch(() => null));
  drafts.forEach((d, k) => {
    if (!d || (!d.steamAppId && !d.igdbId)) return;
    feed.unshift(itemFromDraft(d, "subscription", batch[k].addedAt, { subscriptions: batch[k].subs }));
  });
  await writeFeed("subscription", dedupe(feed).slice(0, 30));
  // Was sich nicht zuordnen ließ, fällt raus (kein Endlos-Versuch)
  await writeJson(SUB_PENDING_KEY, pending.slice(batch.length));
  return { resolved: drafts.filter(Boolean).length, pending: pending.length - batch.length };
}

function dedupe(items: DiscoverItem[]): DiscoverItem[] {
  const seen = new Set<string>();
  return items.filter(i => {
    const k = discoverKey(i);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Alle Entdecken-Feeds neu aufbauen; jede Quelle darf ausfallen. */
export async function refreshDiscoverFeeds() {
  const [free, upcoming, subscription] = await Promise.allSettled([refreshFreePromos(), refreshUpcoming(), resolveSubscriptionPending()]);
  const out = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) });
  return { free: out(free), upcoming: out(upcoming), subscription: out(subscription) };
}
