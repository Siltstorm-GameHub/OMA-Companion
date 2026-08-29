import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { CommunityCardsAdmin } from "./CommunityCardsAdmin";

export default async function AdminCommunityCardsPage() {
  await requireRole("admin");

  const cards = await prisma.card.findMany({
    where: { rarity: "COMMUNITY" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, flavorText: true, imageUrl: true },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">
          🎴 Community-Karten — Untertitel & Beschreibung
        </h2>
        <p className="text-xs text-gray-600">
          Bleibt leer, solange nichts eingetragen wurde. Mitglieder können ihre eigene Karte auch selbst
          bearbeiten (/battle-cards/my-card).
        </p>
      </div>
      <CommunityCardsAdmin cards={cards} />
    </div>
  );
}
