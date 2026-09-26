// ============================================
// Karten-Anpassungen freischalten (Server): Besitz prüfen, Münzen abbuchen
// ============================================

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { levelOf } from "../te-map/rpg";
import { CARD_BGS, TE_CATALOG, sanitizeTeConfig, type CardBg, type TeCharacterConfig } from "../te-character";
import { BG_SOURCE, GATED_CATEGORIES, ITEM_SOURCE, sourceOf, unlockState, type CardUnlockKind, type UnlockState } from "../te-character/card-catalog";

const ownedOf = (card: Pick<Card, "cardUnlocks">): string[] =>
  Array.isArray(card.cardUnlocks) ? (card.cardUnlocks as unknown[]).filter((v): v is string => typeof v === "string") : [];

const heroLevelOf = (card: Pick<Card, "dndCreatedAt" | "dndXp">): number => (card.dndCreatedAt ? levelOf(card.dndXp) : 0);

/** Zustand aller Hintergründe für diese Karte (Schlüssel im Besitz: "bg:<Name>"). */
export function bgStatesOf(card: Pick<Card, "cardUnlocks" | "dndCreatedAt" | "dndXp">): Record<CardBg, UnlockState> {
  const owned = ownedOf(card);
  const lvl = heroLevelOf(card);
  return Object.fromEntries(CARD_BGS.map((b) => [b, unlockState(BG_SOURCE[b], owned.includes(`bg:${b}`), lvl)])) as Record<CardBg, UnlockState>;
}

/** Kennung „Ebene:Teil“ des gewählten Teils einer gesperrten Ebene (oder null). */
export function itemKeyOf(config: Pick<TeCharacterConfig, "layers"> | null | undefined, cat: string): string | null {
  const v = config?.layers[cat];
  const id = v ? TE_CATALOG.categories.find((c) => c.id === cat)?.items.find((i) => i.variants.includes(v))?.id : undefined;
  return id ? `${cat}:${id}` : null;
}

/** Zustand aller gesperrten Teile. Was der User heute schon trägt (gespeicherte Figur), gilt als frei — nichts wird nachträglich weggenommen. */
export function itemStatesOf(card: Pick<Card, "cardUnlocks" | "dndCreatedAt" | "dndXp" | "teCharacter">): Record<string, UnlockState> {
  const owned = ownedOf(card);
  const lvl = heroLevelOf(card);
  const saved = sanitizeTeConfig(card.teCharacter);
  const worn = new Set(GATED_CATEGORIES.map((c) => itemKeyOf(saved, c)).filter((k): k is string => !!k));
  return Object.fromEntries(Object.entries(ITEM_SOURCE).map(([k, src]) => [k, unlockState(src, owned.includes(`item:${k}`) || worn.has(k), lvl)]));
}

/** Darf diese Figur so gespeichert werden? Bereits gewählte Stücke bleiben erlaubt (nichts wird nachträglich weggenommen). */
export function checkUnlocked(card: Card, next: TeCharacterConfig, previous: TeCharacterConfig | null): string | null {
  if (next.bg && next.bg !== previous?.bg && !bgStatesOf(card)[next.bg]?.ok) return "Diesen Hintergrund hast du noch nicht freigeschaltet.";
  const items = itemStatesOf(card);
  for (const cat of GATED_CATEGORIES) {
    const k = itemKeyOf(next, cat);
    if (k && items[k] && !items[k].ok) return "Dieses Teil hast du noch nicht freigeschaltet.";
  }
  return null;
}

/** Ein Stück für Münzen kaufen (atomar abbuchen, dann als Besitz eintragen). */
export async function buyUnlock(userId: string, card: Card, kind: CardUnlockKind, key: string): Promise<{ ok: true; coins: number } | { error: string }> {
  const source = sourceOf(kind, key);
  if (!source) return { error: "Unbekanntes Stück." };
  if (source.kind !== "coins") return { error: source.kind === "free" ? "Das ist ohnehin frei." : `Das schaltest du im Spiel frei (ab Stufe ${source.level}).` };
  const id = `${kind}:${key}`;
  if (ownedOf(card).includes(id)) return { error: "Schon gekauft." };
  const debit = await prisma.user.updateMany({ where: { id: userId, points: { gte: source.price } }, data: { points: { decrement: source.price } } });
  if (!debit.count) return { error: "Nicht genug Münzen" };
  await prisma.pointTransaction.create({ data: { userId, amount: -source.price, reason: `Karten-Anpassung: ${id}` } });
  await prisma.card.update({ where: { id: card.id }, data: { cardUnlocks: [...ownedOf(card), id] } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  return { ok: true, coins: user?.points ?? 0 };
}
