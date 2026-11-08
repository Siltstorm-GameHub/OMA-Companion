// ============================================
// Kosmetik-Shop — Kaufen, Ausrüsten, Aussehen anderer User laden
// ============================================

import { prisma } from "@/lib/prisma";
import { COIN_PREFIX } from "@/lib/points";
import {
  CATEGORY_ORDER, COSMETICS, getCosmetic, getCosmeticOf, parseEquipped, resolveLook, reputationTitlesFor,
  type CosmeticCategory, type EquippedCosmetics, type UserLook,
} from "./catalog";
import { getCosmeticsConfig, priceItem } from "./config";

export class CosmeticError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Alle Artikel-IDs, die der User ausrüsten darf: gekauft + per Ansehen freigeschaltet. */
async function getUnlockedIds(userId: string, reputationPeakLevel: number): Promise<Set<string>> {
  const owned = await prisma.userCosmetic.findMany({ where: { userId }, select: { itemId: true } });
  const ids = new Set(owned.map(o => o.itemId).filter(id => !!getCosmetic(id)));
  for (const t of reputationTitlesFor(reputationPeakLevel)) ids.add(t.id);
  return ids;
}

export interface ShopState {
  balance: number;
  owned: string[];
  equipped: EquippedCosmetics;
  look: UserLook;
  reputationPeakLevel: number;
  items: { id: string; price: number | null; enabled: boolean }[];
}

export async function getShopState(userId: string): Promise<ShopState> {
  const [user, config] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, equippedCosmeticsJson: true, reputationPeakLevel: true },
    }),
    getCosmeticsConfig(),
  ]);
  if (!user) throw new CosmeticError("Nutzer nicht gefunden", 404);
  const unlocked = await getUnlockedIds(userId, user.reputationPeakLevel);
  const equipped = parseEquipped(user.equippedCosmeticsJson);
  return {
    balance: user.points,
    owned: [...unlocked],
    equipped,
    look: resolveLook(equipped, user.reputationPeakLevel),
    reputationPeakLevel: user.reputationPeakLevel,
    items: COSMETICS.map(item => {
      const p = priceItem(item, config);
      return { id: item.id, price: p.price, enabled: p.enabled };
    }),
  };
}

/** Kauft einen Artikel. Abbuchung atomar (nur wenn genug Münzen da sind). */
export async function purchaseCosmetic(userId: string, itemId: string): Promise<{ balance: number }> {
  const item = getCosmetic(itemId);
  if (!item) throw new CosmeticError("Artikel nicht gefunden", 404);
  const { price, enabled } = priceItem(item, await getCosmeticsConfig());
  if (price === null) throw new CosmeticError("Dieser Artikel kann nicht gekauft werden", 400);
  if (!enabled) throw new CosmeticError("Dieser Artikel ist zurzeit nicht im Angebot", 409);

  try {
    return await prisma.$transaction(async tx => {
      const already = await tx.userCosmetic.findUnique({ where: { userId_itemId: { userId, itemId } } });
      if (already) throw new CosmeticError("Du besitzt diesen Artikel bereits", 409);

      if (price > 0) {
        const debit = await tx.user.updateMany({
          where: { id: userId, points: { gte: price } },
          data: { points: { decrement: price } },
        });
        if (debit.count === 0) throw new CosmeticError("Nicht genug Münzen", 400);
        await tx.pointTransaction.create({
          data: { userId, amount: -price, reason: `${COIN_PREFIX} 🛍️ Shop: ${item.name}` },
        });
      }
      await tx.userCosmetic.create({ data: { userId, itemId, pricePaid: price } });
      const u = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
      return { balance: u?.points ?? 0 };
    });
  } catch (err) {
    // Doppelklick: zweiter Kauf scheitert am Unique-Index → wie "bereits im Besitz"
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      throw new CosmeticError("Du besitzt diesen Artikel bereits", 409);
    }
    throw err;
  }
}

/** Rüstet einen Artikel aus (itemId) oder legt die Kategorie ab (null). */
export async function equipCosmetic(userId: string, category: CosmeticCategory, itemId: string | null): Promise<EquippedCosmetics> {
  if (!CATEGORY_ORDER.includes(category)) throw new CosmeticError("Unbekannte Kategorie", 400);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { equippedCosmeticsJson: true, reputationPeakLevel: true },
  });
  if (!user) throw new CosmeticError("Nutzer nicht gefunden", 404);

  if (itemId !== null) {
    if (!getCosmeticOf(itemId, category)) throw new CosmeticError("Artikel passt nicht zu dieser Kategorie", 400);
    const unlocked = await getUnlockedIds(userId, user.reputationPeakLevel);
    if (!unlocked.has(itemId)) throw new CosmeticError("Du besitzt diesen Artikel nicht", 403);
  }

  const equipped = parseEquipped(user.equippedCosmeticsJson);
  equipped[category] = itemId;
  await prisma.user.update({ where: { id: userId }, data: { equippedCosmeticsJson: JSON.stringify(equipped) } });
  return equipped;
}

/** Sichtbares Aussehen vieler User auf einmal (Avatar-Rahmen/Aura, Name, Titel). */
export async function getUserLooks(userIds: string[]): Promise<Record<string, UserLook>> {
  const ids = [...new Set(userIds)].slice(0, 200);
  if (ids.length === 0) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, equippedCosmeticsJson: true, reputationPeakLevel: true },
  });
  const out: Record<string, UserLook> = {};
  for (const u of users) out[u.id] = resolveLook(parseEquipped(u.equippedCosmeticsJson), u.reputationPeakLevel);
  return out;
}

export async function getUserLook(userId: string): Promise<UserLook> {
  return (await getUserLooks([userId]))[userId] ?? {};
}
