import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/community-admin-audit";
import { adminSetReputationLevel } from "@/lib/community-job-service";

const SELECT = {
  id: true, username: true, name: true,
  reputationLevel: true, reputationPeakLevel: true, reputationPoints: true, reputationOverrideUntil: true,
} as const;

/**
 * GET ?q=name — Ansehen von Usern: ohne q die 30 mit dem höchsten Ansehen (inkl. manuell gesetzter),
 * mit q die Treffer der Namenssuche.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const users = await prisma.user.findMany({
    where: q
      ? { deletedAt: null, OR: [{ username: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
      : { deletedAt: null, OR: [{ reputationPoints: { gt: 0 } }, { reputationLevel: { gt: 1 } }, { reputationOverrideUntil: { not: null } }] },
    orderBy: [{ reputationLevel: "desc" }, { reputationPoints: "desc" }],
    select: SELECT,
    take: 30,
  });
  return NextResponse.json({ users });
}

/** PATCH { userId, level, reason } — Ansehen von Hand setzen (bleibt 28 Tage unverändert). */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const { userId, level, reason } = await req.json().catch(() => ({}));
  if (typeof userId !== "string" || !userId) return NextResponse.json({ error: "userId erforderlich" }, { status: 400 });
  if (typeof reason !== "string" || !reason.trim()) return NextResponse.json({ error: "Grund erforderlich" }, { status: 400 });

  const result = await adminSetReputationLevel(userId, Number(level));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
  await logAdminAction(user, {
    action: "reputation_set", targetType: "user", targetId: userId, targetUserId: userId,
    targetLabel: target?.username ?? target?.name ?? userId, reason, detail: { level: Number(level) },
  });
  return NextResponse.json({ ok: true });
}
