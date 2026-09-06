import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Offene Bewerbungen + Warteliste für den Admin-Bereich. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const applications = await prisma.communityJobApplication.findMany({
    where: { status: { in: ["PENDING", "WAITLISTED"] } },
    include: { user: { select: { id: true, username: true, name: true } } },
    orderBy: { appliedAt: "asc" },
  });
  return NextResponse.json({ applications });
}
