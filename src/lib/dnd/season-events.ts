// ============================================
// OMA Quest — Saison-Events (rein): Halloween und Weihnachten als Zeitfenster mit Look, Monstern, Quests und Belohnungen
// ============================================
// Ein Event verkleidet die festen Locations für die Dauer des Zeitfensters (zusätzliche Objekte, Event-Monster, Farbstimmung). Die gespeicherten
// Karten ändern sich nicht: `withEvents` legt die Zutaten beim Laden deterministisch über die Welt — Client und Server rechnen dasselbe.

import { solidOfMap } from "../te-map/engine";
import { STAMPS, type StampDef, type StampId } from "../te-map/stamps";
import { placeSpots } from "../te-map/worlds";
import type { WorldDef } from "../te-map/types";

export type SeasonKey = "halloween" | "christmas";

export interface SeasonTemplate {
  key: SeasonKey;
  name: string;
  icon: string;
  blurb: string;
  /** Event-Monster: erscheinen nur, solange das Event läuft (als Figuren in den festen Locations) */
  monsters: string[];
  /** Event-Raid-Boss: nur im Raid-Modus einer Gruppe, solange das Event läuft */
  raid: string;
  /** Zusätzliche Objekte in den Locations */
  stamps: StampId[];
  /** Farbstimmung über der Welt */
  look: { tint: string; snow?: boolean; fog?: boolean };
  /** Quests des Events (Kennungen aus quests-catalog) */
  quests: string[];
  /** Vorschlag für das Zeitfenster eines Jahres (Monate 1–12, Ende einschließlich) */
  range: (year: number) => { start: [number, number, number]; end: [number, number, number] };
}

export const SEASON_TEMPLATES: Record<SeasonKey, SeasonTemplate> = {
  halloween: {
    key: "halloween", name: "Halloween", icon: "🎃", blurb: "Geister, Kürbisköpfe und tanzende Skelette treiben in den Locations ihr Unwesen.",
    monsters: ["geist", "kuerbiskopf", "tanzskelett"],
    raid: "reiter",
    stamps: ["aTreeTall", "aTreeBig", "aGrave1", "aGrave2", "aGrave3", "aBone1", "aBone2", "aSkull", "aThorn1", "aThorn2", "aLog"],
    look: { tint: "rgba(52, 14, 92, 0.22)", fog: true },
    quests: ["dnd-ev-halloween-geister", "dnd-ev-halloween-kuerbis", "dnd-ev-halloween-tanz", "dnd-ev-halloween-reiter"],
    range: (y) => ({ start: [y, 10, 20], end: [y, 11, 1] }),
  },
  christmas: {
    key: "christmas", name: "Weihnachten", icon: "🎄", blurb: "Wichtel, Eisbären und Rentiere kommen in die Welt — und überall liegt Schnee.",
    monsters: ["wichtel", "eisbaer", "rentier", "gnom"],
    raid: "rudolph",
    stamps: ["xTree1", "xTree2", "xGift1", "xGift2", "xGift3", "xGift4", "xGiftPink", "xSnowmanA", "xSnowmanB", "xSnowmanC", "xSnowmanD", "xGarland", "xGingerbread", "xIgloo", "xSnowLump1", "xSnowLump2"],
    look: { tint: "rgba(170, 215, 255, 0.12)", snow: true },
    quests: ["dnd-ev-weihnacht-wichtel", "dnd-ev-weihnacht-baer", "dnd-ev-weihnacht-rentier", "dnd-ev-weihnacht-rudolph"],
    range: (y) => ({ start: [y, 12, 1], end: [y, 12, 26] }),
  },
};

export const isSeasonKey = (v: unknown): v is SeasonKey => v === "halloween" || v === "christmas";

/** Zeitfenster eines Jahres als Datumswerte (Ende: Ende des letzten Tages). */
export function defaultRange(key: SeasonKey, year: number): { startsAt: Date; endsAt: Date } {
  const r = SEASON_TEMPLATES[key].range(year);
  return { startsAt: new Date(r.start[0], r.start[1] - 1, r.start[2], 0, 0, 0), endsAt: new Date(r.end[0], r.end[1] - 1, r.end[2], 23, 59, 59) };
}

/** Kennungen der Event-Quests bzw. Event-Monster → zu welchem Event gehören sie? */
export function seasonOfMonster(monsterId: string): SeasonKey | null {
  return (Object.values(SEASON_TEMPLATES).find((t) => t.monsters.includes(monsterId) || t.raid === monsterId)?.key) ?? null;
}
export function seasonOfQuest(slug: string): SeasonKey | null {
  return (Object.values(SEASON_TEMPLATES).find((t) => t.quests.includes(slug))?.key) ?? null;
}

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rngOf = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Feste Plätze der Event-Monster als Anteil der Kartengröße. */
const SPOTS: [number, number][] = [[0.3, 0.3], [0.7, 0.5], [0.4, 0.75], [0.8, 0.25]];

/** Die Welt mit den Zutaten laufender Events (rein und deterministisch; die gespeicherte Welt bleibt unverändert). */
export function withEvents(world: WorldDef, keys: readonly string[]): WorldDef {
  let w = world;
  for (const key of keys) {
    if (!isSeasonKey(key)) continue;
    const t = SEASON_TEMPLATES[key];
    const m = w.map;
    if (m.theme === "inside") continue;
    // Objekte verstreuen: nur freie Kacheln, nicht direkt am Start
    const solid = solidOfMap(m);
    const rand = rngOf(hash(`${world.slug}:${key}`));
    const extra = [...m.stamps];
    const target = Math.round((m.cols * m.rows) / 60);
    for (let tries = 0, placed = 0; tries < target * 40 && placed < target; tries++) {
      const id = t.stamps[Math.floor(rand() * t.stamps.length)];
      const d = STAMPS[id] as StampDef;
      const f = d.solid ?? [0, 0, d.w, d.h];
      const x = 2 + Math.floor(rand() * Math.max(1, m.cols - 4 - d.w));
      const y = 2 + Math.floor(rand() * Math.max(1, m.rows - 4 - d.h));
      if (Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) < 5) continue;
      let ok = true;
      for (let j = -1; j <= f[3] && ok; j++) for (let k = -1; k <= f[2] && ok; k++) { const cx = x + f[0] + k, cy = y + f[1] + j; if (cx < 0 || cy < 0 || cx >= m.cols || cy >= m.rows || solid[cy]?.[cx]) ok = false; }
      if (!ok) continue;
      for (let j = 0; j < f[3]; j++) for (let k = 0; k < f[2]; k++) solid[y + f[1] + j][x + f[0] + k] = true;
      extra.push({ id, x, y });
      placed++;
    }
    w = { ...w, map: { ...w.map, stamps: extra } };
    // Event-Monster
    w = placeSpots(w, t.monsters.map((id, i) => [id, SPOTS[i % SPOTS.length][0], SPOTS[i % SPOTS.length][1]] as [string, number, number]), `ev${key}`);
  }
  return w;
}
