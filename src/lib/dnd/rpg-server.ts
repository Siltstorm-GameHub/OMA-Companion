// ============================================
// OMA Quest — Rollenspiel-Logik (Server): Charakterbogen, Proben, Entscheidungen, Belohnungen, Händler, Chronik
// ============================================
// Alles, was Werte verändert (XP, Gold, Gegenstände, Ereignisse), läuft hier auf dem Server — der Client zeigt
// nur an. Der Server kennt die Welt (feste oder Editor-Welt) und prüft, ob der angeklickte Dialog dem Charakter
// gerade wirklich angeboten wird, würfelt selbst und merkt sich jede Entscheidung als Ereignis (Flag).

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { pickTalks, talkQuest } from "../te-map/engine";
import { allActorsOf } from "../te-map/interior";
import { terrainAt } from "./hex/world";
import { ABILITIES, abilityMod, biomeOfTerrain, weatherFor, weatherModifier, berlinHour, isNight, levelOf, levelProgress, resolveCheck, xpForLevel, type Ability, type RollResult } from "../te-map/rpg";
import type { Outcome } from "../te-map/types";
import { logChronicle } from "./chronicle";
import { getItem, isItemKey, sellPrice, type ItemDef } from "./items";
import { resolveWorld } from "./custom-worlds";
import { advanceWorldQuestStep, getWorldQuestSteps } from "./quests";

// ── Charakterbogen ──────────────────────────────────────────

export interface InventoryEntry { key: string; qty: number; equipped: boolean; item: ItemDef }
export interface CharacterSheet {
  name: string;
  level: number;
  xp: number;
  xpForThisLevel: number;
  xpForNextLevel: number;
  progress: number;
  gold: number;
  abilities: { key: Ability; score: number; mod: number; equipment: number }[];
  inventory: InventoryEntry[];
  flags: string[];
}

const flagsOf = (card: Pick<Card, "dndFlags">): string[] => (Array.isArray(card.dndFlags) ? (card.dndFlags as unknown[]).filter((f): f is string => typeof f === "string") : []);

export async function getInventory(cardId: string): Promise<InventoryEntry[]> {
  const rows = await prisma.dndInventoryItem.findMany({ where: { cardId }, orderBy: { itemKey: "asc" } });
  return rows.flatMap((r) => {
    const item = getItem(r.itemKey);
    return item ? [{ key: r.itemKey, qty: r.qty, equipped: r.equipped, item }] : [];
  });
}

export function equipmentBonus(inv: InventoryEntry[], ability: Ability): number {
  return inv.reduce((sum, e) => sum + (e.equipped && e.item.bonus?.ability === ability ? e.item.bonus.value : 0), 0);
}

export async function getCharacterSheet(card: Card): Promise<CharacterSheet> {
  const inventory = await getInventory(card.id);
  const scores = (card.abilityScores ?? {}) as Partial<Record<Ability, number>>;
  const level = levelOf(card.dndXp);
  return {
    name: card.name, level, xp: card.dndXp,
    xpForThisLevel: xpForLevel(level), xpForNextLevel: xpForLevel(level + 1), progress: levelProgress(card.dndXp),
    gold: card.dndGold,
    abilities: ABILITIES.map((key) => {
      const score = typeof scores[key] === "number" ? (scores[key] as number) : 10;
      return { key, score, mod: abilityMod(score), equipment: equipmentBonus(inventory, key) };
    }),
    inventory, flags: flagsOf(card),
  };
}

// ── Belohnungen ─────────────────────────────────────────────

export interface Granted { xp: number; gold: number; items: string[]; levelUp: number | null }

