import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkHex, getBuilderAccess, notifyAdmins, resyncPublishedWorld } from "@/lib/dnd/custom-worlds";
import { sanitizeCustomWorldDoc, validateForSubmit } from "@/lib/te-map/custom-world";

export const dynamic = "force-dynamic";

async function load(id: string, userId: string) {
  const access = await getBuilderAccess(userId);
  if (!access.allowed) return { error: NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 }) } as const;
  const row = await prisma.dndCustomWorld.findUnique({ where: { id } });
  if (!row || (row.authorId !== userId && !access.isAdmin)) return { error: NextResponse.json({ error: "Nicht gefunden" }, { status: 404 }) } as const;
  return { row, isAdmin: access.isAdmin } as const;
}

/** Autoren bearbeiten ihre eigenen Welten jederzeit (auch nach der Veröffentlichung), Admins alle. */
const editable = () => true;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const r = await load((await params).id, session.user.id);
  if ("error" in r) return r.error;
  const s = sanitizeCustomWorldDoc(r.row.doc);
  if (!s.ok) return NextResponse.json({ error: "Gespeichertes Dokument ist beschädigt" }, { status: 500 });
  return NextResponse.json({
    id: r.row.id, slug: r.row.slug, status: r.row.status, reviewNote: r.row.reviewNote, doc: s.doc,
    hex: r.row.hexCol != null && r.row.hexRow != null ? { col: r.row.hexCol, row: r.row.hexRow } : null,
    canEdit: editable(), isAdmin: r.isAdmin,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const r = await load((await params).id, session.user.id);
  if ("error" in r) return r.error;

  const body = await req.json().catch(() => null);
  const s = sanitizeCustomWorldDoc(body?.doc);
  if (!s.ok) return NextResponse.json({ error: s.errors[0] }, { status: 400 });
  const json = JSON.parse(JSON.stringify(s.doc));
  if (JSON.stringify(json).length > 400_000) return NextResponse.json({ error: "Die Welt ist zu groß." }, { status: 400 });

  // Eine veröffentlichte Welt muss spielbar bleiben, sonst stünden Charaktere in einer kaputten Location
  if (r.row.status === "PUBLISHED") {
    const v = validateForSubmit(json);
    if (!v.ok) return NextResponse.json({ error: `Änderung nicht gespeichert — die veröffentlichte Location muss spielbar bleiben: ${v.errors[0]}` }, { status: 400 });
  }

  // Feld auf der Weltkarte: nur vor der Veröffentlichung änderbar (danach stehen Charaktere dort)
  let hexData: { hexCol: number | null; hexRow: number | null } | undefined;
  if (r.row.status !== "PUBLISHED" && body && "hex" in body) {
    const h = body.hex;
    if (h === null) hexData = { hexCol: null, hexRow: null };
    else if (h && Number.isInteger(h.col) && Number.isInteger(h.row)) {
      const problem = await checkHex({ col: h.col, row: h.row }, r.row.slug);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      hexData = { hexCol: h.col, hexRow: h.row };
    } else return NextResponse.json({ error: "Ungültiges Feld" }, { status: 400 });
  }

  await prisma.dndCustomWorld.update({ where: { id: r.row.id }, data: { doc: json, title: s.doc.title || "Ohne Namen", ...hexData } });
  const syncError = r.row.status === "PUBLISHED" ? await resyncPublishedWorld(r.row.id) : null;
  if (r.row.status === "PUBLISHED") {
    const who = r.isAdmin && r.row.authorId !== session.user.id ? "Ein Admin" : (session.user.name ?? "Ein Mitglied");
    await notifyAdmins(session.user.id, "OMA-Quest-Location geändert", `${who} hat „${s.doc.title}“ bearbeitet.`, `/oma-quest/editor/${r.row.id}`, 30);
  }
  return NextResponse.json({ ok: true, warnings: s.warnings, syncError });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const r = await load((await params).id, session.user.id);
  if ("error" in r) return r.error;
  if (r.row.status === "PUBLISHED") return NextResponse.json({ error: "Veröffentlichte Welten können nicht gelöscht werden." }, { status: 400 });
  await prisma.dndCustomWorld.delete({ where: { id: r.row.id } });
  return NextResponse.json({ ok: true });
}
