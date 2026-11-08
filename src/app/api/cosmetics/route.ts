import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getShopState, CosmeticError } from "@/lib/cosmetics/service";

export const dynamic = "force-dynamic";

/** GET — Shop-Zustand des eingeloggten Users: Guthaben, Besitz, Ausrüstung, Preise. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  try {
    return NextResponse.json(await getShopState(user.id));
  } catch (err) {
    if (err instanceof CosmeticError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
