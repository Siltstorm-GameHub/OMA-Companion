import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { resetAllMancaveUpgrades } from "@/lib/mancave-economy";

/**
 * Einmalige Übergangs-Aktion vom Ende der globalen Mancave-Testphase (siehe
 * MancaveConfigPanel.tsx): löscht den Ausbau-Fortschritt ALLER User, damit
 * niemand die während der Testphase kostenlos erreichten Stufen dauerhaft
 * behält, während neue User bei Stufe 0 anfangen müssten.
 */
export async function POST() {
  await requireRole("admin");
  const result = await resetAllMancaveUpgrades();
  return NextResponse.json(result);
}
