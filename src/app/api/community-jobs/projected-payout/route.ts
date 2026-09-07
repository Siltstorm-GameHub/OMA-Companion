import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getActiveMembership, getProjectedPayout } from "@/lib/community-job-service";

export const dynamic = "force-dynamic";

/** Live-Vorschau fürs Büro: voraussichtliches Gehalt dieser (laufenden) Woche + theoretisches Maximum. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const member = await getActiveMembership(user.id);
  if (!member) return NextResponse.json({ error: "Du hast gerade keinen aktiven Community-Job" }, { status: 400 });

  const projected = await getProjectedPayout(member);
  return NextResponse.json(projected);
}
