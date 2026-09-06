import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Öffentlich einsehbare Warteliste eines Jobs (Transparenz) — auch fürs Übergabe-Formular des aktuellen Inhabers. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobKey: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { jobKey } = await params;
  const waitlist = await prisma.communityJobApplication.findMany({
    where: { jobKey, status: "WAITLISTED" },
    orderBy: { appliedAt: "asc" },
    include: { user: { select: { id: true, username: true, name: true } } },
  });
  return NextResponse.json({ waitlist });
}
