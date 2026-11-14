/**
 * GameSwipe: Reihenfolge des Stapels — rein (kein Prisma, kein Netzwerk), siehe deck-plan.test.ts.
 * Die Daten lädt lib/games/deck.ts; dieselbe Planung zählt auch offene/neue Karten für Home und
 * die Benachrichtigungen (swipe-notify.ts).
 *
 * Reihenfolge:
 *  1. Drop der Woche (drop.ts) — offene Karten zuerst
 *  2. Eigene Karten: Event in den nächsten 30 Tagen → Hinweise (gratis, neu im Abo, im Angebot) →
 *     beliebt → neu in der Liste → erneut fragen. Dazwischen jede STEAM_EVERY-te Karte eine
 *     Entdecken-Karte (Spiel, das noch nicht in der Liste steht).
 *
 * Hinweis-Karten kommen auch zu Spielen, die man schon entschieden hat: Wer "Würde ich holen" gesagt
 * hat, bekommt das Spiel erneut, sobald es danach reduziert, gratis oder in einem Abo ist.
 */

import type { GameFields } from "./draft";
import { gameNameKey } from "./slug";
import { effectiveStatus, interleaveDeck, shouldReask, type SwipeStatus } from "./swipe";

/** Ab so viel Rabatt gilt ein Spiel als Angebots-Karte */
export const SALE_MIN_PERCENT = 20;
/** So lange gilt ein Spiel nach dem Hinzukommen in ein Abo als "neu im Abo" */
export const SUBSCRIPTION_NEW_DAYS = 21;

const DAY = 24 * 60 * 60_000;

// ── Entdecken-Karten (Spiele außerhalb der Liste) ───────────────────────────────

export type DiscoverSource = "free" | "subscription" | "upcoming" | "steam_new" | "steam_top";

export const DISCOVER_SOURCES: DiscoverSource[] = ["free", "subscription", "upcoming", "steam_new", "steam_top"];

export interface DiscoverItem extends Omit<GameFields, "tags"> {
  source: DiscoverSource;
  steamAppId: number | null;
  igdbId: number | null;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  /** Erscheinungstag (nur "Erscheint bald"), ISO */
  releaseDate: string | null;
  priceCents: number | null;
  priceInitialCents: number | null;
  discountPercent: number;
  priceCurrency: string | null;
  /** Gratis-Aktion: bis wann (ISO, null = unbekannt) und wo */
  freeUntil: string | null;
  store: "epic" | "steam" | null;
  storeUrl: string | null;
  /** Abo-Schlüssel (GAME_SUBSCRIPTIONS), nur "Neu im Abo" */
  subscriptions: string[];
  /** Seit wann die Karte im Feed ist (ISO) — für "neue Karten" */
  addedAt: string;
}

/** Eindeutiger Schlüssel einer Entdecken-Karte (Steam-ID vor IGDB-ID) */
export function discoverKey(i: { steamAppId: number | null; igdbId: number | null }): string | null {
  if (i.steamAppId) return `s:${i.steamAppId}`;
  if (i.igdbId) return `i:${i.igdbId}`;
  return null;
}

// ── Drop der Woche ──────────────────────────────────────────────────────────────

export type DropItem =
  | { kind: "game"; gameId: string; tip: { by: string | null; note: string | null } | null }
  | { kind: "discover"; item: DiscoverItem };

export interface WeeklyDrop {
  /** ISO-Woche (Europe/Berlin), z.B. "2026-W47" */
  week: string;
  startsAt: string;
  endsAt: string;
  items: DropItem[];
  /** Schlüssel (plannedKey-Form) des Drops der Vorwoche — kommen nicht direkt wieder */
  previousKeys?: string[];
}

// ── Planung ─────────────────────────────────────────────────────────────────────

export interface PlanGame {
  id: string;
  nameKey: string;
  aliases: string[];
  steamAppId: number | null;
  igdbId: number | null;
  createdAt: Date;
  inCount: number;
  wishCount: number;
  ratingCount: number;
  discountPercent: number;
  saleStartedAt: Date | null;
  subscriptions: string[];
  subscriptionsAddedAt: Date | null;
}

export interface PlanReaction {
  gameId: string;
  status: string | null;
  owns?: boolean;
  wantPlay?: boolean;
  decidedAt: Date | null;
}

export interface PlanInput {
  now: Date;
  /** Freigeschaltete Spiele der Liste */
  games: PlanGame[];
  /** Spiel-ID → Beginn des nächsten Events (nur die nächsten 30 Tage) */
  nextEventAt: Map<string, Date>;
  /** Spiele, bei denen jemand aus den eigenen Squads am Start ist (Sortierung der Angebote) */
  squadIn?: Set<string>;
  /** Alle Entdecken-Feeds (Reihenfolge innerhalb einer Quelle = Priorität) */
  discover: DiscoverItem[];
  drop: WeeklyDrop | null;
  reactions: PlanReaction[];
  steamSwiped: Set<number>;
  igdbSwiped: Set<number>;
}

