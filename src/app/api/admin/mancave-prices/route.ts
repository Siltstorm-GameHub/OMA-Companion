import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { MANCAVE_ITEMS } from "@/lib/mancave-items";
import { getMancaveConfig, setMancavePriceOverride, effectiveCosts } from "@/lib/mancave-config";

/** Katalog + effektive (Admin-Override oder Default) Preise je Slot, fürs Admin-Panel. */
export async function GET() {
  await requireRole("admin");
  const cfg = await getMancaveConfig();
  const items = MANCAVE_ITEMS.map(def => ({
    key: def.key, label: def.label, baseline: def.baseline,
    defaultCosts: def.costs, costs: effectiveCosts(def, cfg),
    overridden: def.key in cfg.priceOverrides,
  }));
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const itemKey = body?.itemKey;
  const costs = body?.costs;
  if (typeof itemKey !== "string" || !MANCAVE_ITEMS.some(i => i.key === itemKey)) {
    return NextResponse.json({ error: "Unbekanntes Objekt" }, { status: 400 });
  }
  // null = Override löschen, zurück auf Katalog-Default
  if (costs !== null) {
    if (
      !Array.isArray(costs) || costs.length !== 4 ||
      !costs.every((c: unknown) => typeof c === "number" && Number.isFinite(c) && c >= 0)
    ) {
      return NextResponse.json({ error: "Ungültige Preise (4 nicht-negative Zahlen erwartet)" }, { status: 400 });
    }
  }
  const overrides = await setMancavePriceOverride(itemKey, costs === null ? null : (costs as [number, number, number, number]));
  return NextResponse.json({ priceOverrides: overrides });
}
