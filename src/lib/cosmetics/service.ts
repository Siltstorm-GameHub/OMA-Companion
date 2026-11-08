// ============================================
// Kosmetik-Shop — Kaufen (einzeln & Sets), Ausrüsten, Freischaltungen, Aussehen anderer User
// ============================================

import { prisma } from "@/lib/prisma";
import { COIN_PREFIX } from "@/lib/points";
import {
  CATEGORY_ORDER, COSMETIC_SETS, getCosmetic, getCosmeticOf, getSet, parseEquipped, resolveLook,
  reputationTitlesFor, rewardItemsFor,
  type CosmeticCategory, type EquippedCosmetics, type RewardKey, type UserLook,
} from "./catalog";
import { getAvailability, type ItemAvailability } from "./config";

export class CosmeticError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const VETERAN_DAYS = 365;
const CLIP_MONTH_PREFIX = `${COIN_PREFIX} Clip des Monats – `;
const CLIP_YEAR_PREFIX = `${COIN_PREFIX} Clip des Jahres – `;

/**
 * Welche Belohnungen der User erreicht hat — live aus den Daten abgeleitet (keine eigene Tabelle):
 * Pokale (Turnier/Eventreihe), Gewinner-Buchungen der Clip-Abstimmungen, Kontoalter, Spenden.
 */
export async function getRewardKeys(userId: string): Promise<Set<RewardKey>> {
  const [user, pokale, seriesPokale, clipMonth, clipYear, donations] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.pokal.count({ where: { userId } }),
    prisma.pokal.count({ where: { userId, isSeries: true } }),
    prisma.pointTransaction.findFirst({ where: { userId, amount: { gt: 0 }, reason: { startsWith: CLIP_MONTH_PREFIX } }, select: { id: true } }),
    prisma.pointTransaction.findFirst({ where: { userId, amount: { gt: 0 }, reason: { startsWith: CLIP_YEAR_PREFIX } }, select: { id: true } }),
    prisma.donation.count({ where: { userId } }),
  ]);
  const keys = new Set<RewardKey>();
  if (pokale > 0) keys.add("tournament_win");
  if (seriesPokale > 0) keys.add("series_win");
  if (clipMonth) keys.add("clip_month");
  if (clipYear) keys.add("clip_year");
  if (donations > 0) keys.add("donor");
  if (user && Date.now() - user.createdAt.getTime() >= VETERAN_DAYS * 86_400_000) keys.add("veteran");
  return keys;
}

/** Alle Artikel-IDs, die der User ausrüsten darf: gekauft + per Ansehen oder Belohnung freigeschaltet. */
async function getUnlockedIds(userId: string, reputationPeakLevel: number): Promise<Set<string>> {
  const [owned, rewards] = await Promise.all([
    prisma.userCosmetic.findMany({ where: { userId }, select: { itemId: true } }),
    getRewardKeys(userId),
  ]);
  const ids = new Set(owned.map(o => o.itemId).filter(id => !!getCosmetic(id)));
  for (const t of reputationTitlesFor(reputationPeakLevel)) ids.add(t.id);
  for (const c of rewardItemsFor(rewards)) ids.add(c.id);
  return ids;
}

export interface ShopSetState {
  id: string;
  /** Noch fehlende Artikel */
  missing: string[];
  /** Summe der fehlenden Artikel zum aktuellen Preis */
  fullPrice: number;
  /** Preis mit Set-Rabatt */
  price: number;
  buyable: boolean;
}

export interface ShopState {
  balance: number;
  owned: string[];
  equipped: EquippedCosmetics;
  look: UserLook;
  reputationPeakLevel: number;
  items: ItemAvailability[];
  sets: ShopSetState[];
  /** Ende der aktuellen Angebotswoche (ISO) */
  weekEndsAt: string | null;
}

function computeSetState(setId: string, owned: Set<string>, avail: Map<string, ItemAvailability>): ShopSetState | null {
  const set = getSet(setId);
  if (!set) return null;
  const missing = set.items.filter(id => !owned.has(id));
  const fullPrice = missing.reduce((s, id) => s + (avail.get(id)?.price ?? 0), 0);
  const buyable = missing.length > 0 && missing.every(id => avail.get(id)?.buyable);
  // Rabatt nur, wenn mehr als ein Artikel fehlt — sonst ist es ein Einzelkauf
  const discount = missing.length > 1 ? set.discountPct : 0;
  return { id: set.id, missing, fullPrice, price: Math.round(fullPrice * (100 - discount) / 100), buyable };
}

