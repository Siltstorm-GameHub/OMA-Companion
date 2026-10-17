// ============================================
// POST /api/gems/hero-look — Look der eigenen Community-Karte speichern („Mein Held“)
// ============================================
// Body: { look: HeroLook }. Prüfung serverseitig (eigene Karte, Grundfigur passend zur Klasse, nur
// freie oder freigeschaltete Teile), siehe lib/gems/hero/my-hero.ts.

import { auth } from "@/auth";
import { MyHeroError, saveOwnHeroLook } from "@/lib/gems/hero/my-hero";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.look || typeof body.look !== "object") {
    return Response.json({ error: "Kein Look angegeben." }, { status: 400 });
  }

  try {
    const look = await saveOwnHeroLook(userId, body.look);
    return Response.json({ ok: true, look });
  } catch (error) {
    if (error instanceof MyHeroError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
