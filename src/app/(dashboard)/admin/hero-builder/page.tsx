import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HeroBuilderAdminClient from "./HeroBuilderAdminClient";

export default async function AdminHeroBuilderPage() {
  await requireRole("admin");

  const [basePoses, poseSlots, accessories] = await Promise.all([
    prisma.heroBasePose.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.heroPoseSlot.findMany(),
    prisma.heroAccessory.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const clientBasePoses = basePoses.map(i => ({
    id:        i.id,
    classKey:  i.classKey,
    poseKey:   i.poseKey,
    name:      i.name,
    imageUrl:  i.imageUrl,
    width:     i.width,
    height:    i.height,
    createdAt: i.createdAt.toISOString(),
  }));

  const clientPoseSlots = poseSlots.map(s => ({
    id: s.id, basePoseId: s.basePoseId, slot: s.slot,
    anchorX: s.anchorX, anchorY: s.anchorY, rotation: s.rotation,
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
      basePoses={clientBasePoses}
      poseSlots={clientPoseSlots}
      accessories={clientAccessories}
    />
  );
}
