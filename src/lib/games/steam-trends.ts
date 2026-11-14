/**
 * Steam-Trends für den GameSwipe-Stapel — nur serverseitig.
 *
 * Vier Quellen: die meistgespielten Spiele (ISteamChartsService, gleichzeitige Spieler) = "Gerade angesagt"
 * sowie Steams Shop-Listen "Beliebte Neuerscheinungen", "Topseller" und "Beliebt und bald verfügbar".
 * Behalten wird nur, was ein echtes Spiel ist (appdetails type "game" ohne Software-Genre — DLCs,
 * Soundtracks, Demos, Hardware und Programme fallen raus) und noch nicht in der Spieleliste steht; steht ein
 * Spiel in mehreren Listen, zählt die erste (Reihenfolge TREND_KINDS). Steam drosselt Detailabfragen, deshalb
 * baut ein täglicher Cron (cron/game-trends) die Liste und legt sie in BotConfig ab; der Stapel liest nur
 * diesen Stand.
 */

import { prisma } from "@/lib/prisma";
import type { GameFields } from "./draft";
import { steamSearchAppIds } from "./discover-parse";
import { fetchSteamGameDraft } from "./steam";

const KEY = "games_steam_trends";
const UA = { "User-Agent": "OMA-Companion/1.0 (Spieleliste)" };
/** Höchstens so viele Kandidaten je Quelle (Detailabfragen pro Lauf begrenzt) */
const PER_SOURCE = 15;
/** Gleichzeitige Detailabfragen — Steam drosselt bei zu vielen */
const CONCURRENCY = 6;

export type SteamTrendKind = "top" | "new" | "seller" | "soon";
/** Reihenfolge = Vorrang, wenn ein Spiel in mehreren Listen steht */
const TREND_KINDS: SteamTrendKind[] = ["top", "new", "seller", "soon"];

export interface SteamTrend extends Omit<GameFields, "tags"> {
  steamAppId: number;
  trend: SteamTrendKind;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  priceCents: number | null;
  priceInitialCents: number | null;
  discountPercent: number;
  priceCurrency: string | null;
  /** Seit wann das Spiel in der Trendliste steht (ISO) — für "neue Karten" in GameSwipe */
  firstSeenAt?: string;
}

async function fetchMostPlayed(): Promise<number[]> {
  const res = await fetch("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/", {
    headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!res.ok) throw new Error(`Steam Charts ${res.status}`);
  const json = await res.json() as { response?: { ranks?: { appid: number }[] } };
  return (json.response?.ranks ?? []).map(r => r.appid).filter(id => Number.isInteger(id) && id > 0);
}

/** Eine Liste aus Steams Shop-Suche (Filter wie auf store.steampowered.com/search). */
async function fetchSearchList(filter: "popularnew" | "topsellers" | "popularcomingsoon"): Promise<number[]> {
  const res = await fetch(`https://store.steampowered.com/search/results/?filter=${filter}&json=1&cc=de&l=german&count=40`, {
    headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!res.ok) throw new Error(`Steam Suche ${filter} ${res.status}`);
  return steamSearchAppIds(await res.json());
}

const SOURCES: Record<SteamTrendKind, () => Promise<number[]>> = {
  top: fetchMostPlayed,
  new: () => fetchSearchList("popularnew"),
  seller: () => fetchSearchList("topsellers"),
  soon: () => fetchSearchList("popularcomingsoon"),
};

/** Trendliste neu aufbauen (Cron). Fehlt eine Quelle, bleiben die anderen — ganz ohne Treffer der alte Stand. */
export async function refreshSteamTrends(): Promise<Record<SteamTrendKind, number> & { kept: number }> {
  const lists = await Promise.all(
    TREND_KINDS.map(kind => SOURCES[kind]().catch(err => { console.error(`[games] Steam-Quelle ${kind}`, err); return [] as number[]; })),
  );
  const known = new Set(
    (await prisma.game.findMany({ where: { steamAppId: { not: null } }, select: { steamAppId: true } })).map(g => g.steamAppId!),
  );
  const taken = new Set<number>();
  const candidates: { id: number; trend: SteamTrendKind }[] = [];
  TREND_KINDS.forEach((trend, i) => {
    const ids = lists[i].filter(id => !known.has(id) && !taken.has(id)).slice(0, PER_SOURCE);
    for (const id of ids) {
      taken.add(id);
      candidates.push({ id, trend });
    }
  });

  const previous = new Map((await getSteamTrends()).map(t => [t.steamAppId, t.firstSeenAt]));
  const nowIso = new Date().toISOString();
  const items: SteamTrend[] = [];
  // In kleinen Gruppen abfragen — Steam drosselt sonst
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const drafts = await Promise.all(batch.map(c => fetchSteamGameDraft(c.id, { excludeSoftware: true }).catch(() => null)));
    drafts.forEach((d, k) => {
      if (!d || !d.steamAppId) return;
      items.push({
        steamAppId: d.steamAppId, trend: batch[k].trend, name: d.name, coverUrl: d.coverUrl, releaseYear: d.releaseYear,
        description: d.description, genres: d.genres, modes: d.modes, platforms: d.platforms, crossplay: d.crossplay,
        isFree: d.isFree, minPlayers: d.minPlayers, maxPlayers: d.maxPlayers, sessionLength: d.sessionLength,
        priceCents: d.steamPrice?.priceCents ?? null, priceInitialCents: d.steamPrice?.priceInitialCents ?? null,
        discountPercent: d.steamPrice?.discountPercent ?? 0, priceCurrency: d.steamPrice?.currency ?? null,
        firstSeenAt: previous.get(d.steamAppId) ?? nowIso,
      });
    });
  }
  if (items.length > 0) {
    const value = JSON.stringify({ updatedAt: new Date().toISOString(), items });
    await prisma.botConfig.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  }
  const found = Object.fromEntries(TREND_KINDS.map((k, i) => [k, lists[i].length])) as Record<SteamTrendKind, number>;
  return { ...found, kept: items.length };
}

/** Aktuelle Trendliste (leer, solange der Cron noch nicht gelaufen ist). */
export async function getSteamTrends(): Promise<SteamTrend[]> {
  const row = await prisma.botConfig.findUnique({ where: { key: KEY } });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.value) as { items?: SteamTrend[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}
