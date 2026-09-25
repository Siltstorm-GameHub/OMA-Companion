import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkHex, getBuilderAccess } from "@/lib/dnd/custom-worlds";
import { validateForSubmit } from "@/lib/te-map/custom-world";

export const dynamic = "force-dynamic";

/** Autor reicht die Welt zur Prüfung ein — nur wenn sie vollständig und spielbar ist. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const row = await prisma.dndCustomWorld.findUnique({ where: { id: (await params).id } });
  if (!row || row.authorId !== session.user.id) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (row.status !== "DRAFT" && row.status !== "REJECTED") return NextResponse.json({ error: "Diese Welt ist bereits eingereicht." }, { status: 400 });

  if (!access.isAdmin) {
    if (row.hexCol == null || row.hexRow == null) return NextResponse.json({ error: "Wähle zuerst ein leeres Feld auf der Weltkarte." }, { status: 400 });
    const problem = await checkHex({ col: row.hexCol, row: row.hexRow }, row.slug);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  const v = validateForSubmit(row.doc);
  if (!v.ok) return NextResponse.json({ error: "Die Welt ist noch nicht fertig.", problems: v.errors }, { status: 400 });
  await prisma.dndCustomWorld.update({ where: { id: row.id }, data: { status: "PENDING", submittedAt: new Date(), reviewNote: null } });
  return NextResponse.json({ ok: true });
}
