import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { revokeMembership, adminReassignJob } from "@/lib/community-job-service";
import { prisma } from "@/lib/prisma";

/**
 * PATCH { action: "REVOKE", reason } — Job-Entzug (Mahnung/Leistung/Inaktivität).
 * PATCH { action: "REASSIGN", targetApplicationId } — Zwangsübergabe an einen Bewerber von der Warteliste.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "REVOKE") {
    const reason = typeof body.reason === "string" ? body.reason : "Admin-Entzug";
    const result = await revokeMembership(id, reason);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  if (body.action === "REASSIGN" && typeof body.targetApplicationId === "string") {
    const member = await prisma.communityJobMember.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ error: "Mitgliedschaft nicht gefunden" }, { status: 404 });
    const result = await adminReassignJob(user.id, member.jobKey, body.targetApplicationId, id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
