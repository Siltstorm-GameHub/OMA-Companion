import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HeroAccessoriesAdminClient from "./HeroAccessoriesAdminClient";

export default async function AdminHeroAccessoriesPage() {
  await requireRole("admin");

  const items = await prisma.heroAccessory.findMany({ orderBy: { createdAt: "desc" } });

  const clientItems = items.map(i => ({
    id:        i.id,
    name:      i.name,
    slot:      i.slot,
    imageUrl:  i.imageUrl,
    width:     i.width,
    height:    i.height,
    createdAt: i.createdAt.toISOString(),
  }));

  return <HeroAccessoriesAdminClient items={clientItems} />;
}
