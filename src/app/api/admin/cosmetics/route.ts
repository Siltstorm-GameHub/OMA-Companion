import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getCosmeticsConfig, saveCosmeticsConfig } from "@/lib/cosmetics/config";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getCosmeticsConfig());
}

/** PUT — komplette Override-Liste { [itemId]: { price?, enabled? } } speichern. */
export async function PUT(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  return NextResponse.json(await saveCosmeticsConfig(body));
}
