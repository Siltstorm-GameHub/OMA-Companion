import { prisma } from "./prisma";

export const RARITY_CONFIG = {
  common:    { label: "Gewöhnlich", color: "text-gray-400",   border: "border-gray-500/20",   bg: "from-gray-500/5",    glow: "",                                             stars: 1 },
  rare:      { label: "Selten",     color: "text-blue-400",   border: "border-blue-500/25",   bg: "from-blue-500/8",    glow: "shadow-[0_0_20px_rgba(59,130,246,0.12)]",      stars: 2 },
  epic:      { label: "Episch",     color: "text-purple-400", border: "border-purple-500/30", bg: "from-purple-500/10", glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",      stars: 3 },
  legendary: { label: "Legendär",   color: "text-amber-400",  border: "border-amber-500/35",  bg: "from-amber-500/12",  glow: "shadow-[0_0_24px_rgba(251,191,36,0.2)]",       stars: 4 },
} as const;

export type Rarity = keyof typeof RARITY_CONFIG;

export const MAX_SHOWCASE = 5;

/** Kauft ein Collectible-Item für den User. */
export async function purchaseCollectible(userId: string, collectibleItemId: string) {
  const [user, item] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
    prisma.collectibleItem.findUnique({ where: { id: collectibleItemId }, include: { collection: { select: { active: true } } } }),
  ]);

  if (!user || !item)                         return { error: "Item nicht gefunden" };
  if (!item.collection.active)                return { error: "Sammlung nicht verfügbar" };
  if (user.points < item.price)               return { error: "Nicht genug Münzen" };
  if (item.stock !== null && item.stock <= 0) return { error: "Ausverkauft" };

  // Doppelkauf verhindern
  const existing = await prisma.userCollectible.findUnique({
    where: { userId_collectibleItemId: { userId, collectibleItemId } },
  });
  if (existing) return { error: "Bereits in deiner Sammlung" };

  await prisma.$transaction([
    prisma.userCollectible.create({ data: { userId, collectibleItemId } }),
    prisma.user.update({ where: { id: userId }, data: { points: { decrement: item.price } } }),
    prisma.pointTransaction.create({ data: { userId, amount: -item.price, reason: `Sammlung: ${item.name} gekauft` } }),
    ...(item.stock !== null
      ? [prisma.collectibleItem.update({ where: { id: collectibleItemId }, data: { stock: { decrement: 1 } } })]
      : []),
  ]);

  return { ok: true, item };
}

/** Setzt die Showcase-Slots des Users (max. 5 Item-IDs, alle müssen dem User gehören). */
export async function updateShowcase(userId: string, itemIds: string[]) {
  if (itemIds.length > MAX_SHOWCASE) return { error: `Maximal ${MAX_SHOWCASE} Figuren erlaubt` };

  if (itemIds.length > 0) {
    const owned = await prisma.userCollectible.findMany({
      where: { userId, collectibleItemId: { in: itemIds } },
      select: { collectibleItemId: true },
    });
    const ownedSet = new Set(owned.map(o => o.collectibleItemId));
    if (!itemIds.every(id => ownedSet.has(id))) return { error: "Du besitzt nicht alle ausgewählten Items" };
  }

  await prisma.user.update({
    where: { id: userId },
    data:  { showcaseJson: JSON.stringify(itemIds) },
  });

  return { ok: true };
}
