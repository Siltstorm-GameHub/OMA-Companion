import { NextRequest, NextResponse } from "next/server";
import { requireMancaveAccess } from "@/lib/mancave-guard";
import { downgradeMancaveItem } from "@/lib/mancave-economy";

/** Nur für die Dev-Testphase (siehe MANCAVE_DEV_FREE_MODE in mancave-items.ts). */
export async function POST(req: NextRequest) {
  const guard = await requireMancaveAccess();
  if ("response" in guard) return guard.response;

  const { itemKey } = await req.json().catch(() => ({ itemKey: null }));
  if (typeof itemKey !== "string" || !itemKey) {
    return NextResponse.json({ error: "Objekt fehlt" }, { status: 400 });
  }

  const result = await downgradeMancaveItem(guard.userId, itemKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}
