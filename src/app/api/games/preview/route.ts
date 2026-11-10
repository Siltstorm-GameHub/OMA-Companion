import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findDuplicate } from "@/lib/games/service";
import { fetchSteamGameDraft } from "@/lib/games/steam";

/**
 * Vorausgefülltes Formular zu einem Steam-Treffer: alles, was Steam über das Spiel weiß.
 * GET /api/games/preview?appId=252950
 * Antwort: { existing: { slug, name } | null, draft: GameDraft | null, steamError?: true }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("appId") ?? "";
  const appId = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
  if (!appId) return NextResponse.json({ error: "appId fehlt" }, { status: 400 });

  try {
    const draft = await fetchSteamGameDraft(appId);
    if (!draft) return NextResponse.json({ error: "Steam kennt dieses Spiel nicht." }, { status: 404 });
    const dup = await findDuplicate(appId, draft.name);
    return NextResponse.json({ existing: dup ? { slug: dup.slug, name: dup.name } : null, draft });
  } catch (err) {
    console.error("[games/preview]", err);
    const dup = await findDuplicate(appId, req.nextUrl.searchParams.get("name") ?? "");
    return NextResponse.json({ existing: dup ? { slug: dup.slug, name: dup.name } : null, draft: null, steamError: true });
  }
}