export type GameReason = "event" | "free" | "subscription" | "sale" | "popular" | "new" | "recheck";

export type PlannedCard =
  | {
      kind: "game";
      gameId: string;
      reason: GameReason;
      /** Ab wann die Karte "neu" ist (null = zählt nicht als neu) */
      since: Date | null;
      drop: boolean;
      tip: { by: string | null; note: string | null } | null;
      /** Passende Gratis-Aktion (nur reason "free") */
      promo: DiscoverItem | null;
    }
  | { kind: "discover"; item: DiscoverItem; since: Date | null; drop: boolean };

export function plannedKey(c: PlannedCard): string {
  return c.kind === "game" ? `g:${c.gameId}` : `d:${discoverKey(c.item)}`;
}

/** Reihum aus mehreren Listen ziehen — jede Quelle taucht früh auf. */
export function roundRobin<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/** Zu welchem Listen-Spiel gehört eine Entdecken-Karte (Steam-ID, IGDB-ID oder Name)? */
export function makeGameFinder(games: PlanGame[]) {
  const bySteam = new Map<number, PlanGame>();
  const byIgdb = new Map<number, PlanGame>();
  const byKey = new Map<string, PlanGame>();
  for (const g of games) {
    if (g.steamAppId) bySteam.set(g.steamAppId, g);
    if (g.igdbId) byIgdb.set(g.igdbId, g);
    byKey.set(g.nameKey, g);
    for (const a of g.aliases) {
      const k = gameNameKey(a);
      if (k && !byKey.has(k)) byKey.set(k, g);
    }
  }
  return (i: { steamAppId: number | null; igdbId: number | null; name: string }): PlanGame | null =>
    (i.steamAppId ? bySteam.get(i.steamAppId) : undefined)
    ?? (i.igdbId ? byIgdb.get(i.igdbId) : undefined)
    ?? byKey.get(gameNameKey(i.name))
    ?? null;
}

interface Highlight { reason: "free" | "subscription" | "sale"; since: Date; promo: DiscoverItem | null }

/** Hinweis zu einem Listen-Spiel: gratis > neu im Abo > im Angebot. Nur für Unentschiedene oder wer
 *  "Würde ich holen" schon VOR dem Anlass gesagt hat (danach entschieden = schon gesehen). */
export function highlightOf(
  g: PlanGame, status: SwipeStatus | null, decidedAt: Date | null, freePromo: DiscoverItem | null, now: Date,
): Highlight | null {
  const eligible = (since: Date) => status === null || (status === "wish" && (!decidedAt || decidedAt < since));
  if (freePromo) {
    const since = new Date(freePromo.addedAt);
    const stillFree = !freePromo.freeUntil || new Date(freePromo.freeUntil) > now;
    if (stillFree && eligible(since)) return { reason: "free", since, promo: freePromo };
  }
  if (g.subscriptions.length > 0 && g.subscriptionsAddedAt && now.getTime() - g.subscriptionsAddedAt.getTime() <= SUBSCRIPTION_NEW_DAYS * DAY) {
    if (eligible(g.subscriptionsAddedAt)) return { reason: "subscription", since: g.subscriptionsAddedAt, promo: null };
  }
  if (g.discountPercent >= SALE_MIN_PERCENT && g.saleStartedAt && eligible(g.saleStartedAt)) {
    return { reason: "sale", since: g.saleStartedAt, promo: null };
  }
  return null;
}

