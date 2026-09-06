import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Alle Community-Job-Mitgliedschaften (aktiv/verwarnt) für den Admin-Bereich. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const members = await prisma.communityJobMember.findMany({
    where: { status: { in: ["ACTIVE", "WARNED"] } },
    include: { user: { select: { id: true, username: true, name: true } } },
    orderBy: { jobKey: "asc" },
  });
  return NextResponse.json({ members });
}
