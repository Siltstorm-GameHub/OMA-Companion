import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import HeroBuilderClient from "@/components/battle-cards/HeroBuilderClient";

export const metadata = {
  title: "Helden-Baukasten | OMA Battle Cards",
};

export default async function HeroBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards/hero-builder");
  }

  const [archetypes, accessories, loadout] = await Promise.all([
    prisma.heroArchetype.findMany({
      orderBy: { createdAt: "asc" },
      include: { basePoses: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.heroAccessory.findMany({ where: { slot: "weapon" }, orderBy: { createdAt: "asc" } }),
    prisma.userHeroLoadout.findUnique({
      where: { userId: session.user.id },
      include: { equipment: { select: { slot: true, accessoryId: true } } },
    }),
  ]);

  // Für den Baukasten zählt pro Archetyp nur die "idle"-Pose (Vorschau/
  // Kartenkunst) -- die anderen Posen (z.B. Kampf, Sieg) sind spätere
  // Kontext-Darstellungen, keine User-Auswahl.
  const clientArchetypes = archetypes
    .map(a => {
      const pose = a.basePoses.find(p => p.poseKey === "idle") ?? a.basePoses[0];
      if (!pose) return null;
      return {
        id: a.id,
        name: a.name,
        basePose: { id: pose.id, imageUrl: pose.imageUrl, width: pose.width, height: pose.height },
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const clientAccessories = accessories.map(a => ({
    id: a.id, name: a.name, slot: a.slot, imageUrl: a.imageUrl, width: a.width, height: a.height,
  }));

  const clientLoadout = loadout
    ? {
        archetypeId: loadout.archetypeId,
        equipment: Object.fromEntries(loadout.equipment.map(e => [e.slot, e.accessoryId])),
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Helden-Baukasten</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Wähle einen Archetyp und deine Ausrüstung — du kannst beides jederzeit wieder ändern.
        </p>
      </div>
      <HeroBuilderClient archetypes={clientArchetypes} accessories={clientAccessories} initialLoadout={clientLoadout} />
    </div>
  );
}
