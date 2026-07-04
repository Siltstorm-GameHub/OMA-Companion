import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { invalidateNotificationRuleCache } from "@/lib/notify-dispatch";

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  await requireRole("admin");
  const { key } = await params;

  // Soft-Delete: Zeile bleibt in der DB, damit der Seed-Lauf sie bei künftigen
  // Deploys nicht automatisch wieder anlegt.
  await prisma.notificationRule.update({ where: { key }, data: { deleted: true } }).catch(() => {});

  invalidateNotificationRuleCache();
  return NextResponse.json({ ok: true });
}
