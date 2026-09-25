import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBuilderAccess, publishCustomWorld } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

/** Admin: eingereichte Welt freigeben (legt Location + Quest an) oder mit Hinweis zurückgeben. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed || !access.isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await params;
  const row = await prisma.dndCustomWorld.findUnique({ where: { id } });
  if (!row || row.status !== "PENDING") return NextResponse.json({ error: "Keine offene Einreichung" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body?.action === "approve") {
    const r = await publishCustomWorld(id, session.user.id);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "reject") {
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    await prisma.dndCustomWorld.update({ where: { id }, data: { status: "REJECTED", reviewNote: note || "Bitte überarbeiten.", reviewedById: session.user.id } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
