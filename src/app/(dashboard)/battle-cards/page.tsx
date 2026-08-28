// ============================================
// /battle-cards — Hub
// ============================================
// Kein öffentlicher Karten-Katalog mehr. Verzweigt direkt:
//  - Noch kein Start-Pack gewählt → Picker (StarterPickFlow), Standard-Karten
//    sind hier NUR als Auswahlgrundlage sichtbar, nicht als Katalog.
//  - Start-Pack vorhanden → "Deine Karten": Startaufstellung zuerst, dann
//    restliche eigene Karten, darunter visuell abgetrennt alle Karten, die
//    es im Spiel gibt (inkl. aller Community-Karten), ausgegraut.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Repeat } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { countUnopenedPacks } from "@/lib/battle-cards/packs";
import { parseActiveSkill, parsePassiveSkill } from "@/lib/battle-engine/skill-schema";
import { resolveCardImageUrl } from "@/lib/battle-cards/resolve-image";
import BattleCardView from "@/components/battle-cards/BattleCardView";
import type { BattleCardData } from "@/components/battle-cards/BattleCardView";
import DuplicateProgress from "@/components/battle-cards/DuplicateProgress";
import DemoBattleLauncher from "@/components/battle-cards/DemoBattleLauncher";
import StarterPickFlow from "@/components/battle-cards/StarterPickFlow";
import PackOpener from "@/components/battle-cards/PackOpener";

export const metadata = {
  title: "Battle Cards | OMA",
};

const ACTIVITY_TIER_RANK: Record<string, number> = {
  OLD_MASTER: 5,
  LEGENDE: 4,
  GAMER: 3,
  NPC: 2,
  GHOST: 1,
};

function qualityRank(card: { rarity: string; activityTier: string | null }): number {
  if (card.rarity === "COMMUNITY") return 100 + (card.activityTier ? ACTIVITY_TIER_RANK[card.activityTier] ?? 0 : 0);
  return 0;
}

function toCardData(
  card: {
    id: string; name: string; title: string; class: BattleCardData["class"]; rarity: BattleCardData["rarity"];
    flavorText: string; baseHp: number; baseAttack: number; baseDefense: number; speed: number;
    activityTier: BattleCardData["activityTier"]; imageUrl: string | null;
    linkedDiscordId: string | null; overriddenFields: string[];
    passivePositive: unknown; passiveNegative: unknown; activeSkill: unknown; ultimateSkill: unknown;
  },
  avatarByDiscordId?: Map<string, string | null>
): BattleCardData & { id: string } {
  return {
    id: card.id,
    name: card.name,
    title: card.title,
    class: card.class,
    rarity: card.rarity,
    flavorText: card.flavorText,
    baseHp: card.baseHp,
    baseAttack: card.baseAttack,
    baseDefense: card.baseDefense,
    speed: card.speed,
    activityTier: card.activityTier,
    imageUrl: avatarByDiscordId ? resolveCardImageUrl(card, avatarByDiscordId) : card.imageUrl,
    passivePositive: parsePassiveSkill(card.passivePositive, `${card.name}.passivePositive`),
    passiveNegative: parsePassiveSkill(card.passiveNegative, `${card.name}.passiveNegative`),
    activeSkill: parseActiveSkill(card.activeSkill, `${card.name}.activeSkill`),
    ultimateSkill: parseActiveSkill(card.ultimateSkill, `${card.name}.ultimateSkill`),
  };
}

export default async function BattleCardsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards");
  }
  const userId = session.user.id;

  const ownsStarterDeck = await hasStarterDeck(userId);

  if (!ownsStarterDeck) {
    const standardCards = await prisma.card.findMany({
      where: { rarity: "STANDARD" },
      orderBy: { name: "asc" },
    });

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-lg font-black text-white">Wähle dein Start-Pack</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Zuerst je 1 Tank, 1 Support und 1 Damage Dealer — danach 2 weitere Karten nach Wahl.
          </p>
        </div>
        <StarterPickFlow cards={standardCards.map((c) => toCardData(c))} />
      </div>
    );
  }

  const ownedUserCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: true },
    orderBy: [{ inLineup: "desc" }, { acquiredAt: "asc" }],
  });
  const ownedCardIds = ownedUserCards.map((uc) => uc.cardId);

  const otherCards = await prisma.card.findMany({
    where: { id: { notIn: ownedCardIds } },
  });
  otherCards.sort((a, b) => qualityRank(b) - qualityRank(a) || a.name.localeCompare(b.name));

  // Community-Karten zeigen live das aktuelle Profilbild des verknüpften Mitglieds.
  const linkedDiscordIds = [...ownedUserCards.map((uc) => uc.card), ...otherCards]
    .filter((c) => c.rarity === "COMMUNITY" && c.linkedDiscordId)
    .map((c) => c.linkedDiscordId!);
  const avatarUsers = linkedDiscordIds.length
    ? await prisma.user.findMany({
        where: { discordId: { in: linkedDiscordIds } },
        select: { discordId: true, image: true },
      })
    : [];
  const avatarByDiscordId = new Map(avatarUsers.map((u) => [u.discordId!, u.image]));
  const unopenedPacks = await countUnopenedPacks(userId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-black text-white">Deine Karten</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Antippen, um die Skill-Details auf der Rückseite zu sehen.
          </p>
        </div>
        <Link
          href="/battle-cards/lineup"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors shrink-0"
        >
          <Repeat className="w-3.5 h-3.5" /> Startaufstellung ändern
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <DemoBattleLauncher />
        <PackOpener initialUnopenedCount={unopenedPacks} />
      </div>

      {ownedUserCards.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Karten in deiner Sammlung.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {ownedUserCards.map((uc) => (
            <div key={uc.id}>
              <BattleCardView card={{ ...toCardData(uc.card, avatarByDiscordId), level: uc.level }} />
              <DuplicateProgress rarity={uc.card.rarity} level={uc.level} duplicates={uc.duplicates} />
            </div>
          ))}
        </div>
      )}

      {otherCards.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold shrink-0">
              Alle Karten im Spiel
            </p>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {otherCards.map((card) => (
              <BattleCardView key={card.id} card={toCardData(card, avatarByDiscordId)} dimmed />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
