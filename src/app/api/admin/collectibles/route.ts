import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// GET: alle Sammlungen mit Items
const RARITY_ORDER: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export async function GET() {
  await requireRole("admin");
  const raw = await prisma.collectibleCollection.findMany({
    orderBy: { name: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const collections = raw.map(col => ({
    ...col,
    items: [...col.items].sort(
      (a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0)
    ),
  }));
  return NextResponse.json(collections);
}

// POST: neue Sammlung anlegen
export async function POST(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json();
  const collection = await prisma.collectibleCollection.create({
    data: {
      name:        body.name,
      description: body.description ?? null,
      game:        body.game        ?? null,
      coverImageUrl: body.coverImageUrl ?? null,
      active:      body.active      ?? true,
      sortOrder:   body.sortOrder   ?? 0,
    },
  });
  return NextResponse.json(collection);
}

// PATCH: Sammlung oder Item aktualisieren
export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json();

  if (body.type === "collection") {
    const { id, type: _t, ...data } = body;
    const updated = await prisma.collectibleCollection.update({ where: { id }, data });
    return NextResponse.json(updated);
  }

  if (body.type === "item") {
    const { id, ...data } = body;
    delete data.type;
    const updated = await prisma.collectibleItem.update({ where: { id }, data });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unbekannter Typ" }, { status: 400 });
}

// DELETE: Sammlung oder Item löschen
export async function DELETE(req: NextRequest) {
  await requireRole("admin");
  const { id, type } = await req.json();

  if (type === "collection") {
    await prisma.collectibleCollection.delete({ where: { id } });
  } else if (type === "item") {
    await prisma.collectibleItem.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "Unbekannter Typ" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
