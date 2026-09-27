import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

/** Die eigenen veröffentlichten Quests (für den Editor: Questreihen-Namen vorschlagen, Voraussetzung aus einer anderen eigenen Location wählen). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await getBuilderAccess(session.user.id)).allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  const rows = await prisma.dndQuest.findMany({
    where: { authorId: session.user.id },
    select: { slug: true, title: true, questline: true, location: { select: { name: true } } },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({
    quests: rows.map((r) => ({ slug: r.slug, title: r.title, locationName: r.location?.name ?? "" })),
    questlines: [...new Set(rows.map((r) => r.questline).filter((v): v is string => !!v))],
  });
}
