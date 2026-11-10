import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { lookupGames } from "@/lib/games/service";

/**
 * Suche beim Hinzufügen: vorhandene Einträge der Spieleliste + Steam-Treffer.
 * GET /api/games/lookup?q=rocket
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ local: [], steam: [], steamError: false });

  return NextResponse.json(await lookupGames(q));
}
