import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { loadAdminCounts } from "@/lib/admin-inbox";
import { EMPTY_COUNTS } from "@/lib/admin-nav";

export const dynamic = "force-dynamic";

/** Zähler offener Aufgaben für die Admin-Seitenleiste. Mitglieder/Captains bekommen nur Nullen. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json(EMPTY_COUNTS);
  return NextResponse.json(await loadAdminCounts());
}
