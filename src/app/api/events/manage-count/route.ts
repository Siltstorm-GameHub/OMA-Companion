import { NextResponse } from "next/server";
import { getSessionUser, getCaptainedSquadIds, hasMinRole } from "@/lib/roles";
import { loadManageAttentionCount } from "@/lib/admin-inbox";

/**
 * Zahl am Untermenü "Verwalten" in der Seitenleiste: was in der Event-Verwaltung auf dich wartet
 * (gleiche Rechnung wie am Reiter, lib/admin-inbox.ts). Gäste: 0.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ count: 0 });
  const isMod = hasMinRole(user.role, "moderator");
  const count = await loadManageAttentionCount(isMod ? null : { userId: user.id, captainedSquadIds: await getCaptainedSquadIds(user.id) });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, max-age=30" } });
}