/** XP, Gold, Gegenstände und Ereignisse gutschreiben; meldet Stufenaufstiege in der Chronik. */
export async function grantRewards(card: Pick<Card, "id" | "name" | "dndXp" | "dndFlags">, o: { xp?: number; gold?: number; items?: string[]; flags?: string[] }, locationSlug?: string): Promise<Granted> {
  const xp = Math.max(0, Math.min(500, Math.round(o.xp ?? 0)));
  const gold = Math.max(0, Math.min(5000, Math.round(o.gold ?? 0)));
  const items = (o.items ?? []).filter(isItemKey).slice(0, 5);
  const flags = [...new Set([...flagsOf(card), ...(o.flags ?? [])])].slice(-400);
  const before = levelOf(card.dndXp);
  await prisma.card.update({
    where: { id: card.id },
    data: {
      ...(xp ? { dndXp: { increment: xp } } : {}),
      ...(gold ? { dndGold: { increment: gold } } : {}),
      ...(o.flags?.length ? { dndFlags: flags } : {}),
    },
  });
  for (const key of items) {
    await prisma.dndInventoryItem.upsert({ where: { cardId_itemKey: { cardId: card.id, itemKey: key } }, create: { cardId: card.id, itemKey: key }, update: { qty: { increment: 1 } } });
  }
  const after = levelOf(card.dndXp + xp);
  if (after > before) await logChronicle("level", `${card.name} hat Stufe ${after} erreicht.`, locationSlug);
  return { xp, gold, items, levelUp: after > before ? after : null };
}

// ── Entscheidungen und Proben ───────────────────────────────

export interface ChoiceResponse {
  lines: string[];
  roll?: RollResult;
  flags: string[];
  questSteps: Record<string, number>;
  granted: Granted;
  /** Namen der erhaltenen Gegenstände für Hinweise */
  itemNames: string[];
}

/** Antwort eines Dialogs auswerten: prüft, dass der Dialog angeboten wird, würfelt, wendet das Ergebnis an. */
export async function resolveChoice(
  card: Card,
  locationSlug: string,
  actorId: string,
  talkIndex: number,
  choiceIndex: number,
): Promise<ChoiceResponse | { error: string }> {
  const world = await resolveWorld(locationSlug);
  const actor = world ? allActorsOf(world.map).find((a) => a.id === actorId) : undefined;
  const talk = actor?.talk[talkIndex];
  const choice = talk?.choices?.[choiceIndex];
  if (!world || !actor || !talk || !choice) return { error: "Diese Antwort gibt es nicht." };

  const flags = flagsOf(card);
  const steps = await getWorldQuestSteps(card.id, locationSlug);
  // Wetter am Ort (gleiche Formel wie im Client)
  const locRow = await prisma.dndLocation.findUnique({ where: { slug: locationSlug }, select: { hexCol: true, hexRow: true } });
  const biome = world.map.theme === "cave" ? "cave" : biomeOfTerrain(locRow ? terrainAt({ col: locRow.hexCol, row: locRow.hexRow }) : null);
  const weather = weatherFor(locationSlug, biome);
  const offered = pickTalks(actor, steps, world, { flags: new Set(flags), night: isNight(berlinHour()), weather });
  if (!offered.includes(talk)) return { error: "Dieser Dialog gilt gerade nicht." };

  const claim = `c:${locationSlug}:${actorId}:${talkIndex}:${choiceIndex}`;
  if (flags.includes(claim)) return { lines: ["Darüber hast du dich bereits entschieden."], flags: [], questSteps: steps, granted: { xp: 0, gold: 0, items: [], levelUp: null }, itemNames: [] };

  // Wurf
  let roll: RollResult | undefined;
  let outcome: Outcome = choice.success;
  let final = true;
  if (choice.check) {
    const inv = await getInventory(card.id);
    const scores = (card.abilityScores ?? {}) as Partial<Record<Ability, number>>;
    roll = resolveCheck({
      ability: choice.check.ability, dc: choice.check.dc,
      score: typeof scores[choice.check.ability] === "number" ? (scores[choice.check.ability] as number) : 10,
      level: levelOf(card.dndXp), equipmentBonus: equipmentBonus(inv, choice.check.ability) + weatherModifier(weather, choice.check.ability),
    });
    if (!roll.success) {
      outcome = choice.fail ?? { lines: ["Es misslingt."] };
      final = !choice.check.retry;
    }
  }

  const newFlags = [...(final ? [claim] : []), ...(outcome.flags ?? [])];
  const granted = await grantRewards(card, { xp: outcome.xp, gold: outcome.gold, items: outcome.items, flags: newFlags }, locationSlug);

  // Quest-Fortschritt über das Ergebnis (gilt für die Quest/den Schritt des Dialogs)
  let questSteps = steps;
  if (outcome.advance && typeof talk.step === "number") {
    await advanceWorldQuestStep(card.id, locationSlug, talkQuest(world, talk), talk.step);
    questSteps = await getWorldQuestSteps(card.id, locationSlug);
  }

  return { lines: outcome.lines, roll, flags: newFlags, questSteps, granted, itemNames: granted.items.map((k) => getItem(k)?.name ?? k) };
}

