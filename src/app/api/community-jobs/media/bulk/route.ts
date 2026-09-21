import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { uploadAssetsBulk, ASSET_TYPES } from "@/lib/fotograf-service";

export const dynamic = "force-dynamic";

/** Sammel-Upload: Dateien liegen bereits in Vercel Blob (über /api/upload), hier werden nur die Datensätze angelegt. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { eventId, albumId, items } = await req.json().catch(() => ({}));
  if (!Array.isArray(items)) return NextResponse.json({ error: "items fehlt" }, { status: 400 });

  const result = await uploadAssetsBulk(user.id, {
    eventId: typeof eventId === "string" && eventId ? eventId : undefined,
    albumId: typeof albumId === "string" && albumId ? albumId : undefined,
    items: items.map((i: { url?: unknown; caption?: unknown; type?: unknown }) => ({
      url: typeof i?.url === "string" ? i.url : "",
      caption: typeof i?.caption === "string" ? i.caption.slice(0, 300) : undefined,
      type: typeof i?.type === "string" && ASSET_TYPES.includes(i.type as never) ? (i.type as never) : undefined,
    })),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
