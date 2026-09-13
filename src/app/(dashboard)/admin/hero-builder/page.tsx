import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HeroBuilderAdminClient from "./HeroBuilderAdminClient";

export default async function AdminHeroBuilderPage() {
  await requireRole("admin");

  const [archetypes, basePoses, poseSlots, accessories] = await Promise.all([
    prisma.heroArchetype.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.heroBasePose.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.heroPoseSlot.findMany(),
    prisma.heroAccessory.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const clientArchetypes = archetypes.map(a => ({
    id: a.id, classKey: a.classKey, name: a.name, createdAt: a.createdAt.toISOString(),
  }));

  const clientBasePoses = basePoses.map(i => ({
    id:          i.id,
    archetypeId: i.archetypeId,
    poseKey:     i.poseKey,
    name:        i.name,
    imageUrl:    i.imageUrl,
    width:       i.width,
    height:      i.height,
    createdAt:   i.createdAt.toISOString(),
  }));

  const clientPoseSlots = poseSlots.map(s => ({
    id: s.id, basePoseId: s.basePoseId, slot: s.slot,
    anchorX: s.anchorX, anchorY: s.anchorY, rotation: s.rotation, scale: s.scale,
  }));

  const clientAccessories = accessories.map(i => ({
    id:        i.id,
    name:      i.name,
    slot:      i.slot,
    imageUrl:  i.imageUrl,
    width:     i.width,
    height:    i.height,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <HeroBuilderAdminClient
      archetypes={clientArchetypes}
      basePoses={clientBasePoses}
      poseSlots={clientPoseSlots}
      accessories={clientAccessories}
    />
  );
}
