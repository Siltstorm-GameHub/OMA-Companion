import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GROUP_MAX_MEMBERS, groupOwnership } from "@/lib/games/service";

/**
 * Gruppen-Finder: Wer aus der Gruppe hat welches Spiel / würde es zocken?
 * GET /api/games/group?users=id1,id2,id3   (max. 16)
 * Antwort: { [gameId]: { owners: userId[], wanters: userId[] } }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const ids = (req.nextUrl.searchParams.get("users") ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(s => /^[a-z0-9_-]{1,40}$/i.test(s))
    .slice(0, GROUP_MAX_MEMBERS);

  return NextResponse.json(await groupOwnership(ids));
}
