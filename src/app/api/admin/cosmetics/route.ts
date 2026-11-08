import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getCosmeticsConfig, getShopSettings, saveCosmeticsConfig, saveShopSettings } from "@/lib/cosmetics/config";

export async function GET() {
  await requireRole("admin");
  const [config, settings] = await Promise.all([getCosmeticsConfig(), getShopSettings()]);
  return NextResponse.json({ config, settings });
}

/** PUT { config?: { [itemId]: { price?, enabled? } }, settings?: ShopSettings } — jeweils komplett ersetzen. */
export async function PUT(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const [config, settings] = await Promise.all([
    body?.config !== undefined ? saveCosmeticsConfig(body.config) : getCosmeticsConfig(),
    body?.settings !== undefined ? saveShopSettings(body.settings) : getShopSettings(),
  ]);
  return NextResponse.json({ config, settings });
}
