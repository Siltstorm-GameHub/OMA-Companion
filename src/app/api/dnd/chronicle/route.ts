import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recentChronicle } from "@/lib/dnd/chronicle";

export const dynamic = "force-dynamic";

/** „Heute im Reich": die letzten Ereignisse der Welt (Quests, Stufenaufstiege, Ansagen, neue Orte). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const rows = await recentChronicle(15);
  const slugs = [...new Set(rows.flatMap((r) => (r.locationSlug ? [r.locationSlug] : [])))];
  const locs = slugs.length ? await prisma.dndLocation.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } }) : [];
  const name = new Map(locs.map((l) => [l.slug, l.name]));
  return NextResponse.json({
    entries: rows.map((r) => ({ id: r.id, kind: r.kind, text: r.text, location: r.locationSlug ? name.get(r.locationSlug) ?? null : null, createdAt: r.createdAt })),
  });
}
