/**
 * GameSwipe "Drop der Woche" und Empfehlungen ("Tipps") — nur serverseitig.
 *
 * Jeden Montag (Europe/Berlin) stellt der Cron cron/game-discover einen kleinen Stapel aus bis zu
 * DROP_SIZE Karten zusammen: zuerst freigegebene Tipps (Mitglieder/Moderatoren empfehlen ein Spiel der
 * Liste, Karte zeigt "Empfohlen von …"), dann reihum je ein Spiel aus den Quellen gratis, neu im Abo,
 * erscheint bald, im Angebot, Steam-Neuheiten, neu in der Liste, Steam-Trends, beliebt. Was im Drop der
 * Vorwoche war, kommt nicht direkt wieder. Der Drop liegt in BotConfig; der Stapel zeigt ihn zuerst.
 */

import { prisma } from "@/lib/prisma";
import {
  SALE_MIN_PERCENT, SUBSCRIPTION_NEW_DAYS, discoverKey, makeGameFinder, roundRobin,
  type DiscoverItem, type DropItem, type PlanGame, type WeeklyDrop,
} from "./deck-plan";
import { berlinWeek } from "./discover-parse";
import { getDiscoverItems } from "./discover";

const DROP_KEY = "games_weekly_drop";
export const DROP_SIZE = 8;
/** Höchstens so viele Tipps je Drop */
export const DROP_MAX_TIPS = 3;
export const TIP_NOTE_MAX = 140;
/** So viele offene (ungeprüfte) Tipps darf ein Mitglied gleichzeitig haben */
export const TIP_MAX_PENDING = 3;

const DAY = 86_400_000;

export const PLAN_GAME_SELECT = {
  id: true, nameKey: true, aliases: true, steamAppId: true, igdbId: true, createdAt: true, inCount: true, wishCount: true,
  ratingCount: true, discountPercent: true, saleStartedAt: true, subscriptions: true, subscriptionsAddedAt: true,
} as const;

export async function getWeeklyDrop(): Promise<WeeklyDrop | null> {
  const row = await prisma.botConfig.findUnique({ where: { key: DROP_KEY } });
  if (!row) return null;
  try {
    const d = JSON.parse(row.value) as WeeklyDrop;
    return d && Array.isArray(d.items) ? d : null;
  } catch {
    return null;
  }
}

const nameOf = (u: { username: string | null; name: string | null } | null) => (u ? u.username ?? u.name ?? "Mitglied" : null);

/**
 * Drop für die aktuelle Woche neu zusammenstellen. rebuild=true (Moderatoren, gleiche Woche): Tipps des
 * bisherigen Drops gehen zurück in die Warteschlange und werden neu verteilt.
 */
export async function buildWeeklyDrop(now = new Date()): Promise<WeeklyDrop> {
  const week = berlinWeek(now);
  const current = await getWeeklyDrop();
  const sameWeek = current?.week === week.key;
  if (sameWeek) {
    await prisma.gameTip.updateMany({ where: { status: "used", usedWeek: week.key }, data: { status: "approved", usedWeek: null } });
  }
  const previousKeys = sameWeek ? current?.previousKeys ?? [] : current ? dropKeys(current) : [];

  const [games, discover, tips] = await Promise.all([
    prisma.game.findMany({ where: { status: "APPROVED" }, select: PLAN_GAME_SELECT }),
    getDiscoverItems(),
    prisma.gameTip.findMany({
      where: { status: "approved", game: { status: "APPROVED" } },
      orderBy: { createdAt: "asc" },
      include: { by: { select: { name: true, username: true } } },
    }),
  ]);
  const findGame = makeGameFinder(games);
  const prev = new Set(previousKeys);
  const taken = new Set<string>();
  const items: DropItem[] = [];
  const usedTipIds: string[] = [];

  const keyOf = (d: DropItem) => {
    if (d.kind === "game") return `g:${d.gameId}`;
    const g = findGame(d.item);
    return g ? `g:${g.id}` : `d:${discoverKey(d.item)}`;
  };
  const add = (d: DropItem): boolean => {
    const k = keyOf(d);
    if (taken.has(k) || prev.has(k) || items.length >= DROP_SIZE) return false;
    taken.add(k);
    items.push(d);
    return true;
  };
  // Entdecken-Karte zu einem Spiel, das schon in der Liste steht → als Listen-Spiel aufnehmen
  const fromDiscover = (item: DiscoverItem): DropItem => {
    const g = findGame(item);
    return g ? { kind: "game", gameId: g.id, tip: null } : { kind: "discover", item };
  };

  // 1. Tipps (je Spiel nur einer)
  for (const t of tips) {
    if (usedTipIds.length >= DROP_MAX_TIPS) break;
    if (add({ kind: "game", gameId: t.gameId, tip: { by: nameOf(t.by), note: t.note } })) usedTipIds.push(t.id);
  }

  // 2. Reihum aus den Quellen
  const popularity = (g: PlanGame) => g.inCount * 2 + g.wishCount + g.ratingCount;
  const listGame = (g: PlanGame): DropItem => ({ kind: "game", gameId: g.id, tip: null });
  const bySource = (src: DiscoverItem["source"]) => discover.filter(i => i.source === src).map(fromDiscover);
  const nowMs = now.getTime();
  const groups: DropItem[][] = [
    bySource("free"),
    [
      ...games
        .filter(g => g.subscriptionsAddedAt && nowMs - g.subscriptionsAddedAt.getTime() <= SUBSCRIPTION_NEW_DAYS * DAY)
        .sort((a, b) => popularity(b) - popularity(a))
        .map(listGame),
      ...bySource("subscription"),
    ],
    bySource("upcoming"),
    games
      .filter(g => g.discountPercent >= SALE_MIN_PERCENT)
      .sort((a, b) => b.wishCount + b.inCount - (a.wishCount + a.inCount) || b.discountPercent - a.discountPercent)
      .map(listGame),
    bySource("steam_new"),
    games
      .filter(g => nowMs - g.createdAt.getTime() <= 14 * DAY)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(listGame),
    bySource("steam_top"),
    [...games].sort((a, b) => popularity(b) - popularity(a)).map(listGame),
  ];
  for (const d of roundRobin(groups)) {
    if (items.length >= DROP_SIZE) break;
    add(d);
  }

  const drop: WeeklyDrop = {
    week: week.key, startsAt: week.startsAt.toISOString(), endsAt: week.endsAt.toISOString(), items, previousKeys,
  };
  const value = JSON.stringify(drop);
  await prisma.botConfig.upsert({ where: { key: DROP_KEY }, create: { key: DROP_KEY, value }, update: { value } });
  if (usedTipIds.length > 0) {
    await prisma.gameTip.updateMany({ where: { id: { in: usedTipIds } }, data: { status: "used", usedWeek: week.key } });
  }
  return drop;
}

