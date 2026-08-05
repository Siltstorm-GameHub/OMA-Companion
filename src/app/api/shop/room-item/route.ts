import { NextRequest, NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { purchaseRoomItem } from "@/lib/room";

/**
 * Möbelkauf. Liegt bewusst unter /api/shop neben dem Collectible-Kauf —
 * für den User ist das derselbe Vorgang im selben Shop.
 */
export async function POST(req: NextRequest) {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  const { itemKey } = await req.json().catch(() => ({ itemKey: null }));
  if (typeof itemKey !== "string" || !itemKey) {
    return NextResponse.json({ error: "Möbelstück fehlt" }, { status: 400 });
  }

  const result = await purchaseRoomItem(guard.userId, itemKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    roomItemId: result.roomItemId,
    points:     result.points,
    label:      result.label,
  });
}
