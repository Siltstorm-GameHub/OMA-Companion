import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import {
  revokeMembership, adminReassignJob, adminWarnMember, adminAdjustContract, adminSetBadgeLevel,
} from "@/lib/community-job-service";
import { logAdminAction, memberAuditInfo } from "@/lib/community-admin-audit";
import { prisma } from "@/lib/prisma";

/**
 * PATCH { action: "REVOKE", reason } — Job-Entzug (Mahnung/Leistung/Inaktivität).
 * PATCH { action: "REASSIGN", targetApplicationId } — Zwangsübergabe an einen Bewerber von der Warteliste.
 * PATCH { action: "WARN", reason } — Verwarnung von Hand.
 * PATCH { action: "CONTRACT", days, reason } — Vertragsende verschieben (+ verlängern / − kürzen).
 * PATCH { action: "BADGE", level, reason } — Ansehens-Stufe (1–4) von Hand setzen (28 Tage gesperrt gegen den Wochen-Cron).
 * Jede Aktion landet im Admin-Protokoll.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const info = await memberAuditInfo(id);
  const target = info ? { targetType: "member", targetId: id, targetUserId: info.userId, targetLabel: info.label, jobKey: info.jobKey } : { targetType: "member", targetId: id };
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (body.action === "REVOKE") {
    const result = await revokeMembership(id, reason || "Admin-Entzug");
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(user, { action: "member_revoke", ...target, reason: reason || "Admin-Entzug" });
    return NextResponse.json(result);
  }

  if (body.action === "REASSIGN" && typeof body.targetApplicationId === "string") {
    const member = await prisma.communityJobMember.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ error: "Mitgliedschaft nicht gefunden" }, { status: 404 });
    const result = await adminReassignJob(user.id, member.jobKey, body.targetApplicationId, id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(user, { action: "member_reassign", ...target, detail: { targetApplicationId: body.targetApplicationId } });
    return NextResponse.json(result);
  }

  if (body.action === "WARN") {
    const result = await adminWarnMember(id, reason);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(user, { action: "member_warn", ...target, reason });
    return NextResponse.json(result);
  }

  if (body.action === "CONTRACT") {
    if (!reason) return NextResponse.json({ error: "Bitte einen Grund angeben" }, { status: 400 });
    const result = await adminAdjustContract(id, Number(body.days), reason);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(user, { action: "member_contract", ...target, reason, detail: { days: Number(body.days), contractEndAt: result.contractEndAt } });
    return NextResponse.json({ ok: true, contractEndAt: result.contractEndAt });
  }

  if (body.action === "BADGE") {
    if (!reason) return NextResponse.json({ error: "Bitte einen Grund angeben" }, { status: 400 });
    const result = await adminSetBadgeLevel(id, Number(body.level));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(user, { action: "member_badge", ...target, reason, detail: { level: Number(body.level) } });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
