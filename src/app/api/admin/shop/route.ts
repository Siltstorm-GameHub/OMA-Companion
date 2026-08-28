import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getShopConfig, updateShopConfig } from "@/lib/shop-config";

export async function GET() {
  await requireRole("admin");
  const config = await getShopConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const patch = await req.json();
  await updateShopConfig(patch);
  const config = await getShopConfig();
  return NextResponse.json(config);
}
