import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import { getWorld } from "@/lib/te-map/worlds";

export const dynamic = "force-dynamic";

/** Admin-Überblick: alle Locations (feste und Community) und alle Quests, dazu gelöschte feste Inhalte. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed || !access.isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const [locations, worlds, quests, removed, present] = await Promise.all([
    prisma.dndLocation.findMany({ orderBy: { order: "asc" } }),
    prisma.dndCustomWorld.findMany({ select: { id: true, slug: true, status: true, author: { select: { name: true, username: true } } } }),
    prisma.dndQuest.findMany({ orderBy: [{ objectiveType: "asc" }, { title: "asc" }], include: { location: { select: { slug: true, name: true } } } }),
    prisma.dndRemovedContent.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.card.groupBy({ by: ["currentLocationId"], where: { currentLocationId: { not: null } }, _count: { _all: true } }),
  ]);
  const worldBySlug = new Map(worlds.map((w) => [w.slug, w]));
  const presentById = new Map(present.map((p) => [p.currentLocationId, p._count._all]));

  return NextResponse.json({
    locations: locations.map((l) => {
      const w = worldBySlug.get(l.slug);
      return {
        id: l.id, slug: l.slug, name: l.name, locationType: l.locationType, hexCol: l.hexCol, hexRow: l.hexRow,
        fixed: !!getWorld(l.slug), players: presentById.get(l.id) ?? 0,
        editedWorldId: w?.id ?? null,
        author: w && !getWorld(l.slug) ? (w.author.username ?? w.author.name ?? null) : null,
      };
    }),
    quests: quests.map((q) => ({
      id: q.id, slug: q.slug, title: q.title, description: q.description, objectiveType: q.objectiveType, targetCount: q.targetCount,
      xpReward: q.xpReward, coinReward: q.coinReward, location: q.location, isWorldQuest: q.objectiveType === "WORLD_STEP",
    })),
    removed: removed.map((r) => ({ kind: r.kind, slug: r.slug })),
  });
}
