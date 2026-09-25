// ============================================
// OMA Quest — Spielleiter-Ereignisse (Live): Ansage, Gruppenprobe, Beute
// ============================================
// Wer im Editor bauen darf (Community-Job oder Admin) ist Spielleiter: Er löst in einer Location (oder überall) ein
// Ereignis aus. Anwesende Spieler bekommen es live (über den Presence-Aufruf) und reagieren: bei einer Probe würfelt
// jeder einmal (Server), bei Beute bekommen die Schnellsten etwas. Alles ist zeitlich begrenzt.

import { prisma } from "../prisma";
import { resolveCheck, isAbility, type Ability, type RollResult } from "../te-map/rpg";
import { logChronicle } from "./chronicle";
import { checkParams, grantRewards } from "./rpg-server";
import { isItemKey } from "./items";
import type { Card } from "@prisma/client";

export type WorldEventKind = "announce" | "check" | "loot";

export interface WorldEventView {
  id: string;
  kind: WorldEventKind;
  title: string;
  text: string;
  authorName: string;
  everywhere: boolean;
  expiresAt: string;
  check?: { ability: Ability; dc: number };
  loot?: { gold: number; item: string | null; max: number; claimed: number };
}

const clamp = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt);

export async function createWorldEvent(
  author: { id: string; name: string },
  input: { locationSlug: string | null; kind: unknown; title: unknown; text: unknown; params?: Record<string, unknown> },
): Promise<{ ok: true; id: string } | { error: string }> {
  const kind = input.kind === "check" || input.kind === "loot" ? input.kind : input.kind === "announce" ? "announce" : null;
  if (!kind) return { error: "Unbekannte Art von Ereignis." };
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 80) : "";
  const text = typeof input.text === "string" ? input.text.trim().slice(0, 600) : "";
  if (!title) return { error: "Der Titel fehlt." };

  let params: Record<string, unknown> | undefined;
  if (kind === "check") {
    const ability = input.params?.ability;
    if (!isAbility(ability)) return { error: "Wähle ein Attribut für die Probe." };
    params = { ability, dc: clamp(input.params?.dc, 5, 25, 12) };
  } else if (kind === "loot") {
    const item = typeof input.params?.item === "string" && isItemKey(input.params.item) ? input.params.item : null;
    const gold = clamp(input.params?.gold, 0, 200, 0);
    if (!item && !gold) return { error: "Beute braucht Gold oder einen Gegenstand." };
    params = { gold, item, max: clamp(input.params?.max, 1, 20, 3) };
  }
  if (input.locationSlug && !(await prisma.dndLocation.findUnique({ where: { slug: input.locationSlug }, select: { id: true } }))) return { error: "Location nicht gefunden." };

  const minutes = kind === "announce" ? 3 : 10;
  const row = await prisma.dndWorldEvent.create({
    data: {
      locationSlug: input.locationSlug, authorId: author.id, authorName: author.name, kind, title, text,
      params: params ? JSON.parse(JSON.stringify(params)) : undefined, expiresAt: new Date(Date.now() + minutes * 60_000),
    },
  });
  await logChronicle(kind === "announce" ? "announce" : "event", `${author.name}: ${title}`, input.locationSlug);
  return { ok: true, id: row.id };
}

function toView(e: { id: string; kind: string; title: string; text: string; authorName: string; locationSlug: string | null; expiresAt: Date; params: unknown }, claimed = 0): WorldEventView {
  const p = (e.params ?? {}) as Record<string, unknown>;
  return {
    id: e.id, kind: e.kind as WorldEventKind, title: e.title, text: e.text, authorName: e.authorName,
    everywhere: e.locationSlug == null, expiresAt: e.expiresAt.toISOString(),
    ...(e.kind === "check" && isAbility(p.ability) ? { check: { ability: p.ability, dc: Number(p.dc) || 12 } } : {}),
    ...(e.kind === "loot" ? { loot: { gold: Number(p.gold) || 0, item: typeof p.item === "string" ? p.item : null, max: Number(p.max) || 1, claimed } } : {}),
  };
}

