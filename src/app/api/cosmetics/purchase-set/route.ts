import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { purchaseSet, CosmeticError } from "@/lib/cosmetics/service";

/** POST { setId } — alle fehlenden Artikel eines Sets mit Set-Rabatt kaufen und anlegen. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.setId !== "string") return NextResponse.json({ error: "setId fehlt" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await purchaseSet(user.id, body.setId)) });
  } catch (err) {
    if (err instanceof CosmeticError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
