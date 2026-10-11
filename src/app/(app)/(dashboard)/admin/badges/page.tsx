import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import BadgesAdminClient from "./BadgesAdminClient";

export default async function AdminBadgesPage() {
  await requireRole("admin");

  const [badges, users] = await Promise.all([
    prisma.customBadge.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        awards: { select: { userId: true } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const clientBadges = badges.map(b => ({
    id:        b.id,
    icon:      b.icon,
    name:      b.name,
    desc:      b.desc,
    category:  b.category,
    coins:     b.coins,
    createdAt: b.createdAt.toISOString(),
    awardCount: b.awards.length,
  }));

  const clientUsers = users.map(u => ({
    id:       u.id,
    name:     u.name,
    username: u.username,
    image:    u.image,
  }));

  return <BadgesAdminClient badges={clientBadges} users={clientUsers} />;
}
