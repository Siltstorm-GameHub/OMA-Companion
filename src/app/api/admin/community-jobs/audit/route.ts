import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET ?action=&q=&skip= — Admin-Protokoll (neueste zuerst, 50 pro Seite). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const action = sp.get("action");
  const q = sp.get("q")?.trim();
  const entries = await prisma.communityJobAuditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(q ? { OR: [
        { actorName: { contains: q, mode: "insensitive" } }, { targetLabel: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" }, take: 50, skip: Number(sp.get("skip")) || 0,
  });
  return NextResponse.json({ entries });
}