// ── Händler und Rucksack ────────────────────────────────────

export async function tradeItem(card: Card, locationSlug: string, actorId: string, itemKey: string, action: "buy" | "sell"): Promise<{ ok: true; gold: number } | { error: string }> {
  const item = getItem(itemKey);
  if (!item) return { error: "Unbekannter Gegenstand" };
  const world = await resolveWorld(locationSlug);
  const merchant = world ? allActorsOf(world.map).find((a) => a.id === actorId && a.kind === "merchant") : undefined;
  if (!merchant) return { error: "Hier gibt es keinen Händler." };

  if (action === "buy") {
    if (!merchant.shop?.includes(itemKey)) return { error: "Der Händler führt das nicht." };
    // Gold atomar abbuchen: nur wenn genug da ist
    const paid = await prisma.card.updateMany({ where: { id: card.id, dndGold: { gte: item.price } }, data: { dndGold: { decrement: item.price } } });
    if (!paid.count) return { error: "Nicht genug Gold." };
    await prisma.dndInventoryItem.upsert({ where: { cardId_itemKey: { cardId: card.id, itemKey } }, create: { cardId: card.id, itemKey }, update: { qty: { increment: 1 } } });
  } else {
    const row = await prisma.dndInventoryItem.findUnique({ where: { cardId_itemKey: { cardId: card.id, itemKey } } });
    if (!row || row.qty < 1) return { error: "Das hast du nicht." };
    if (row.qty === 1) await prisma.dndInventoryItem.delete({ where: { id: row.id } });
    else await prisma.dndInventoryItem.update({ where: { id: row.id }, data: { qty: { decrement: 1 } } });
    await prisma.card.update({ where: { id: card.id }, data: { dndGold: { increment: sellPrice(item) } } });
  }
  const fresh = await prisma.card.findUnique({ where: { id: card.id }, select: { dndGold: true } });
  return { ok: true, gold: fresh?.dndGold ?? 0 };
}

/** Ausrüsten/Ablegen: je Platz (Waffe/Rüstung/Schmuck) ist ein Gegenstand aktiv. */
export async function setEquipped(cardId: string, itemKey: string, equipped: boolean): Promise<{ ok: true } | { error: string }> {
  const item = getItem(itemKey);
  if (!item || item.slot === "loot") return { error: "Das lässt sich nicht ausrüsten." };
  const row = await prisma.dndInventoryItem.findUnique({ where: { cardId_itemKey: { cardId, itemKey } } });
  if (!row) return { error: "Das hast du nicht." };
  if (equipped) {
    const sameSlot = (await getInventory(cardId)).filter((e) => e.item.slot === item.slot && e.key !== itemKey).map((e) => e.key);
    if (sameSlot.length) await prisma.dndInventoryItem.updateMany({ where: { cardId, itemKey: { in: sameSlot } }, data: { equipped: false } });
  }
  await prisma.dndInventoryItem.update({ where: { id: row.id }, data: { equipped } });
  return { ok: true };
}

