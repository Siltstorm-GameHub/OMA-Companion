import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getPriceOverrides, updatePriceOverrides } from "@/lib/room-config";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getPriceOverrides());
}

/** Body: { [itemKey]: number | null } — null setzt das Item auf den Katalog-Grundpreis zurück. */
export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const patch: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === null) { patch[key] = null; continue; }
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) patch[key] = Math.round(value);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nichts zu ändern" }, { status: 400 });
  }

  return NextResponse.json(await updatePriceOverrides(patch));
}
