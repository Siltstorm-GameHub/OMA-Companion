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
      description:  body.description ?? null,
      emoji:        body.emoji       ?? "🎮",
      rarity:       body.rarity      ?? "common",
      price:        Number(body.price),
      stock:        body.stock != null ? Number(body.stock) : null,
      sortOrder:    body.sortOrder   ?? 0,
    },
  });
  return NextResponse.json(item);
}
