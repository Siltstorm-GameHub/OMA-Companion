// ============================================
// /dnd — Weltkarte / Charaktererstellung-Gate
// ============================================
// Noch kein dndCreatedAt auf der eigenen Community-Karte → Auswürfel-Flow
// (CharacterCreation). Danach: Weltkarte (WorldMap, Client-Polling).

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import DndHome from "@/components/dnd/DndHome";
import CharacterCreation from "@/components/dnd/CharacterCreation";
import DndMigrationBanner from "@/components/dnd/DndMigrationBanner";

export const metadata = { title: "D&D-Welt | OMA" };

export default async function DndPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Fdnd");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  const card = user?.discordId
    ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } })
    : null;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="font-battle text-lg text-white">D&D-Welt</h1>
        <p className="text-xs text-gray-500">Deine Community-Karte ist dein Charakter — reise, erlebe Story-Ereignisse, erfülle Quests.</p>
      </div>

      {!card?.dndCreatedAt ? (
        <>
          <DndMigrationBanner hasCharacter={false} />
          <CharacterCreation mode="create" />
        </>
      ) : (
        <DndHome myCardId={card.id} rerollCredits={card.dndRerollCredits} />
      )}
    </div>
  );
}
