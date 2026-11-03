// GET/PUT /api/admin/blocks-rewards — Belohnungen für die OMA-Blocks-Monatssieger (nur Admins)

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getBlocksRewards, updateBlocksRewards } from "@/lib/blocks/rewards-config";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getBlocksRewards());
}

export async function PUT(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  return NextResponse.json(await updateBlocksRewards(body));
}
