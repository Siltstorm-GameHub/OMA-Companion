import { NextRequest, NextResponse } from "next/server";
import { requireMancaveAccess } from "@/lib/mancave-guard";
import { upgradeMancaveItem } from "@/lib/mancave-economy";

export async function POST(req: NextRequest) {
  const guard = await requireMancaveAccess();
  if ("response" in guard) return guard.response;

  const { itemKey } = await req.json().catch(() => ({ itemKey: null }));
  if (typeof itemKey !== "string" || !itemKey) {
    return NextResponse.json({ error: "Objekt fehlt" }, { status: 400 });
  }

  const result = await upgradeMancaveItem(guard.userId, itemKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}
