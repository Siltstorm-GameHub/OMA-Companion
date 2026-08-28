import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { runFullSeasonUpdate } from "@/lib/season/run-season";
import { markPreSeasonRan } from "@/lib/season/season-config";

export async function POST() {
  await requireRole("admin");
  const result = await runFullSeasonUpdate();
  await markPreSeasonRan();
  return NextResponse.json(result);
}
