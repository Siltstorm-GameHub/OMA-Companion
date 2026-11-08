import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { equipCosmetic, CosmeticError } from "@/lib/cosmetics/service";
import { CATEGORY_ORDER, type CosmeticCategory } from "@/lib/cosmetics/catalog";

/** POST { category, itemId | null } — Artikel ausrüsten bzw. Kategorie ablegen. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const category = body.category as CosmeticCategory;
  const itemId = body.itemId === null ? null : typeof body.itemId === "string" ? body.itemId : undefined;
  if (!CATEGORY_ORDER.includes(category) || itemId === undefined) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, equipped: await equipCosmetic(user.id, category, itemId) });
  } catch (err) {
    if (err instanceof CosmeticError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
