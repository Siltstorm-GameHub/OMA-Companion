import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { uploadAsset, searchMedia, ASSET_TYPES } from "@/lib/fotograf-service";

export const dynamic = "force-dynamic";

/**
 * Gemeinsame Mediathek: alle Assets, optional gefiltert nach Event/Typ.
 * Wird sowohl vom Fotograf-Büro (eigene Galerie) als auch von Journalist/
 * Marketing Manager (Asset-Auswahl fürs Einbetten) genutzt.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sinceDays = Number(searchParams.get("sinceDays"));
  const take = Number(searchParams.get("take"));
  const assets = await searchMedia({
    eventId: searchParams.get("eventId") || undefined,
    type: searchParams.get("type") || undefined,
    mineOf: searchParams.get("mine") === "1" ? user.id : undefined,
    authorId: searchParams.get("authorId") || undefined,
    albumId: searchParams.get("albumId") || undefined,
    relatedEventId: searchParams.get("relatedEventId") || undefined,
    q: searchParams.get("q") || undefined,
    sort: searchParams.get("sort") === "votes" ? "votes" : "new",
    since: sinceDays > 0 ? new Date(Date.now() - sinceDays * 86_400_000) : undefined,
    take: take > 0 ? take : undefined,
  });
  return NextResponse.json({ assets });
}

/** Legt einen JobMediaAsset-Datensatz an — die eigentliche Datei liegt bereits über /api/upload in Vercel Blob. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { type, url, caption, eventId, requestId, albumId } = await req.json().catch(() => ({}));
  if (typeof type !== "string" || !ASSET_TYPES.includes(type as never)) {
    return NextResponse.json({ error: "Ungültiger Asset-Typ" }, { status: 400 });
  }
  if (typeof url !== "string" || !url) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }

  const result = await uploadAsset(user.id, {
    type: type as never, url,
    caption: typeof caption === "string" ? caption : undefined,
    eventId: typeof eventId === "string" ? eventId : undefined,
    requestId: typeof requestId === "string" ? requestId : undefined,
    albumId: typeof albumId === "string" && albumId ? albumId : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
