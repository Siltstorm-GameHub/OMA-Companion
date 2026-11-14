/**
 * GameSwipe-Benachrichtigungen — nur serverseitig, täglich vom Cron cron/game-discover aufgerufen.
 *
 *  - "game_drop":      einmal pro Woche und Mitglied, sobald der Drop der Woche offene Karten hat.
 *  - "game_new_cards": wer GameSwipe schon benutzt, bekommt einen Hinweis, wenn seit dem letzten Besuch
 *                      mindestens NEW_CARDS_MIN neue Karten dazugekommen sind — höchstens alle
 *                      NOTIFY_GAP_DAYS Tage (auch nicht kurz nach dem Drop-Hinweis).
 *
 * Kanäle, Texte und Discord-Kanal steuern die Regeln in /admin/notifications. Wer Spieleliste-Hinweise im
 * Profil abgeschaltet hat (PREF_KEY.game), bekommt nichts — auch keine Discord-DM.
 */

import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { PREF_KEY } from "@/lib/notifications";
import { countNewCards, type PlanInput, type WeeklyDrop } from "./deck-plan";
import { dropInfoOf, loadDeckContext, planFor } from "./deck";

export const NEW_CARDS_MIN = 6;
export const NOTIFY_GAP_DAYS = 4;
const DAY = 86_400_000;

/** Soll ein Mitglied auf neue Karten hingewiesen werden? Rein, siehe Tests. */
export function shouldNotifyNewCards(
  state: { seenAt: Date | null; notifiedAt: Date | null } | null, newCards: number, now: Date,
): boolean {
  if (newCards < NEW_CARDS_MIN) return false;
  if (state?.notifiedAt && now.getTime() - state.notifiedAt.getTime() < NOTIFY_GAP_DAYS * DAY) return false;
  return true;
}

/** Ab wann Karten für ein Mitglied als "neu" zählen: letzter Besuch bzw. letzter Hinweis, sonst eine Woche. */
export function newCardsSince(state: { seenAt: Date | null; notifiedAt: Date | null } | null, now: Date): Date {
  const times = [state?.seenAt, state?.notifiedAt].filter((d): d is Date => !!d).map(d => d.getTime());
  return new Date(times.length ? Math.max(...times) : now.getTime() - 7 * DAY);
}

function dropGameNames(drop: WeeklyDrop, names: Map<string, string>): string {
  const list = drop.items.map(i => (i.kind === "game" ? names.get(i.gameId) : i.item.name)).filter(Boolean) as string[];
  return list.length > 4 ? `${list.slice(0, 4).join(", ")} und ${list.length - 4} weitere` : list.join(", ");
}

export async function notifySwipeUsers(opts: { dropCreated?: boolean } = {}): Promise<{ drop: number; newCards: number }> {
  const ctx = await loadDeckContext();
  const now = ctx.now;
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, notificationPrefs: true, gameSwipeState: true },
  });
  const eligible = users.filter(u => {
    try { return JSON.parse(u.notificationPrefs || "{}")[PREF_KEY.game] !== false; } catch { return true; }
  });
  if (eligible.length === 0) return { drop: 0, newCards: 0 };
  const ids = eligible.map(u => u.id);

  const [reactions, steamSwipes, igdbSwipes] = await Promise.all([
    prisma.gameReaction.findMany({
      where: { userId: { in: ids }, OR: [{ status: { not: null } }, { owns: true }, { wantPlay: true }, { firstDecidedAt: { not: null } }] },
      select: { userId: true, gameId: true, status: true, owns: true, wantPlay: true, decidedAt: true, firstDecidedAt: true },
    }),
    prisma.steamSwipe.findMany({ where: { userId: { in: ids } }, select: { userId: true, steamAppId: true } }),
    prisma.igdbSwipe.findMany({ where: { userId: { in: ids } }, select: { userId: true, igdbId: true } }),
  ]);
  const group = <T extends { userId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      if (!m.has(r.userId)) m.set(r.userId, []);
      m.get(r.userId)!.push(r);
    }
    return m;
  };
  const reactionsBy = group(reactions);
  const steamBy = group(steamSwipes);
  const igdbBy = group(igdbSwipes);

  const dropUsers: string[] = [];
  const newCardsUsers = new Map<number, string[]>();
  for (const u of eligible) {
    const mine = reactionsBy.get(u.id) ?? [];
    const plan = planFor(ctx, {
      reactions: mine as PlanInput["reactions"],
      steamSwiped: new Set((steamBy.get(u.id) ?? []).map(s => s.steamAppId)),
      igdbSwiped: new Set((igdbBy.get(u.id) ?? []).map(s => s.igdbId)),
    });
    const state = u.gameSwipeState;
    const drop = dropInfoOf(ctx.drop, plan, now);
    if (drop && drop.open > 0 && state?.dropNotifiedWeek !== drop.week) {
      dropUsers.push(u.id);
      continue;
    }
    const usesSwipe = !!state?.seenAt || mine.some(r => r.firstDecidedAt);
    if (!usesSwipe) continue;
    const n = countNewCards(plan, newCardsSince(state, now));
    if (!shouldNotifyNewCards(state, n, now)) continue;
    // In Stufen bündeln (eine Nachricht je Anzahl), damit nicht jede Zahl einzeln verschickt wird
    const shown = n >= 20 ? 20 : n >= 10 ? 10 : n;
    if (!newCardsUsers.has(shown)) newCardsUsers.set(shown, []);
    newCardsUsers.get(shown)!.push(u.id);
  }

  if (dropUsers.length > 0 && ctx.drop) {
    const names = new Map(ctx.games.map(g => [g.id, g.name]));
    await dispatchNotification("game_drop", {
      users: dropUsers,
      placeholders: { "{count}": String(ctx.drop.items.length), "{games}": dropGameNames(ctx.drop, names) },
      urlOverride: "/spiele",
      // Kanal-Post nur einmal: an dem Tag, an dem der Drop entsteht
      skipDiscordChannel: !opts.dropCreated,
    });
    await markNotified(dropUsers, now, ctx.drop.week);
  }
  let newCardsTotal = 0;
  for (const [count, userIds] of newCardsUsers) {
    await dispatchNotification("game_new_cards", {
      users: userIds,
      placeholders: { "{count}": count >= 10 ? `${count}+` : String(count) },
      urlOverride: "/spiele",
      skipDiscordChannel: true,
    });
    await markNotified(userIds, now);
    newCardsTotal += userIds.length;
  }
  return { drop: dropUsers.length, newCards: newCardsTotal };
}

async function markNotified(userIds: string[], now: Date, dropWeek?: string) {
  const data = { notifiedAt: now, ...(dropWeek ? { dropNotifiedWeek: dropWeek } : {}) };
  const existing = new Set(
    (await prisma.gameSwipeState.findMany({ where: { userId: { in: userIds } }, select: { userId: true } })).map(s => s.userId),
  );
  const missing = userIds.filter(id => !existing.has(id));
  if (missing.length > 0) await prisma.gameSwipeState.createMany({ data: missing.map(userId => ({ userId, ...data })), skipDuplicates: true });
  if (existing.size > 0) await prisma.gameSwipeState.updateMany({ where: { userId: { in: [...existing] } }, data });
}