/** Aktive Ereignisse für diese Location (auch weltweite), die nach `since` ausgelöst wurden. */
export async function newEventsFor(locationSlug: string, since: Date): Promise<WorldEventView[]> {
  const rows = await prisma.dndWorldEvent.findMany({
    where: { createdAt: { gt: since }, expiresAt: { gt: new Date() }, OR: [{ locationSlug }, { locationSlug: null }] },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  if (!rows.length) return [];
  const counts = await prisma.dndWorldEventRoll.groupBy({ by: ["eventId"], where: { eventId: { in: rows.map((r) => r.id) } }, _count: { _all: true } });
  const c = new Map(counts.map((x) => [x.eventId, x._count._all]));
  return rows.map((r) => toView(r, c.get(r.id) ?? 0));
}

export interface EventResponse {
  roll?: RollResult;
  success: boolean;
  text: string;
  gold?: number;
  itemName?: string;
}

/** Ein Spieler reagiert: Probe würfeln bzw. Beute beanspruchen (je Ereignis einmal). */
export async function respondToEvent(card: Card, eventId: string): Promise<EventResponse | { error: string }> {
  const e = await prisma.dndWorldEvent.findUnique({ where: { id: eventId } });
  if (!e || e.expiresAt < new Date()) return { error: "Das Ereignis ist vorbei." };
  const here = await prisma.card.findUnique({ where: { id: card.id }, select: { travelToCol: true, currentLocation: { select: { slug: true } } } });
  if (!here || here.travelToCol != null || (e.locationSlug && here.currentLocation?.slug !== e.locationSlug)) return { error: "Du bist nicht am Ort des Ereignisses." };
  if (e.kind === "announce") return { error: "Darauf kann man nicht reagieren." };
  if (await prisma.dndWorldEventRoll.findUnique({ where: { eventId_cardId: { eventId, cardId: card.id } } })) return { error: "Du hast schon reagiert." };

  const p = (e.params ?? {}) as Record<string, unknown>;
  if (e.kind === "check" && isAbility(p.ability)) {
    const roll = resolveCheck({ ability: p.ability, dc: Number(p.dc) || 12, ...(await checkParams(card, p.ability)) });
    await prisma.dndWorldEventRoll.create({ data: { eventId, cardId: card.id, cardName: card.name, roll: roll.roll, total: roll.total, success: roll.success } });
    return { roll, success: roll.success, text: roll.success ? "Gelungen!" : "Misslungen." };
  }

  if (e.kind === "loot") {
    const max = Number(p.max) || 1;
    // Reihenfolge = Reihenfolge der Einträge; wer über dem Limit landet, geht leer aus
    const rank = await prisma.dndWorldEventRoll.count({ where: { eventId } });
    const won = rank < max;
    await prisma.dndWorldEventRoll.create({ data: { eventId, cardId: card.id, cardName: card.name, roll: 0, total: 0, success: won } });
    if (!won) return { success: false, text: "Zu spät — die Beute ist schon weg." };
    const item = typeof p.item === "string" && isItemKey(p.item) ? p.item : null;
    const gold = Number(p.gold) || 0;
    await grantRewards(card, { gold, items: item ? [item] : [] }, e.locationSlug ?? undefined);
    return { success: true, text: "Du greifst zu!", gold, ...(item ? { itemName: item } : {}) };
  }
  return { error: "Ungültiges Ereignis." };
}

/** Ergebnisliste für den Spielleiter (und alle Beteiligten). */
export async function eventResults(eventId: string) {
  const rolls = await prisma.dndWorldEventRoll.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } });
  return rolls.map((r) => ({ name: r.cardName, roll: r.roll, total: r.total, success: r.success }));
}

