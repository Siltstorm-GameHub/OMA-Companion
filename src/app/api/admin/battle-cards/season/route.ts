import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import { getSeasonConfig, setSeason1StartAt } from "@/lib/season/season-config";

export async function GET() {
  await requireRole("admin");
  const config = await getSeasonConfig();
  return NextResponse.json(config);
}

const patchSchema = z.object({
  season1StartAt: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await setSeason1StartAt(parsed.data.season1StartAt);
  const config = await getSeasonConfig();
  return NextResponse.json(config);
}
