import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { invalidateNotificationRuleCache } from "@/lib/notify-dispatch";

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  await requireRole("admin");
  const { key } = await params;

  await prisma.notificationRule.delete({ where: { key } }).catch(() => {});

  invalidateNotificationRuleCache();
  return NextResponse.json({ ok: true });
}
