import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { recomputeWanderpocalHolders } from "@/lib/recompute-wanderpocal";

export async function POST() {
  await requireRole("admin");
  await recomputeWanderpocalHolders();
  return NextResponse.json({ ok: true });
}
