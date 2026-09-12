import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HeroBasePosesAdminClient from "./HeroBasePosesAdminClient";

export default async function AdminHeroBasePosesPage() {
  await requireRole("admin");

  const [items, slots, accessories] = await Promise.all([
    prisma.heroBasePose.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.heroPoseSlot.findMany(),
    prisma.heroAccessory.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const clientItems = items.map(i => ({
    id:        i.id,
    classKey:  i.classKey,
    poseKey:   i.poseKey,
    name:      i.name,
    imageUrl:  i.imageUrl,
    width:     i.width,
    height:    i.height,
    createdAt: i.createdAt.toISOString(),
  }));

  const clientSlots = slots.map(s => ({
    id: s.id, basePoseId: s.basePoseId, slot: s.slot,
    anchorX: s.anchorX, anchorY: s.anchorY, rotation: s.rotation,
  }));

  const clientAccessories = accessories.map(a => ({
    id: a.id, name: a.name, slot: a.slot, imageUrl: a.imageUrl, width: a.width, height: a.height,
  }));

  return <HeroBasePosesAdminClient items={clientItems} slots={clientSlots} accessories={clientAccessories} />;
}
