import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { TacticCardsAdmin } from "./TacticCardsAdmin";

export default async function AdminTacticCardsPage() {
  await requireRole("admin");

  const cards = await prisma.tacticCard.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, flavorText: true, description: true, imageUrl: true, triggerCondition: true },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">
          🃏 OMA Duels — Taktik-Karten (Items &amp; Fallen)
        </h2>
        <p className="text-xs text-gray-600">
          Name, Flavor-Text, Beschreibung und Artwork bearbeiten. Effekte/Trigger-Bedingungen kommen aus dem
          Content-Seed (prisma/battle-cards-tactic-seed-data.ts) und sind hier nicht editierbar.
        </p>
      </div>
      <TacticCardsAdmin
        cards={cards.map((c) => ({ ...c, triggerCondition: c.triggerCondition as { type: string } | null }))}
      />
    </div>
  );
}
