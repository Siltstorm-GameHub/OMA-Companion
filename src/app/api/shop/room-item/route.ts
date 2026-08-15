import { NextRequest, NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { purchaseRoomItem } from "@/lib/room";
import { checkAndAwardBadges } from "@/lib/award-badges";

/**
 * Möbelkauf. Liegt bewusst unter /api/shop.
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

  // Nebenwirkung ohne Einfluss auf die Antwort — Zimmer-Badges (Upgrade,
  // Ausbaustufe) können sich mit diesem Kauf gerade erst geändert haben.
  checkAndAwardBadges(guard.userId).catch(() => {});

  return NextResponse.json({
    ok: true,
    roomItemId: result.roomItemId,
    points:     result.points,
    label:      result.label,
  });
}
