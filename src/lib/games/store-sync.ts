/**
 * Täglicher Abgleich mit den Stores (nur serverseitig): Steam-Preise/Rabatte und Game-Pass-Katalog.
 * Wer ein Spiel mit "Würde ich zocken" markiert hat, wird benachrichtigt, sobald es reduziert ist.
 */

import { prisma } from "@/lib/prisma";
import { createNotificationForUsers, PREF_KEY } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { parseFieldSources, type SteamPrice } from "./draft";
import { fetchGamePassCatalog } from "./gamepass";
import { gameKeys } from "./match";
import { AUTO_SUBSCRIPTIONS, GAME_SUBSCRIPTIONS, formatPrice, type GameSubscription } from "./options";
import { fetchSteamPrices } from "./steam";

// ── Preise ───────────────────────────────────────────────────────────────────

export interface PriceUpdate {
  priceCents: number | null;
  priceInitialCents: number | null;
  discountPercent: number;
  priceCurrency: string | null;
  saleStartedAt: Date | null;
  /** Angebot hat gerade begonnen (vorher kein Rabatt) */
  saleStarted: boolean;
}

/** Neuer Preisstand eines Spiels (rein — siehe Tests). */
export function nextPriceState(
  prev: { discountPercent: number; saleStartedAt: Date | null },
  price: SteamPrice | null,
  now = new Date(),
): PriceUpdate {
  const discount = price?.discountPercent ?? 0;
  const onSale = discount > 0;
  const saleStarted = onSale && prev.discountPercent === 0;
  return {
    priceCents: price?.priceCents ?? null,
    priceInitialCents: price?.priceInitialCents ?? null,
    discountPercent: discount,
    priceCurrency: price?.currency ?? null,
    saleStartedAt: onSale ? (saleStarted ? now : prev.saleStartedAt ?? now) : null,
    saleStarted,
  };
}

/** Steam-Preise aller Spiele mit Steam-ID aktualisieren; neue Angebote melden. */
export async function syncSteamPrices(): Promise<{ checked: number; updated: number; newSales: number }> {
  const games = await prisma.game.findMany({
    where: { steamAppId: { not: null }, status: { not: "HIDDEN" } },
    select: {
      id: true, slug: true, name: true, status: true, steamAppId: true, discountPercent: true, saleStartedAt: true, priceCents: true,
      isFree: true, fieldSources: true,
    },
  });
  if (games.length === 0) return { checked: 0, updated: 0, newSales: 0 };

  const prices = await fetchSteamPrices(games.map(g => g.steamAppId!));
  const now = new Date();
  let updated = 0;
  const sales: { id: string; slug: string; name: string; update: PriceUpdate }[] = [];

  for (const g of games) {
    if (!prices.has(g.steamAppId!)) continue; // Steam hat dazu nichts geliefert → alten Stand behalten
    const update = nextPriceState(g, prices.get(g.steamAppId!) ?? null, now);
    const { saleStarted, ...data } = update;
    if (data.priceCents !== g.priceCents || data.discountPercent !== g.discountPercent || saleStarted) updated++;
    // Hat das Spiel einen Kaufpreis, ist es nicht (mehr) kostenlos — außer ein Mensch hat das so eingetragen
    const fixFree = (data.priceCents ?? 0) > 0 && g.isFree === true && parseFieldSources(g.fieldSources).isFree !== "user";
    await prisma.game.update({ where: { id: g.id }, data: { ...data, priceUpdatedAt: now, ...(fixFree ? { isFree: false } : {}) } });
    if (saleStarted && g.status === "APPROVED") sales.push({ id: g.id, slug: g.slug, name: g.name, update });
  }

  for (const sale of sales) await notifySale(sale);
  return { checked: games.length, updated, newSales: sales.length };
}

async function notifySale(sale: { id: string; slug: string; name: string; update: PriceUpdate }) {
  const wanters = await prisma.gameReaction.findMany({
    where: { gameId: sale.id, wantPlay: true, user: { deletedAt: null } },
    select: { userId: true },
  });
  const userIds = wanters.map(w => w.userId);
  if (userIds.length === 0) return;

  const { update } = sale;
  const now = formatPrice(update.priceCents, update.priceCurrency);
  const before = formatPrice(update.priceInitialCents, update.priceCurrency);
  const title = `${sale.name} ist im Angebot (−${update.discountPercent} %)`;
  const body = now && before ? `Jetzt ${now} statt ${before} auf Steam.` : "Gerade reduziert auf Steam.";
  const url = `/spiele/${sale.slug}`;

  await createNotificationForUsers(userIds, { type: "game", title, body, url });
  // Push nur an alle, die Spieleliste-Hinweise nicht abgeschaltet haben
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, notificationPrefs: true } });
  const eligible = users.filter(u => {
    try { return JSON.parse(u.notificationPrefs || "{}")[PREF_KEY.game] !== false; } catch { return true; }
  }).map(u => u.id);
  await sendPushToUsers(eligible, { title, body, url }).catch(err => console.error("[games] Push", err));
}

// ── Abos ─────────────────────────────────────────────────────────────────────

/**
 * Neue Abo-Liste eines Spiels: automatisch gepflegte Abos (nur die erfolgreich geladenen) werden
 * ersetzt, alle übrigen bleiben wie vom Team eingetragen. Reihenfolge wie GAME_SUBSCRIPTIONS.
 */
export function nextSubscriptions(current: string[], found: Set<GameSubscription>, loaded: Set<GameSubscription>): string[] {
  const keep = current.filter(s => !(AUTO_SUBSCRIPTIONS as string[]).includes(s) || !loaded.has(s as GameSubscription));
  const next = new Set([...keep, ...[...found].filter(s => loaded.has(s))]);
  const order = Object.keys(GAME_SUBSCRIPTIONS);
  return [...next].filter(s => s in GAME_SUBSCRIPTIONS).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Game-Pass-Kennzeichnung aller Spiele aktualisieren (Abgleich über Namen und andere Schreibweisen). */
export async function syncGamePass(): Promise<{ loaded: string[]; matched: number; changed: number }> {
  const catalog = await fetchGamePassCatalog();
  if (catalog.loaded.size === 0) throw new Error("Game-Pass-Katalog nicht erreichbar");

  const games = await prisma.game.findMany({ select: { id: true, nameKey: true, aliases: true, subscriptions: true } });
  let matched = 0;
  let changed = 0;
  for (const g of games) {
    const found = new Set<GameSubscription>();
    for (const key of gameKeys(g)) for (const s of catalog.byKey.get(key) ?? []) found.add(s);
    if (found.size > 0) matched++;
    const next = nextSubscriptions(g.subscriptions, found, catalog.loaded);
    if (next.join(",") !== g.subscriptions.join(",")) {
      changed++;
      await prisma.game.update({ where: { id: g.id }, data: { subscriptions: next } });
    }
  }
  return { loaded: [...catalog.loaded], matched, changed };
}

/** Beides nacheinander; ein Ausfall des einen Stores verhindert den anderen Abgleich nicht. */
export async function syncStores() {
  const [prices, gamePass] = await Promise.allSettled([syncSteamPrices(), syncGamePass()]);
  return {
    prices: prices.status === "fulfilled" ? prices.value : { error: String(prices.reason) },
    gamePass: gamePass.status === "fulfilled" ? gamePass.value : { error: String(gamePass.reason) },
  };
}
