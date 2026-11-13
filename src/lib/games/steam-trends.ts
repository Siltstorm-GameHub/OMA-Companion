/**
 * Steam-Trends für den Swipe-Stapel — nur serverseitig.
 *
 * Zwei Quellen: die meistgespielten Spiele (ISteamChartsService, gleichzeitige Spieler) = "Gerade angesagt"
 * und Steams Filter "beliebte Neuerscheinungen" = "Neu & angesagt". Behalten wird nur, was ein echtes Spiel
 * ist (appdetails type "game" ohne Software-Genre — DLCs, Soundtracks, Demos und Programme fallen raus) und
 * noch nicht in der Spieleliste steht. Steam drosselt Detailabfragen, deshalb baut ein täglicher Cron
 * (cron/game-trends) die Liste und legt sie in BotConfig ab; der Stapel liest nur diesen Stand.
 */

import { prisma } from "@/lib/prisma";
import type { GameFields } from "./draft";
import { fetchSteamGameDraft } from "./steam";

const KEY = "games_steam_trends";
const UA = { "User-Agent": "OMA-Companion/1.0 (Spieleliste)" };
/** Höchstens so viele Kandidaten je Quelle (Detailabfragen pro Lauf begrenzt) */
const PER_SOURCE = 20;

export type SteamTrendKind = "top" | "new";

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
}

async function fetchMostPlayed(): Promise<number[]> {
  const res = await fetch("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/", {
    headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!res.ok) throw new Error(`Steam Charts ${res.status}`);
  const json = await res.json() as { response?: { ranks?: { appid: number }[] } };
  return (json.response?.ranks ?? []).map(r => r.appid).filter(id => Number.isInteger(id) && id > 0);
}

async function fetchPopularNew(): Promise<number[]> {
  const res = await fetch("https://store.steampowered.com/search/results/?filter=popularnew&json=1&cc=de&l=german&count=40", {
    headers: UA, signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!res.ok) throw new Error(`Steam Suche ${res.status}`);
  const json = await res.json() as { items?: { logo?: string }[] };
  // Die App-ID steckt nur in der Bild-URL (…/apps/<id>/…)
  return (json.items ?? [])
    .map(i => Number(/\/apps\/(\d+)\//.exec(i.logo ?? "")?.[1]))
    .filter(id => Number.isInteger(id) && id > 0);
}

/** Trendliste neu aufbauen (Cron). Fehlt eine Quelle, bleibt die andere — ganz ohne Treffer der alte Stand. */
export async function refreshSteamTrends(): Promise<{ top: number; new: number; kept: number }> {
  const [top, fresh] = await Promise.all([
    fetchMostPlayed().catch(err => { console.error("[games] Steam-Charts", err); return [] as number[]; }),
    fetchPopularNew().catch(err => { console.error("[games] Steam-Neuheiten", err); return [] as number[]; }),
  ]);
  const known = new Set(
    (await prisma.game.findMany({ where: { steamAppId: { not: null } }, select: { steamAppId: true } })).map(g => g.steamAppId!),
  );
  const pick = (ids: number[]) => [...new Set(ids)].filter(id => !known.has(id)).slice(0, PER_SOURCE);
  const candidates: { id: number; trend: SteamTrendKind }[] = [
    ...pick(top).map(id => ({ id, trend: "top" as const })),
    ...pick(fresh).filter(id => !top.includes(id)).map(id => ({ id, trend: "new" as const })),
  ];

  const items: SteamTrend[] = [];
  // In kleinen Gruppen abfragen — Steam drosselt sonst
  for (let i = 0; i < candidates.length; i += 4) {
    const batch = candidates.slice(i, i + 4);
    const drafts = await Promise.all(batch.map(c => fetchSteamGameDraft(c.id, { excludeSoftware: true }).catch(() => null)));
    drafts.forEach((d, k) => {
      if (!d || !d.steamAppId) return;
      items.push({
        steamAppId: d.steamAppId, trend: batch[k].trend, name: d.name, coverUrl: d.coverUrl, releaseYear: d.releaseYear,
        description: d.description, genres: d.genres, modes: d.modes, platforms: d.platforms, crossplay: d.crossplay,
        isFree: d.isFree, minPlayers: d.minPlayers, maxPlayers: d.maxPlayers, sessionLength: d.sessionLength,
        priceCents: d.steamPrice?.priceCents ?? null, priceInitialCents: d.steamPrice?.priceInitialCents ?? null,
        discountPercent: d.steamPrice?.discountPercent ?? 0, priceCurrency: d.steamPrice?.currency ?? null,
      });
    });
  }
  if (items.length > 0) {
    const value = JSON.stringify({ updatedAt: new Date().toISOString(), items });
    await prisma.botConfig.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  }
  return { top: top.length, new: fresh.length, kept: items.length };
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
