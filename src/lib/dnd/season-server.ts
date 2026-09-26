// ============================================
// OMA Quest — Saison-Events (Server): welche Events laufen gerade?
// ============================================

import { prisma } from "../prisma";
import { SEASON_TEMPLATES, isSeasonKey, type SeasonKey } from "./season-events";

export interface SeasonView { key: SeasonKey; name: string; icon: string; blurb: string; endsAt: string; tint: string; snow: boolean; fog: boolean }

let cache: { at: number; list: SeasonView[] } | null = null;
const TTL = 30_000;

/** Laufende Events (kurz zwischengespeichert, damit nicht jede Abfrage die Datenbank trifft). */
export async function activeSeasonEvents(now = Date.now()): Promise<SeasonView[]> {
  if (cache && now - cache.at < TTL) return cache.list;
  const rows = await prisma.dndSeasonEvent.findMany({ where: { active: true, startsAt: { lte: new Date(now) }, endsAt: { gte: new Date(now) } }, orderBy: { endsAt: "asc" } });
  const seen = new Set<string>();
  const list: SeasonView[] = [];
  for (const r of rows) {
    if (!isSeasonKey(r.key) || seen.has(r.key)) continue;
    seen.add(r.key);
    const t = SEASON_TEMPLATES[r.key];
    list.push({ key: r.key, name: t.name, icon: t.icon, blurb: t.blurb, endsAt: r.endsAt.toISOString(), tint: t.look.tint, snow: !!t.look.snow, fog: !!t.look.fog });
  }
  cache = { at: now, list };
  return list;
}

export const activeSeasonKeys = async (): Promise<SeasonKey[]> => (await activeSeasonEvents()).map((e) => e.key);

/** Nach Änderungen im Admin sofort neu laden. */
export const resetSeasonCache = (): void => { cache = null; };
