import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { createGame } from "@/lib/games/service";

/**
 * Spiel zur Spieleliste hinzufügen.
 * POST /api/games  { steamAppId?: number, name?: string, fields: GameFields }
 * Mit Steam-ID holt der Server Name, Cover und Beschreibung selbst bei Steam.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json().catch(() => null) as { steamAppId?: unknown; name?: unknown; fields?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const result = await createGame({ id: user.id, isModerator: hasMinRole(user.role, "moderator") }, body);
  if (!result.ok) return NextResponse.json({ error: result.error, slug: result.slug }, { status: result.status });
  return NextResponse.json({ slug: result.slug, status: result.status }, { status: 201 });
}
