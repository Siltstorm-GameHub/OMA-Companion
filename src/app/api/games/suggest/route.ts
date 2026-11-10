import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { suggestGames } from "@/lib/games/service";

/**
 * Spieleliste-Vorschläge für Spiel-Eingabefelder (GameNameInput).
 * GET /api/games/suggest?q=cs   → [{ name, coverUrl }]   (ohne q: beliebteste Spiele)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  return NextResponse.json(await suggestGames(q), { headers: { "Cache-Control": "private, max-age=30" } });
}
