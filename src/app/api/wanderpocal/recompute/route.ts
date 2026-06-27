import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { recomputeWanderpocalHolders } from "@/lib/recompute-wanderpocal";

export async function POST() {
  const authError = await requireRole("admin");
  if (authError) return authError;

  await recomputeWanderpocalHolders();
  return NextResponse.json({ ok: true });
}