/** Der ganze Stapel eines Mitglieds in Reihenfolge (ohne Karten-Details). */
export function planDeck(input: PlanInput): PlannedCard[] {
  const { now, games } = input;
  const mine = new Map(input.reactions.map(r => [r.gameId, r]));
  const findGame = makeGameFinder(games);
  const squadIn = input.squadIn ?? new Set<string>();

  // Gratis-Aktionen zu Spielen, die schon in der Liste stehen
  const freeByGame = new Map<string, DiscoverItem>();
  for (const item of input.discover) {
    if (item.source !== "free") continue;
    const g = findGame(item);
    if (g && !freeByGame.has(g.id)) freeByGame.set(g.id, item);
  }

  const popularity = (g: PlanGame) => g.inCount * 2 + g.wishCount + g.ratingCount;

  interface Open { g: PlanGame; reason: GameReason; since: Date | null; promo: DiscoverItem | null }
  const openById = new Map<string, Open>();
  for (const g of games) {
    const r = mine.get(g.id);
    const status = effectiveStatus(r);
    const decidedAt = r?.decidedAt ?? null;
    const h = highlightOf(g, status, decidedAt, freeByGame.get(g.id) ?? null, now);
    if (h) {
      // Event schlägt den Hinweis in der Reihenfolge nur bei Unentschiedenen
      const reason: GameReason = status === null && input.nextEventAt.has(g.id) ? "event" : h.reason;
      openById.set(g.id, { g, reason, since: h.since, promo: reason === "free" ? h.promo : null });
      continue;
    }
    if (!shouldReask(status, decidedAt, now)) continue;
    let reason: GameReason;
    if (status !== null) reason = "recheck";
    else if (input.nextEventAt.has(g.id)) reason = "event";
    else if (popularity(g) > 0) reason = "popular";
    else reason = "new";
    openById.set(g.id, { g, reason, since: reason === "new" ? g.createdAt : null, promo: null });
  }

  // Entdecken: noch nicht in der Liste, nicht schon entschieden, ohne Dubletten über die Feeds
  const seenKeys = new Set<string>();
  const openDiscover = (item: DiscoverItem): boolean => {
    const key = discoverKey(item);
    if (!key || seenKeys.has(key)) return false;
    if (findGame(item)) return false;
    if (item.steamAppId && input.steamSwiped.has(item.steamAppId)) return false;
    if (!item.steamAppId && item.igdbId && input.igdbSwiped.has(item.igdbId)) return false;
    if (item.source === "free" && item.freeUntil && new Date(item.freeUntil) <= now) return false;
    if (item.source === "upcoming" && item.releaseDate && new Date(item.releaseDate) <= now) return false;
    return true;
  };

  const out: PlannedCard[] = [];
  const used = new Set<string>();

  // 1. Drop der Woche
  if (input.drop && new Date(input.drop.endsAt) > now) {
    const since = new Date(input.drop.startsAt);
    for (const d of input.drop.items) {
      if (d.kind === "game") {
        const o = openById.get(d.gameId);
        if (!o || used.has(`g:${d.gameId}`)) continue;
        used.add(`g:${d.gameId}`);
        out.push({ kind: "game", gameId: d.gameId, reason: o.reason, since, drop: true, tip: d.tip, promo: o.promo });
      } else {
        // Inzwischen in die Liste aufgenommen? Dann als Listen-Karte
        const g = findGame(d.item);
        if (g) {
          const o = openById.get(g.id);
          if (!o || used.has(`g:${g.id}`)) continue;
          used.add(`g:${g.id}`);
          out.push({ kind: "game", gameId: g.id, reason: o.reason, since, drop: true, tip: null, promo: o.promo });
        } else if (openDiscover(d.item)) {
          seenKeys.add(discoverKey(d.item)!);
          out.push({ kind: "discover", item: d.item, since, drop: true });
        }
      }
    }
  }

  // 2. Eigene Karten
  const bucket = (reason: GameReason) => [...openById.values()].filter(o => o.reason === reason && !used.has(`g:${o.g.id}`));
  const withEvent = bucket("event").sort((a, b) => input.nextEventAt.get(a.g.id)!.getTime() - input.nextEventAt.get(b.g.id)!.getTime());
  // Hinweise: Wunschliste zuerst, dann Squad am Start, dann beliebt
  const hintRank = (o: Open) => (effectiveStatus(mine.get(o.g.id)) === "wish" ? 2 : 0) + (squadIn.has(o.g.id) ? 1 : 0);
  const hints = [...bucket("free"), ...bucket("subscription"), ...bucket("sale")]
    .sort((a, b) => hintRank(b) - hintRank(a) || ORDER[a.reason] - ORDER[b.reason] || popularity(b.g) - popularity(a.g));
  const popular = bucket("popular").sort((a, b) => popularity(b.g) - popularity(a.g));
  const fresh = bucket("new").sort((a, b) => b.g.createdAt.getTime() - a.g.createdAt.getTime());
  const recheck = bucket("recheck");
  const own: PlannedCard[] = [...withEvent, ...hints, ...popular, ...fresh, ...recheck].map(o => ({
    kind: "game", gameId: o.g.id, reason: o.reason, since: o.since, drop: false, tip: null, promo: o.promo,
  }));

  const bySource = DISCOVER_SOURCES.map(src => input.discover.filter(i => i.source === src));
  const discover: PlannedCard[] = [];
  // Gratis zuerst (läuft ab), die übrigen Quellen reihum
  for (const item of [...bySource[0], ...roundRobin(bySource.slice(1))]) {
    if (!openDiscover(item)) continue;
    seenKeys.add(discoverKey(item)!);
    discover.push({ kind: "discover", item, since: new Date(item.addedAt), drop: false });
  }

  return [...out, ...interleaveDeck(own, discover)];
}

const ORDER: Record<GameReason, number> = { event: 0, free: 1, subscription: 2, sale: 3, popular: 4, new: 5, recheck: 6 };

/** Wie viele Karten seit `after` neu dazugekommen sind (für die Benachrichtigung). */
export function countNewCards(plan: PlannedCard[], after: Date): number {
  return plan.filter(c => c.since !== null && c.since > after).length;
}
