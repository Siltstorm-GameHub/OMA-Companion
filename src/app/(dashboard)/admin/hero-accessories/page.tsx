import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HeroAccessoriesAdminClient from "./HeroAccessoriesAdminClient";

export default async function AdminHeroAccessoriesPage() {
  await requireRole("admin");

  const [items, basePoses] = await Promise.all([
    prisma.heroAccessory.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.heroBasePose.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const clientItems = items.map(i => ({
    id:         i.id,
    name:       i.name,
    slot:       i.slot,
    imageUrl:   i.imageUrl,
    width:      i.width,
    height:     i.height,
    basePoseId: i.basePoseId,
    anchorX:    i.anchorX,
    anchorY:    i.anchorY,
    createdAt:  i.createdAt.toISOString(),
  }));

  const clientBasePoses = basePoses.map(b => ({
    id:       b.id,
    classKey: b.classKey,
    name:     b.name,
    imageUrl: b.imageUrl,
    width:    b.width,
    height:   b.height,
  }));

  return <HeroAccessoriesAdminClient items={clientItems} basePoses={clientBasePoses} />;
}
