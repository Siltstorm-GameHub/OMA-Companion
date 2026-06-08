import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// POST: neues Item zu einer Sammlung hinzufügen
export async function POST(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json();

  const item = await prisma.collectibleItem.create({
    data: {
      collectionId: body.collectionId,
      name:         body.name,
      description:  body.description  ?? null,
      imageUrl:     body.imageUrl     ?? null,
      rarity:       body.rarity       ?? "common",
      price:        Number(body.price),
      salePrice:    body.salePrice != null ? Number(body.salePrice) : null,
      saleUntil:    body.saleUntil    ?? null,
      active:       body.active       ?? true,
      stock:        body.stock != null ? Number(body.stock) : null,
      sortOrder:    body.sortOrder    ?? 0,
    },
  });
  return NextResponse.json(item);
}

// PATCH: Item aktualisieren (active, salePrice, saleUntil, …)
export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  // Typen normalisieren
  if (data.price     != null) data.price     = Number(data.price);
  if (data.salePrice != null) data.salePrice = Number(data.salePrice);
  else if ("salePrice" in data) data.salePrice = null;
  if (data.saleUntil === "") data.saleUntil = null;
  if (data.stock     != null) data.stock     = Number(data.stock);
  else if ("stock" in data)   data.stock     = null;

  const item = await prisma.collectibleItem.update({ where: { id }, data });
  return NextResponse.json(item);
}
