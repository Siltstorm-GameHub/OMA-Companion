// ============================================
// POST /api/gems/cosmetics/buy — Kosmetik für „Mein Held“ mit Münzen kaufen
// ============================================
// Body: { itemIds: string[] } (z. B. ["accessory:headset"]). Alles oder nichts, Preise und Prüfung
// serverseitig (lib/gems/hero/my-hero.ts buyCosmetics).

import { auth } from "@/auth";
import { buyCosmetics, MyHeroError } from "@/lib/gems/hero/my-hero";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const itemIds: unknown = body?.itemIds;
  if (!Array.isArray(itemIds) || itemIds.some((id) => typeof id !== "string")) {
    return Response.json({ error: "Ungültige Auswahl." }, { status: 400 });
  }

  try {
    const result = await buyCosmetics(userId, itemIds as string[]);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof MyHeroError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
