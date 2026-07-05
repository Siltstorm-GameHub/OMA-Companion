import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getMinigamesConfig, updateMinigamesConfig } from "@/lib/minigames-config";

export async function GET() {
  await requireRole("admin");
  const config = await getMinigamesConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const patch = await req.json();
  await updateMinigamesConfig(patch);
  const config = await getMinigamesConfig();
  return NextResponse.json(config);
}
