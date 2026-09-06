import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { uploadAsset, ASSET_TYPES } from "@/lib/fotograf-service";
import { prisma } from "@/lib/prisma";

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
  const eventId = searchParams.get("eventId");
  const type = searchParams.get("type");
  const mine = searchParams.get("mine") === "1";

  const assets = await prisma.jobMediaAsset.findMany({
    where: {
      hiddenByAdminAt: null,
      ...(eventId ? { eventId } : {}),
      ...(type ? { type } : {}),
      ...(mine ? { authorId: user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { votes: true } }, author: { select: { id: true, username: true, name: true } } },
    take: 100,
  });
  return NextResponse.json({ assets });
}

/** Legt einen JobMediaAsset-Datensatz an — die eigentliche Datei liegt bereits über /api/upload in Vercel Blob. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { type, url, caption, eventId } = await req.json().catch(() => ({}));
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
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
