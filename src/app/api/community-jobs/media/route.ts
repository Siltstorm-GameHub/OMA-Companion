import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { searchMedia } from "@/lib/fotograf-service";

export const dynamic = "force-dynamic";

/**
 * Gemeinsame Mediathek: alle Bilder/Clips aus Beiträgen, optional gefiltert nach Event/Typ/Album — für die
 * Titelbild-Auswahl, Anleitungen und Ideen. Hochgeladen wird nur noch über einen Beitrag (POST /reports).
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