export async function getShopState(userId: string): Promise<ShopState> {
  const [user, avail] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, equippedCosmeticsJson: true, reputationPeakLevel: true },
    }),
    getAvailability(),
  ]);
  if (!user) throw new CosmeticError("Nutzer nicht gefunden", 404);
  const unlocked = await getUnlockedIds(userId, user.reputationPeakLevel);
  const equipped = parseEquipped(user.equippedCosmeticsJson);
  const items = [...avail.values()];
  return {
    balance: user.points,
    owned: [...unlocked],
    equipped,
    look: resolveLook(equipped, user.reputationPeakLevel),
    reputationPeakLevel: user.reputationPeakLevel,
    items,
    sets: COSMETIC_SETS.map(s => computeSetState(s.id, unlocked, avail)).filter((s): s is ShopSetState => !!s),
    weekEndsAt: items.find(i => i.tag === "offer" || i.tag === "exclusive")?.until ?? null,
  };
}

function isUniqueViolation(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
}

/** Kauft einen Artikel zum aktuellen Preis (inkl. Wochenrabatt). Abbuchung atomar. */
export async function purchaseCosmetic(userId: string, itemId: string): Promise<{ balance: number }> {
  const item = getCosmetic(itemId);
  if (!item) throw new CosmeticError("Artikel nicht gefunden", 404);
  const a = (await getAvailability()).get(itemId);
  if (!a || a.price === null) throw new CosmeticError("Dieser Artikel kann nicht gekauft werden", 400);
  if (!a.buyable) throw new CosmeticError("Dieser Artikel ist zurzeit nicht im Angebot", 409);
  const price = a.price;
  const label = a.discountPct ? `${item.name} (−${a.discountPct} %)` : item.name;

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
          data: { userId, amount: -price, reason: `${COIN_PREFIX} 🛍️ Shop: ${label}` },
        });
      }
      await tx.userCosmetic.create({ data: { userId, itemId, pricePaid: price } });
      const u = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
      return { balance: u?.points ?? 0 };
    });
  } catch (err) {
    // Doppelklick: zweiter Kauf scheitert am Unique-Index → wie "bereits im Besitz"
    if (isUniqueViolation(err)) throw new CosmeticError("Du besitzt diesen Artikel bereits", 409);
    throw err;
  }
}

/** Kauft alle noch fehlenden Artikel eines Sets mit Set-Rabatt und rüstet sie aus. */
export async function purchaseSet(userId: string, setId: string): Promise<{ balance: number; bought: string[]; equipped: EquippedCosmetics }> {
  const set = getSet(setId);
  if (!set) throw new CosmeticError("Set nicht gefunden", 404);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { reputationPeakLevel: true } });
  if (!user) throw new CosmeticError("Nutzer nicht gefunden", 404);
  const [avail, unlocked] = await Promise.all([getAvailability(), getUnlockedIds(userId, user.reputationPeakLevel)]);
  const state = computeSetState(setId, unlocked, avail);
  if (!state || state.missing.length === 0) throw new CosmeticError("Du besitzt bereits alle Artikel dieses Sets", 409);
  if (!state.buyable) throw new CosmeticError("Nicht alle Artikel dieses Sets sind gerade kaufbar", 409);

  // Gezahlten Preis anteilig auf die Artikel verteilen (für die Kauf-Statistik im Admin)
  const shares = state.missing.map(id => (state.fullPrice > 0 ? Math.round((avail.get(id)?.price ?? 0) * state.price / state.fullPrice) : 0));

  try {
    const result = await prisma.$transaction(async tx => {
      if (state.price > 0) {
        const debit = await tx.user.updateMany({
          where: { id: userId, points: { gte: state.price } },
          data: { points: { decrement: state.price } },
        });
        if (debit.count === 0) throw new CosmeticError("Nicht genug Münzen", 400);
        await tx.pointTransaction.create({
          data: { userId, amount: -state.price, reason: `${COIN_PREFIX} 🛍️ Shop-Set: ${set.name}` },
        });
      }
      await tx.userCosmetic.createMany({
        data: state.missing.map((itemId, i) => ({ userId, itemId, pricePaid: shares[i] })),
      });
      const u = await tx.user.findUnique({ where: { id: userId }, select: { points: true, equippedCosmeticsJson: true } });

      // Ganzes Set anlegen (je Kategorie der erste Set-Artikel)
      const equipped = parseEquipped(u?.equippedCosmeticsJson);
      const seen = new Set<CosmeticCategory>();
      for (const id of set.items) {
        const c = getCosmetic(id);
        if (!c || seen.has(c.category)) continue;
        seen.add(c.category);
        equipped[c.category] = id;
      }
      await tx.user.update({ where: { id: userId }, data: { equippedCosmeticsJson: JSON.stringify(equipped) } });
      return { balance: u?.points ?? 0, bought: state.missing, equipped };
    });
    return result;
  } catch (err) {
    if (isUniqueViolation(err)) throw new CosmeticError("Einen Artikel dieses Sets besitzt du schon — lade den Shop neu", 409);
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
