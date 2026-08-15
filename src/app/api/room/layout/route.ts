import { NextRequest, NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { saveLayout, type LayoutInput } from "@/lib/room";

/** Speichert, was wo im Zimmer steht und was im Lager liegt. */
export async function PUT(req: NextRequest) {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.placed) || !Array.isArray(body.stored)) {
    return NextResponse.json({ error: "placed und stored müssen Arrays sein" }, { status: 400 });
  }

  const placed: LayoutInput[] = [];
  for (const raw of body.placed) {
    if (
      !raw || typeof raw.id !== "string" ||
      typeof raw.x !== "number" || typeof raw.y !== "number" ||
      !Number.isFinite(raw.x) || !Number.isFinite(raw.y) ||
      (raw.zone !== "floor" && raw.zone !== "wall_back" && raw.zone !== "wall_side"
        && raw.zone !== "wall_front" && raw.zone !== "wall_right")
    ) {
      return NextResponse.json({ error: "Ungültige Position" }, { status: 400 });
    }
    placed.push({ id: raw.id, zone: raw.zone, x: raw.x, y: raw.y, flipped: !!raw.flipped });
  }

  const stored: string[] = [];
  for (const id of body.stored) {
    if (typeof id !== "string") {
      return NextResponse.json({ error: "Ungültiges Lager" }, { status: 400 });
    }
    stored.push(id);
  }

  const result = await saveLayout(guard.userId, placed, stored);
  if ("error" in result) {
    // "Gehört dir nicht" ist eine Berechtigungs-, keine Eingabefrage.
    const status = result.error === "Gehört dir nicht" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
