import { NextRequest, NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { setRoomSurfaces } from "@/lib/room";

/** Tapete, Bodenbelag und Türschild. */
export async function PATCH(req: NextRequest) {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const patch: { wallpaperKey?: string; floorKey?: string; doorSign?: string | null } = {};
  if (typeof body.wallpaperKey === "string") patch.wallpaperKey = body.wallpaperKey;
  if (typeof body.floorKey === "string")     patch.floorKey     = body.floorKey;
  if (body.doorSign === null || typeof body.doorSign === "string") patch.doorSign = body.doorSign;

  const result = await setRoomSurfaces(guard.userId, patch);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
