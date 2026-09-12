import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HeroBasePosesAdminClient from "./HeroBasePosesAdminClient";

export default async function AdminHeroBasePosesPage() {
  await requireRole("admin");

  const items = await prisma.heroBasePose.findMany({ orderBy: { createdAt: "desc" } });

  const clientItems = items.map(i => ({
    id:        i.id,
    classKey:  i.classKey,
    name:      i.name,
    imageUrl:  i.imageUrl,
    width:     i.width,
    height:    i.height,
    createdAt: i.createdAt.toISOString(),
  }));

  return <HeroBasePosesAdminClient items={clientItems} />;
}
