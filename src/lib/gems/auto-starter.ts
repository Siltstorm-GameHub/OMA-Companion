// ============================================
// Auto-Startpaket — Einstieg in OMA Gems ohne Helden-Einrichtung
// ============================================
// Ersetzt Helden-Setup + Start-Pack-Auswahl: Wer /gems ohne Lineup öffnet, bekommt automatisch ein
// spielbares 5er-Lineup in der Verteilung STARTER_CLASS_MIX (1 Tank, 2 Damage Dealer, 2 Supports).
// Vorhandene Karten werden zuerst genutzt (eigene Community-Karte vorn), fehlende Plätze füllen
// zufällige Standard-Karten der noch fehlenden Klassen auf, die der Spieler dabei neu erhält.
// Idempotent: Sobald ein Lineup existiert, passiert nichts mehr.

import type { CardClass, CardRarity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCommunityCard } from "@/lib/season/card-provisioning";
import { LINEUP_SIZE } from "./lineup";

/** Wunsch-Verteilung des Start-Lineups — zwei Damage Dealer, damit die ersten Kämpfe nicht
 *  zäh werden. Auch Grundlage des Balance-Simulators (scripts/simulate-campaign-balance.ts). */
export const STARTER_CLASS_MIX: [CardClass, number][] = [
  ["TANK", 1],
  ["DAMAGE_DEALER", 2],
  ["SUPPORT", 2],
];

export interface StarterOwnedCard {
  cardId: string;
  class: CardClass;
  rarity: CardRarity;
}

export interface StarterPoolCard {
  id: string;
  class: CardClass;
}

export interface StarterPlan {
  lineupCardIds: string[];
  /** Teilmenge von lineupCardIds, die der Spieler noch nicht besitzt und neu erhält. */
  grantCardIds: string[];
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Rein, damit testbar: wählt das Start-Lineup aus Besitz + Standard-Pool. */
export function planStarterLineup(
  owned: StarterOwnedCard[],
  ownCommunityCardId: string | null,
  standardPool: StarterPoolCard[],
  rng: () => number = Math.random
): StarterPlan {
  const ownedIds = new Set(owned.map((o) => o.cardId));
  // Eigene Community-Karte zuerst, dann Community vor Standard.
  const ownedSorted = [...owned].sort(
    (a, b) =>
      Number(b.cardId === ownCommunityCardId) - Number(a.cardId === ownCommunityCardId) ||
      Number(b.rarity === "COMMUNITY") - Number(a.rarity === "COMMUNITY")
  );
  const pool = shuffle(standardPool.filter((c) => !ownedIds.has(c.id)), rng);

  const lineup: { id: string; class: CardClass }[] = [];
  const grant: string[] = [];
  const taken = new Set<string>();
  const take = (id: string, cls: CardClass, isGrant: boolean) => {
    lineup.push({ id, class: cls });
    taken.add(id);
    if (isGrant) grant.push(id);
  };

  if (ownCommunityCardId) {
    const own = ownedSorted.find((o) => o.cardId === ownCommunityCardId);
    if (own) take(own.cardId, own.class, false);
  }

  // Wunsch-Verteilung auffüllen — je Klasse erst aus dem Besitz, sonst aus dem Pool.
  for (const [cls, wanted] of STARTER_CLASS_MIX) {
    while (lineup.length < LINEUP_SIZE && lineup.filter((c) => c.class === cls).length < wanted) {
      const fromOwned = ownedSorted.find((o) => o.class === cls && !taken.has(o.cardId));
      if (fromOwned) {
        take(fromOwned.cardId, cls, false);
        continue;
      }
      const fromPool = pool.find((c) => c.class === cls && !taken.has(c.id));
      if (!fromPool) break;
      take(fromPool.id, cls, true);
    }
  }

  for (const o of ownedSorted) {
    if (lineup.length >= LINEUP_SIZE) break;
    if (!taken.has(o.cardId)) take(o.cardId, o.class, false);
  }
  for (const c of pool) {
    if (lineup.length >= LINEUP_SIZE) break;
    if (!taken.has(c.id)) take(c.id, c.class, true);
  }

  return { lineupCardIds: lineup.map((c) => c.id), grantCardIds: grant };
}

/** Stellt sicher, dass der Spieler ein Lineup hat — legt bei Bedarf Karten an. */
export async function ensureGemsStarter(userId: string): Promise<void> {
  const hasLineup = await prisma.userCard.count({ where: { userId, inLineup: true } });
  if (hasLineup > 0) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true, name: true, username: true } });
  let ownCommunityCardId: string | null = null;
  if (user?.discordId) {
    // Legt die Community-Karte samt UserCard an, falls das Mitglied noch keine hat.
    const { card } = await ensureCommunityCard({
      userId,
      discordId: user.discordId,
      displayName: user.username ?? user.name ?? "Abenteurer",
    });
    ownCommunityCardId = card.id;
  }

  await prisma.$transaction(async (tx) => {
    // Serialisiert parallele Aufrufe desselben Users (z.B. Doppel-Navigation), damit nicht zwei
    // zufällige Startpakete vergeben werden.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gems-starter:${userId}`}))`;
    if ((await tx.userCard.count({ where: { userId, inLineup: true } })) > 0) return;

    const owned = await tx.userCard.findMany({
      where: { userId },
      select: { cardId: true, card: { select: { class: true, rarity: true } } },
    });
    const standardPool = await tx.card.findMany({ where: { rarity: "STANDARD" }, select: { id: true, class: true } });

    const plan = planStarterLineup(
      owned.map((o) => ({ cardId: o.cardId, class: o.card.class, rarity: o.card.rarity })),
      owned.some((o) => o.cardId === ownCommunityCardId) ? ownCommunityCardId : null,
      standardPool
    );
    if (plan.lineupCardIds.length === 0) return;

    if (plan.grantCardIds.length > 0) {
      await tx.userCard.createMany({
        data: plan.grantCardIds.map((cardId) => ({ userId, cardId })),
        skipDuplicates: true,
      });
    }
    await tx.userCard.updateMany({ where: { userId, cardId: { in: plan.lineupCardIds } }, data: { inLineup: true } });
  });
}
