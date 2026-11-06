// GET/PUT /api/admin/gems-rewards — Belohnungen für die OMA-Gems-Monatssieger (nur Admins)

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getGemsRewards, updateGemsRewards } from "@/lib/gems/scores";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getGemsRewards());
}

export async function PUT(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  return NextResponse.json(await updateGemsRewards(body));
}
