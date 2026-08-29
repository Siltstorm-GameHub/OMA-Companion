import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import {
  getUpgradeEconomyConfig, setDuplicateThresholds, setUpgradeCosts,
} from "@/lib/battle-cards/upgrade-admin-config";

export async function GET() {
  await requireRole("admin");
  const config = await getUpgradeEconomyConfig();
  return NextResponse.json(config);
}

const rowSchema = z.tuple([
  z.number().int().min(0), z.number().int().min(0), z.number().int().min(0), z.number().int().min(0),
]);
const tableSchema = z.object({ STANDARD: rowSchema, COMMUNITY: rowSchema });
const patchSchema = z.object({
  duplicateThresholds: tableSchema,
  upgradeCosts: tableSchema,
});

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await Promise.all([
    setDuplicateThresholds(parsed.data.duplicateThresholds),
    setUpgradeCosts(parsed.data.upgradeCosts),
  ]);
  const config = await getUpgradeEconomyConfig();
  return NextResponse.json(config);
}
