import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findDuplicate } from "@/lib/games/service";
import { fetchCombinedDraft } from "@/lib/games/sources";

/**
 * Vorausgefülltes Formular zu einem Treffer: alles, was Steam und IGDB über das Spiel wissen.
 * GET /api/games/preview?appId=252950   bzw.   ?igdbId=1234
 * Antwort: { existing: { slug, name } | null, draft: GameDraft | null, sources, sourceError?: true }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const id = (key: string) => {
    const raw = req.nextUrl.searchParams.get(key) ?? "";
    return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
  };
  const steamAppId = id("appId");
  const igdbId = id("igdbId");
  if (!steamAppId && !igdbId) return NextResponse.json({ error: "appId oder igdbId fehlt" }, { status: 400 });

  const res = await fetchCombinedDraft({ steamAppId, igdbId });
  if (!res.combined) {
    if (!res.allFailed) return NextResponse.json({ error: "Zu diesem Treffer gibt es keine Spieldaten." }, { status: 404 });
    const dup = await findDuplicate(steamAppId, req.nextUrl.searchParams.get("name") ?? "", igdbId);
    return NextResponse.json({ existing: dup ? { slug: dup.slug, name: dup.name } : null, draft: null, sources: {}, sourceError: true });
  }

  const { draft, sources } = res.combined;
  const dup = await findDuplicate(draft.steamAppId, draft.name, draft.igdbId);
  return NextResponse.json({
    existing: dup ? { slug: dup.slug, name: dup.name } : null,
    draft,
    sources,
    ...(res.sourceError ? { sourceError: true } : {}),
  });
}
