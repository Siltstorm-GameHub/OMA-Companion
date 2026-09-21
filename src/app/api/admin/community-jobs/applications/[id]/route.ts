import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { logAdminAction } from "@/lib/community-admin-audit";
import { reviewApplication } from "@/lib/community-job-service";
import { prisma } from "@/lib/prisma";

/** PATCH { decision: "APPROVE" | "REJECT" } — Bewerbung genehmigen/ablehnen. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;
  const { decision } = await req.json().catch(() => ({ decision: null }));
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "Ungültige Entscheidung" }, { status: 400 });
  }

  const app = await prisma.communityJobApplication.findUnique({ where: { id }, include: { user: { select: { id: true, username: true, name: true } } } });
  const result = await reviewApplication(user.id, id, decision);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  if (app) {
    await logAdminAction(user, {
      action: decision === "APPROVE" ? "application_approve" : "application_reject", targetType: "application", targetId: id,
      targetUserId: app.userId, targetLabel: app.user.username ?? app.user.name ?? app.userId, jobKey: app.jobKey,
    });
  }
  return NextResponse.json(result);
}
