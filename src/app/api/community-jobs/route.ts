import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getCommunityJobCatalog, getActiveMembership } from "@/lib/community-job-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Community-Jobs-Katalog + eigener Bewerbungs-/Mitgliedsstatus. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const [catalog, activeMembership, myApplications] = await Promise.all([
    getCommunityJobCatalog(),
    getActiveMembership(user.id),
    prisma.communityJobApplication.findMany({
      where: { userId: user.id, status: { in: ["PENDING", "WAITLISTED"] } },
    }),
  ]);

  return NextResponse.json({ catalog, activeMembership, myApplications });
}
