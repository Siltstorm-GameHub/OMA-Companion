// GET/PUT /api/admin/blocks-goals — Monatsziele von OMA Blocks (Belohnung ab einem Bestwert, nur Admins)

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getBlocksGoals, updateBlocksGoals } from "@/lib/blocks/goals-config";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getBlocksGoals());
}

export async function PUT(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  return NextResponse.json(await updateBlocksGoals(body));
}