function dropKeys(d: WeeklyDrop): string[] {
  return d.items.map(i => (i.kind === "game" ? `g:${i.gameId}` : `d:${discoverKey(i.item)}`));
}

/** Drop der aktuellen Woche — legt ihn an, wenn die Woche gewechselt hat (Cron). */
export async function ensureWeeklyDrop(now = new Date()): Promise<{ drop: WeeklyDrop; created: boolean }> {
  const current = await getWeeklyDrop();
  if (current && current.week === berlinWeek(now).key) return { drop: current, created: false };
  return { drop: await buildWeeklyDrop(now), created: true };
}

// ── Tipps ────────────────────────────────────────────────────────────────────────

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };

/** Spiel für den nächsten Drop empfehlen. Moderatoren: sofort freigegeben; Mitglieder: prüft das Team. */
export async function suggestTip(
  user: { id: string; isModerator: boolean }, slug: string, noteInput: unknown,
): Promise<Result<{ status: "approved" | "pending" }>> {
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!game || game.status !== "APPROVED") return { ok: false, status: 404, error: "Spiel nicht gefunden" };
  const note = typeof noteInput === "string" ? noteInput.replace(/\s+/g, " ").trim().slice(0, TIP_NOTE_MAX) || null : null;

  const open = await prisma.gameTip.findFirst({ where: { gameId: game.id, status: { in: ["pending", "approved"] } }, select: { byId: true, status: true } });
  if (open) {
    return { ok: false, status: 409, error: open.status === "approved" ? "Das Spiel ist schon für den nächsten Drop vorgemerkt." : "Das Spiel wurde schon empfohlen — das Team schaut drüber." };
  }
  if (!user.isModerator) {
    const pending = await prisma.gameTip.count({ where: { byId: user.id, status: "pending" } });
    if (pending >= TIP_MAX_PENDING) {
      return { ok: false, status: 429, error: `Du hast schon ${TIP_MAX_PENDING} Empfehlungen offen — warte, bis das Team sie geprüft hat.` };
    }
  }
  const status = user.isModerator ? "approved" : "pending";
  await prisma.gameTip.create({
    data: {
      gameId: game.id, byId: user.id, note, status,
      ...(user.isModerator ? { reviewedById: user.id, reviewedAt: new Date() } : {}),
    },
  });
  return { ok: true, status };
}

export async function reviewTip(tipId: string, reviewerId: string, action: unknown): Promise<Result<object>> {
  if (action !== "approve" && action !== "reject") return { ok: false, status: 400, error: "Unbekannte Aktion" };
  const tip = await prisma.gameTip.findUnique({ where: { id: tipId }, select: { status: true } });
  if (!tip) return { ok: false, status: 404, error: "Empfehlung nicht gefunden" };
  if (tip.status === "used") return { ok: false, status: 409, error: "Die Empfehlung lief schon im Drop." };
  await prisma.gameTip.update({
    where: { id: tipId },
    data: { status: action === "approve" ? "approved" : "rejected", reviewedById: reviewerId, reviewedAt: new Date() },
  });
  return { ok: true };
}

export interface AdminTip {
  id: string;
  status: string;
  note: string | null;
  by: string | null;
  usedWeek: string | null;
  createdAt: string;
  game: { slug: string; name: string; coverUrl: string | null };
}

/** Offene und freigegebene Tipps sowie die zuletzt gelaufenen (für /admin/spiele). */
export async function listTipsForAdmin(): Promise<AdminTip[]> {
  const rows = await prisma.gameTip.findMany({
    where: { OR: [{ status: { in: ["pending", "approved"] } }, { status: "used", createdAt: { gte: new Date(Date.now() - 60 * DAY) } }] },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { by: { select: { name: true, username: true } }, game: { select: { slug: true, name: true, coverUrl: true } } },
  });
  return rows.map(t => ({
    id: t.id, status: t.status, note: t.note, by: nameOf(t.by), usedWeek: t.usedWeek, createdAt: t.createdAt.toISOString(),
    game: t.game,
  }));
}
