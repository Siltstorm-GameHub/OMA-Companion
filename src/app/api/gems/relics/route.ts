// ============================================
// POST /api/gems/relics — ausgerüstete Relikte festlegen
// ============================================
// Body: { relicIds: string[] } (höchstens RELIC_SLOTS, nur eigene Relikte, siehe relic-store.ts).

import { auth } from "@/auth";
import { RelicError, setEquippedRelics } from "@/lib/gems/relic-store";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const relicIds: unknown = body?.relicIds;
  if (!Array.isArray(relicIds) || relicIds.some((id) => typeof id !== "string")) {
    return Response.json({ error: "Ungültige Auswahl." }, { status: 400 });
  }

  try {
    await setEquippedRelics(userId, relicIds as string[]);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RelicError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
