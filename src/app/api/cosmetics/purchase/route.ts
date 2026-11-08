import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { purchaseCosmetic, CosmeticError } from "@/lib/cosmetics/service";

/** POST { itemId } — Artikel kaufen. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.itemId !== "string") return NextResponse.json({ error: "itemId fehlt" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await purchaseCosmetic(user.id, body.itemId)) });
  } catch (err) {
    if (err instanceof CosmeticError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
