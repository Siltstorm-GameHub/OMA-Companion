import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import { getSeasonRewardConfig, setSeasonRewardConfig } from "@/lib/battle-cards/season-reward-config";

export async function GET() {
  await requireRole("admin");
  const config = await getSeasonRewardConfig();
  return NextResponse.json(config);
}

const placementSchema = z.object({
  coins: z.number().int().min(0),
  rankPoints: z.number().int().min(0),
});

const patchSchema = z.object({
  place1: placementSchema,
  place2: placementSchema,
  place3: placementSchema,
});

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await setSeasonRewardConfig(parsed.data);
  return NextResponse.json(parsed.data);
}
