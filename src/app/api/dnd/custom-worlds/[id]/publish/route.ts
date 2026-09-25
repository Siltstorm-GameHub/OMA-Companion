import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkHex, getBuilderAccess, notifyAdmins, publishCustomWorld } from "@/lib/dnd/custom-worlds";
import { validateForSubmit } from "@/lib/te-map/custom-world";

export const dynamic = "force-dynamic";

/** Veröffentlicht die Welt sofort — nur wenn sie vollständig und spielbar ist und ein freies Feld gewählt wurde. Admins werden informiert. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const row = await prisma.dndCustomWorld.findUnique({ where: { id: (await params).id }, include: { author: { select: { name: true, username: true } } } });
  if (!row || (row.authorId !== session.user.id && !access.isAdmin)) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (row.status === "PUBLISHED") return NextResponse.json({ error: "Diese Location ist schon veröffentlicht." }, { status: 400 });

  if (!access.isAdmin) {
    if (row.hexCol == null || row.hexRow == null) return NextResponse.json({ error: "Wähle zuerst ein leeres Feld auf der Weltkarte." }, { status: 400 });
    const problem = await checkHex({ col: row.hexCol, row: row.hexRow }, row.slug);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  const v = validateForSubmit(row.doc);
  if (!v.ok) return NextResponse.json({ error: "Die Welt ist noch nicht fertig.", problems: v.errors }, { status: 400 });

  const r = await publishCustomWorld(row.id, session.user.id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });

  const who = row.author.username ?? row.author.name ?? "Ein Mitglied";
  await notifyAdmins(session.user.id, "Neue OMA-Quest-Location", `${who} hat „${v.doc.title}“ mit der Quest „${v.doc.quest.title}“ veröffentlicht.`, `/oma-quest/editor/${row.id}`);
  return NextResponse.json({ ok: true, slug: row.slug });
}
