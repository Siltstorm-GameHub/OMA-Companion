import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "admin" || user?.role === "moderator" ? user : null;
}

// PATCH: einzelnes Item updaten
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id, name, description, price, rarity, active, stock, availableFrom, availableTo } = await req.json();
  if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  const item = await prisma.shopItem.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price       !== undefined && { price: Number(price) }),
      ...(rarity      !== undefined && { rarity }),
      ...(active      !== undefined && { active }),
      ...(stock       !== undefined && { stock: stock === "" || stock === null ? null : Number(stock) }),
      ...(availableFrom !== undefined && { availableFrom: availableFrom ? new Date(availableFrom) : null }),
      ...(availableTo   !== undefined && { availableTo:   availableTo   ? new Date(availableTo)   : null }),
    },
  });

  return NextResponse.json({ ok: true, item });
}

// DELETE: Item dauerhaft entfernen
export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  // Erst Käufe löschen, dann Item
  await prisma.shopPurchase.deleteMany({ where: { itemId: id } });
  await prisma.wishlistItem.deleteMany({ where: { itemId: id } });
  await prisma.shopItem.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
